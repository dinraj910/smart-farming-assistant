
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "crop_recommendation_model",
            "description": (
                "Trained Random Forest classifier. ONLY covers these 22 crops "
                "-- never call for any other crop: rice, maize, chickpea, "
                "kidneybeans, pigeonpeas, mothbeans, mungbean, blackgram, "
                "lentil, pomegranate, banana, mango, grapes, watermelon, "
                "muskmelon, apple, orange, papaya, coconut, cotton, jute, "
                "coffee."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "N": {"type": "number"},
                    "P": {"type": "number"},
                    "K": {"type": "number"},
                    "temperature": {"type": "number"},
                    "humidity": {"type": "number"},
                    "ph": {"type": "number"},
                    "rainfall": {"type": "number"},
                },
                "required": [
                    "N",
                    "P",
                    "K",
                    "temperature",
                    "humidity",
                    "ph",
                    "rainfall",
                ],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "yield_prediction_model",
            "description": "Predicts expected yield per hectare and total harvest for a given crop, season, and state, using annual rainfall. Only covers crops and states present in the training data -- check metadata.crops_covered and metadata.states_covered before calling; fall back to kau_knowledge_search if either is missing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "crop": {"type": "string"},
                    "season": {
                        "type": "string",
                        "description": "One of the dataset's season categories, e.g. 'Kharif', 'Rabi', 'Whole Year' -- call crop_calendar_lookup first if unsure which season applies."
                    },
                    "state": {"type": "string"},
                    "annual_rainfall": {
                        "type": "number",
                        "description": "Annual rainfall in mm for the region -- get this from weather_lookup if not already known."
                    },
                    "farm_area": {
                        "type": "number",
                        "description": "Farm area in HECTARES. If the user gave acres, convert first: hectares = acres * 0.4047."
                    },
                },
                "required": ["crop", "season", "state", "annual_rainfall", "farm_area"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "crop_calendar_lookup",
            "description": (
                "Returns the traditional Malayalam-calendar planting and "
                "harvesting window for a crop. Always call this before "
                "discussing timing -- lead with tradition, not weather."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "crop_name": {"type": "string"},
                },
                "required": ["crop_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "companion_rules_lookup",
            "description": (
                "Looks up traditional/folk companion-planting pairs for a "
                "crop. Call this FIRST when suggesting intercrops, before "
                "kau_knowledge_search."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "crop_name": {"type": "string"},
                },
                "required": ["crop_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "kau_knowledge_search",
            "description": (
                "Semantic search over Kerala Agricultural University's "
                "Package of Practices. Use for any crop NOT covered by "
                "crop_recommendation_model, and to add supporting agronomic "
                "detail after companion_rules_lookup."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "top_k": {
                        "type": "integer",
                        "default": 3,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "weather_lookup",
            "description": "Returns current weather conditions and a short-term "
            "forecast for a Kerala district. Call this whenever the question "
            "involves timing (planting, harvesting, spraying, irrigation) or "
            "asks about weather directly. Treat it as a secondary caution "
            "layered on top of crop_calendar_lookup -- never as the primary "
            "timing driver (see system prompt rule 3).",
            "parameters": {
                "type": "object",
                "properties": {
                    "district": {
                        "type": "string",
                        "description": "Kerala district name, e.g. 'Kottayam', 'Wayanad'.",
                    },
                    "forecast_days": {
                        "type": "integer",
                        "description": "How many days ahead to forecast (1-7).",
                        "default": 3,
                    },
                },
                "required": ["district"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "market_price_lookup",
            "description": "Returns recent Kerala mandi (wholesale market) prices "
            "for a commodity, sourced from Agmarknet -- min, max, and modal price "
            "per quintal, converted to per-kg. Call this whenever the question "
            "involves selling decisions, current prices, or 'is this a good time "
            "to sell'. If no district is given, returns a statewide average "
            "across the most recently reporting markets.",
            "parameters": {
                "type": "object",
                "properties": {
                    "commodity": {
                        "type": "string",
                        "description": "Crop/commodity name, e.g. 'coconut', 'pepper', 'rice'.",
                    },
                    "district": {
                        "type": "string",
                        "description": "Optional Kerala district to narrow results, e.g. 'Kottayam'.",
                    },
                },
                "required": ["commodity"],
            },
        },
    }
]




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
16. Keep the final answer concise and actionable.
17. This conversation may include earlier turns (and a summary of turns
    further back) — treat those as real prior context. Do not ask the farmer
    to repeat information already given earlier in this session.
18. Only call tools through the actual tool-calling mechanism provided to
    you. NEVER write a tool call as visible text or XML-like syntax such as
    <function=...>. If you have nothing further to call, give your plain
    final answer with no tool syntax in it.
19. If a tool returns an error (e.g. "Invalid argument", "Not found", or
    any error JSON), DO NOT hide it. Show a short user-friendly explanation
    of what went wrong and what the user should check/rephrase -- then
    suggest what to try next. Do NOT pretend the tool succeeded, and do NOT
    invent a workaround. An error is an answer: report it cleanly.
20. When a user enters a value in Malayalam, Tamil, Kannada, or any other
    language, convert it to English before passing it to any tool. Do NOT
    pass non-English values to any tool function.

"""





import json

from groq import Groq
from dotenv import load_dotenv

load_dotenv()

from app.agent.tools.crop_tool import run_crop_recommendation
from app.agent.tools.yield_tool import run_yield_prediction
from app.agent.tools.calendar_tool import lookup_calendar
from app.agent.tools.companion_tool import lookup_companions
from app.agent.tools.kau_search_tool import search_kau_knowledge
from app.agent.tools.weather_tool import run_weather_lookup
from app.agent.tools.market_tool import run_market_price_lookup

import re

LEAKED_TOOL_CALL_PATTERN = re.compile(r'<function=([\w_]+)>\s*(\{.*?\})\s*</function>', re.DOTALL)

from prisma import Prisma

from app.agent.memory import (
    load_context,
    save_turn,
    maybe_summarize,
)



client = Groq()  # Reads GROQ_API_KEY from the environment automatically.

MODEL_NAME = "llama-3.3-70b-versatile"


async def execute_tool_call(tool_name: str, arguments: dict, crop_model):
    """
    Routes a tool call from the LLM to the actual Python function.
    """

    # Defensive check: reject placeholder/templated arguments instead of
    # silently executing garbage input. This is what caused the empty
    # companion_rules_lookup result in Scenario A.
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
        return await search_kau_knowledge(**arguments)

    elif tool_name == "weather_lookup":
        return await run_weather_lookup(**arguments)

    elif tool_name == "market_price_lookup":
        return await run_market_price_lookup(**arguments)

    else:
        return {
            "error": f"Unknown tool: {tool_name}"
        }


async def run_agent(
    db: Prisma,
    session_id: str,
    user_message: str,
    crop_model,
    max_turns: int = 6,
):
    """
    The core agent loop.

    Returns the final answer plus a reasoning trace
    (which tools were called, in what order)
    for the UI to display.
    """

    memory_summary, recent_messages = await load_context(
        db,
        session_id,
    )

    system_content = SYSTEM_PROMPT

    if memory_summary:
        system_content += (
            "\n\nContext from earlier in this conversation:\n"
            + memory_summary
        )

    messages = [
        {
            "role": "system",
            "content": system_content,
        }
    ]

    messages.extend(recent_messages)

    messages.append(
        {
            "role": "user",
            "content": user_message,
        }
    )

    reasoning_trace = []

    for _ in range(max_turns):

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.3,
        )

        message = response.choices[0].message

        # No more tools required.
        message = response.choices[0].message
        leaked_calls = LEAKED_TOOL_CALL_PATTERN.findall(message.content or "")

        if not message.tool_calls and not leaked_calls:
            final_answer = message.content
            break

        # The LLM requested one or more tool calls.
        messages.append(message)

        if message.tool_calls:
            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
                result = await execute_tool_call(tool_name, arguments, crop_model)
                reasoning_trace.append({"tool": tool_name, "arguments": arguments, "result_summary": str(result)[:200]})
                messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": json.dumps(result)})

        if leaked_calls:
            # Model wrote a tool call as text instead of a real tool call -- salvage
            # its intent (still call the tool for real) instead of showing raw
            # syntax to the farmer or silently dropping it.
            for tool_name, args_json in leaked_calls:
                try:
                    arguments = json.loads(args_json)
                except json.JSONDecodeError:
                    continue
                result = await execute_tool_call(tool_name, arguments, crop_model)
                reasoning_trace.append({
                    "tool": tool_name, "arguments": arguments,
                    "result_summary": str(result)[:200],
                    "note": "recovered from malformed text output",
                })
                messages.append({
                    "role": "user",
                    "content": f"[System note: tool '{tool_name}' returned: {json.dumps(result)}. "
                               f"Give your final answer now using this. Never write tool calls as visible text again.]"
                })

    if final_answer is None:
        final_answer = (
            "I wasn't able to reach a confident answer "
            "within the available steps. "
            "Please try rephrasing your question."
        )

    await save_turn(
        db,
        session_id,
        user_message,
        final_answer,
    )

    await maybe_summarize(
        db,
        session_id,
    )


    return {
        "answer": final_answer,
        "reasoning_trace": reasoning_trace,
        "session_id": session_id,
    }