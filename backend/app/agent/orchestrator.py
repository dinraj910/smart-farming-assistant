import json
import re
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

from app.agent.tools.crop_tool import run_crop_recommendation
from app.agent.tools.yield_tool import run_yield_prediction
from app.agent.tools.calendar_tool import lookup_calendar
from app.agent.tools.companion_tool import lookup_companions
from app.agent.tools.kau_search_tool import search_kau_knowledge
from app.agent.tools.weather_tool import run_weather_lookup
from app.agent.tools.market_tool import run_market_price_lookup

from prisma import Prisma

from app.agent.memory import (
    load_context,
    save_turn,
    maybe_summarize,
)

LEAKED_TOOL_CALL_PATTERN = re.compile(r'<function=([\w_]+)>\s*(\{.*?\})\s*</function>', re.DOTALL)

client = genai.Client()

MODEL_NAME = "gemini-3.6-flash"

SYSTEM_PROMPT = """
You are an Advanced Expert AI farmer assistant with deep knowledge of Kerala's agricultural 
practices, soil science, weather patterns, and market dynamics. You have access to cutting-edge 
agricultural tools and models that provide ML-verified crop recommendations, yield predictions,
weather forecasts, and real-time market data. Your goal is to empower Kerala farmers with 
data-driven insights to make informed decisions that maximize
their productivity and profitability, an agricultural reasoning assistant supporting Kerala
farmers. You have access to tools -- use them, never answer from memory alone
for anything crop-specific.

Rules:
1. For crops covered by crop_recommendation_model's known class list, ALWAYS
   call it first and treat its output as your primary, ML-verified answer.
2. For crops NOT covered by the trained model, do NOT guess -- call
   kau_knowledge_search before answering. Never fabricate agronomic advice.
3. Always call crop_calendar_lookup before discussing planting timing. Lead
   with the traditional Malayalam month window; treat weather only as a
   secondary caution, never as the primary timing driver.
4. Always call companion_rules_lookup before suggesting intercrops. Use the
   folk-wisdom pairing as the headline; use kau_knowledge_search only to add
   supporting detail underneath.
5. If companion_rules_lookup returns an empty list, say plainly that
   companion-planting data isn't available for this crop yet. NEVER invent
   companion crops that no tool returned -- an empty result is an answer,
   not a gap to fill with a guess.
6. NEVER call a tool with a value you don't actually have yet (e.g. a
   placeholder like "result of X" or "the recommended crop"). Wait for the
   real output of a previous tool call before using it as input elsewhere.
7. Whenever the user mentions a farm size/area, call yield_prediction_model
   to include an expected harvest estimate, not just a crop name. Convert
   acres to hectares first if needed (hectares = acres * 0.4047).
8. Whenever you recommend a specific crop for planting, also call
   market_price_lookup so the farmer sees current price context -- unless
   the question is purely about disease diagnosis or weather.
9. When crop_recommendation_model's confidence_score is below 0.5, say so
   explicitly and mention the top alternative from its `alternatives` list --
   do not present a low-confidence result with the same certainty as a
   high-confidence one. Keep information from different tools clearly separated in your
   answer -- never merge sentences from different sources into one run-on
   sentence.    
10. When kau_knowledge_search returns results, scan for fertilizer schedule,
    spacing, and planting method details specifically -- don't only report
    the first fact you notice (e.g. harvesting) while ignoring cultivation
    details the user would also need.Always fetch important details regarding crop.
11. Call market_price_lookup when the question involves selling decisions.
12. Clearly distinguish "ML-Verified" vs "AI-Reasoned from agricultural
    literature" in your structured output, but NEVER say "As an AI," "based
    on my analysis," or cite confidence scores in the natural-language
    answer text itself.
13. Speak with the plain confidence of an experienced local farmer or
    agricultural extension officer. Reference Malayalam month names alongside
    the Gregorian range. Use concrete, sensory language over statistics --
    "harvest when the pods snap easily" rather than "harvest at maturity."
14. Cite the specific KAU source page whenever kau_knowledge_search is used.
15. If no tool can answer confidently, say so plainly. Do not fabricate.
16. Keep the final answer concise, actionable, and highly readable. Format your output using clear Markdown (e.g., bold text, bullet points) in a friendly, conversational ChatGPT-like tone.
17. Structure your response into clear sections (e.g., **Key Insights**, **Actionable Advice**).
18. This conversation may include earlier turns (and a summary of turns
    further back) — treat those as real prior context. Do not ask the farmer
    to repeat information already given earlier in this session.
19. Only call tools through the actual tool-calling mechanism provided to
    you. NEVER write a tool call as visible text or XML-like syntax such as
    <function=...>. If you have nothing further to call, give your plain
    final answer with no tool syntax in it.
20. If a tool returns an error (e.g. "Invalid argument", "Not found", or
    any error JSON), DO NOT hide it. Show a short user-friendly explanation
    of what went wrong and what the user should check/rephrase -- then
    suggest what to try next. Do NOT pretend the tool succeeded, and do NOT
    invent a workaround. An error is an answer: report it cleanly.
21. When a user enters a value in Malayalam, Tamil, Kannada, or any other
    language, convert it to English before passing it to any tool. Do NOT
    pass non-English values to any tool function.
"""

TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="crop_recommendation_model",
                description=(
                    "Trained Random Forest classifier. ONLY covers these 22 crops "
                    "-- never call for any other crop: rice, maize, chickpea, "
                    "kidneybeans, pigeonpeas, mothbeans, mungbean, blackgram, "
                    "lentil, pomegranate, banana, mango, grapes, watermelon, "
                    "muskmelon, apple, orange, papaya, coconut, cotton, jute, "
                    "coffee."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "N": types.Schema(type="NUMBER"),
                        "P": types.Schema(type="NUMBER"),
                        "K": types.Schema(type="NUMBER"),
                        "temperature": types.Schema(type="NUMBER"),
                        "humidity": types.Schema(type="NUMBER"),
                        "ph": types.Schema(type="NUMBER"),
                        "rainfall": types.Schema(type="NUMBER"),
                    },
                    required=["N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
                ),
            ),
            types.FunctionDeclaration(
                name="yield_prediction_model",
                description="Predicts expected yield per hectare and total harvest for a given crop, season, and state, using annual rainfall. Only covers crops and states present in the training data -- check metadata.crops_covered and metadata.states_covered before calling; fall back to kau_knowledge_search if either is missing.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "crop": types.Schema(type="STRING"),
                        "season": types.Schema(
                            type="STRING",
                            description="One of the dataset's season categories, e.g. 'Kharif', 'Rabi', 'Whole Year' -- call crop_calendar_lookup first if unsure which season applies."
                        ),
                        "state": types.Schema(type="STRING"),
                        "annual_rainfall": types.Schema(
                            type="NUMBER",
                            description="Annual rainfall in mm for the region -- get this from weather_lookup if not already known."
                        ),
                        "farm_area": types.Schema(
                            type="NUMBER",
                            description="Farm area in HECTARES. If the user gave acres, convert first: hectares = acres * 0.4047."
                        ),
                    },
                    required=["crop", "season", "state", "annual_rainfall", "farm_area"],
                ),
            ),
            types.FunctionDeclaration(
                name="crop_calendar_lookup",
                description=(
                    "Returns the traditional Malayalam-calendar planting and "
                    "harvesting window for a crop. Always call this before "
                    "discussing timing -- lead with tradition, not weather."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "crop_name": types.Schema(type="STRING"),
                    },
                    required=["crop_name"],
                ),
            ),
            types.FunctionDeclaration(
                name="companion_rules_lookup",
                description=(
                    "Looks up traditional/folk companion-planting pairs for a "
                    "crop. Call this FIRST when suggesting intercrops, before "
                    "kau_knowledge_search."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "crop_name": types.Schema(type="STRING"),
                    },
                    required=["crop_name"],
                ),
            ),
            types.FunctionDeclaration(
                name="kau_knowledge_search",
                description=(
                    "Semantic search over Kerala Agricultural University's "
                    "Package of Practices. Use for any crop NOT covered by "
                    "crop_recommendation_model, and to add supporting agronomic "
                    "detail after companion_rules_lookup."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "query": types.Schema(type="STRING"),
                        "top_k": types.Schema(type="INTEGER"),
                    },
                    required=["query"],
                ),
            ),
            types.FunctionDeclaration(
                name="weather_lookup",
                description=(
                    "Returns current weather conditions and a short-term "
                    "forecast for a Kerala district. Call this whenever the question "
                    "involves timing (planting, harvesting, spraying, irrigation) or "
                    "asks about weather directly. Treat it as a secondary caution "
                    "layered on top of crop_calendar_lookup -- never as the primary "
                    "timing driver (see system prompt rule 3)."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "district": types.Schema(
                            type="STRING",
                            description="Kerala district name, e.g. 'Kottayam', 'Wayanad'."
                        ),
                        "forecast_days": types.Schema(
                            type="INTEGER",
                            description="How many days ahead to forecast (1-7)."
                        ),
                    },
                    required=["district"],
                ),
            ),
            types.FunctionDeclaration(
                name="market_price_lookup",
                description=(
                    "Returns recent Kerala mandi (wholesale market) prices "
                    "for a commodity, sourced from Agmarknet -- min, max, and modal price "
                    "per quintal, converted to per-kg. Call this whenever the question "
                    "involves selling decisions, current prices, or 'is this a good time "
                    "to sell'. If no district is given, returns a statewide average "
                    "across the most recently reporting markets."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "commodity": types.Schema(
                            type="STRING",
                            description="Crop/commodity name, e.g. 'coconut', 'pepper', 'rice'."
                        ),
                        "district": types.Schema(
                            type="STRING",
                            description="Optional Kerala district to narrow results, e.g. 'Kottayam'."
                        ),
                    },
                    required=["commodity"],
                ),
            )
        ]
    )
]

async def execute_tool_call(db: Prisma, tool_name: str, arguments: dict, crop_model):
    """
    Routes a tool call from the LLM to the actual Python function.
    """
    for key, value in arguments.items():
        if isinstance(value, str) and any(
            phrase in value.lower() for phrase in ["result of", "output of", "from the previous", tool_name.lower()]
        ):
            return {
                "error": f"Invalid argument '{key}'='{value}' -- this looks like a placeholder, "
                         f"not an actual value. Wait for the real tool result before calling this tool again."
            }

    if tool_name == "crop_recommendation_model":
        return run_crop_recommendation(crop_model, **arguments)
    elif tool_name == "yield_prediction_model":
        return run_yield_prediction(**arguments)
    elif tool_name == "crop_calendar_lookup":
        return lookup_calendar(arguments["crop_name"])
    elif tool_name == "companion_rules_lookup":
        return lookup_companions(arguments["crop_name"])
    elif tool_name == "kau_knowledge_search":
        # Ensure top_k has a default if omitted by model
        top_k = arguments.get("top_k", 3)
        return await search_kau_knowledge(db, query=arguments.get("query", ""), top_k=top_k)
    elif tool_name == "weather_lookup":
        # Provide default
        forecast_days = arguments.get("forecast_days", 3)
        return await run_weather_lookup(district=arguments.get("district", ""), forecast_days=forecast_days)
    elif tool_name == "market_price_lookup":
        return await run_market_price_lookup(**arguments)
    else:
        return {"error": f"Unknown tool: {tool_name}"}

async def run_agent(
    db: Prisma,
    session_id: str,
    user_message: str,
    crop_model,
    max_turns: int = 10,
):
    """
    The core agent loop using google-genai.
    """
    memory_summary, recent_messages = await load_context(db, session_id)

    system_content = SYSTEM_PROMPT
    if memory_summary:
        system_content += "\n\nContext from earlier in this conversation:\n" + memory_summary

    # Convert past messages into Gemini's expected format (types.Content with roles 'user' and 'model')
    gemini_messages = []
    for msg in recent_messages:
        role = "user" if msg["role"] == "user" else "model"
        gemini_messages.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
    
    gemini_messages.append(types.Content(role="user", parts=[types.Part.from_text(text=user_message)]))
    
    reasoning_trace = []
    final_answer = None
    tool_calls_made = set()

    for turn in range(max_turns):
        is_final_push = turn >= max_turns - 2
        
        # In the final push, we instruct the model via a user message to stop tools
        if is_final_push and turn == max_turns - 2:
            gemini_messages.append(types.Content(role="user", parts=[types.Part.from_text(text=(
                "[System: You have collected enough tool data. "
                "Stop calling tools now. Write your final, complete, "
                "actionable farming advice for the farmer using all "
                "the tool results above. Do NOT call any more tools.]"
            ))]))
            
        current_tools = None if is_final_push else TOOLS

        try:
            config = types.GenerateContentConfig(
                temperature=0.3,
                tools=current_tools,
                system_instruction=system_content,
            )
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=gemini_messages,
                config=config,
            )
        except Exception as e:
            return {
                "answer": f"Agent failed: {str(e)}",
                "reasoning_trace": reasoning_trace,
                "session_id": session_id,
            }

        # Check if the model called any tools
        if not response.function_calls:
            # Model replied with text (final answer)
            final_answer = response.text
            break
            
        # Append the model's function calls to the history
        gemini_messages.append(response.candidates[0].content)
        
        # Execute all requested function calls
        tool_responses = []
        for function_call in response.function_calls:
            tool_name = function_call.name
            arguments = dict(function_call.args) if function_call.args else {}
            
            call_key = f"{tool_name}:{json.dumps(arguments, sort_keys=True)}"
            if call_key in tool_calls_made:
                result = {"note": "Already called with same arguments. Use prior result."}
            else:
                tool_calls_made.add(call_key)
                result = await execute_tool_call(db, tool_name, arguments, crop_model)
                reasoning_trace.append({"tool": tool_name, "arguments": arguments, "result_summary": str(result)[:200]})
                
            tool_responses.append(types.Part.from_function_response(
                name=tool_name,
                response={"result": result}
            ))
            
        # Append tool results as a single user message containing all function responses
        gemini_messages.append(types.Content(role="user", parts=tool_responses))

    if final_answer is None:
        try:
            force_response = client.models.generate_content(
                model=MODEL_NAME,
                contents=gemini_messages + [types.Content(role="user", parts=[types.Part.from_text(text="[System: Provide your final farming advice now based on all tool results above. No more tool calls.]")])],
                config=types.GenerateContentConfig(temperature=0.3, system_instruction=system_content),
            )
            final_answer = force_response.text
        except Exception:
            final_answer = "I collected the tool data but wasn't able to finalize an answer. Please try again."

    await save_turn(db, session_id, user_message, final_answer)
    await maybe_summarize(db, session_id)

    return {
        "answer": final_answer,
        "reasoning_trace": reasoning_trace,
        "session_id": session_id,
    }