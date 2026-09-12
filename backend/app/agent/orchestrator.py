import json
import os
import re
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

from prisma import Prisma

from app.agent.memory import (
    load_context,
    save_turn,
    maybe_summarize,
)

# ─── Groq client (ultra-fast, generous free tier) ─────────────────────────────
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# openai/gpt-oss-120b: 120B OpenAI open-source model on Groq
# - Full tool/function calling support
# - ~1-2s response time on Groq LPU hardware
# - Generous free tier (no per-day quota)
MODEL_NAME = "openai/gpt-oss-120b"

SYSTEM_PROMPT = """You are a concise, expert AI farming advisor for Kerala farmers.
You have tools — use the minimum needed to answer exactly what was asked.

## CRITICAL RULE — Answer only what was asked
Read the user's question carefully and answer ONLY that. Do NOT proactively
add unsolicited sections (companion planting, harvest cues, pest info, general
checklist, etc.) unless the user specifically asked. A farmer asking
"what should I plant?" wants a crop name + brief reason — not a full growing guide.
A farmer asking about fertilizer wants dosage + schedule — not market prices too.
Keep answers short, direct, and conversational — 3 to 8 sentences or a small
table/bullet list. If they want more, they will ask.

## Tool rules
1. Call crop_recommendation_model FIRST for any of its 22 crops when soil
   data (N, P, K, pH) is provided. If confidence < 0.5, name the top alternative.
2. Call weather_lookup only when the question is about timing or weather.
3. Call crop_calendar_lookup only when asked about planting/harvest timing.
4. Call market_price_lookup only when asked about prices or selling decisions.
5. Call yield_prediction_model only when asked about expected yield/harvest.
6. Call kau_knowledge_search only when asked about cultivation details,
   fertilizer schedules, or spacing — NOT for every crop recommendation.
7. Call companion_rules_lookup only when asked about companion/inter-cropping.
8. NEVER call a tool with a placeholder value. Wait for real prior results.
9. NEVER pass non-English values to any tool — translate first.
10. This is a multi-turn chat — prior context is in the message history.
    Do NOT ask the farmer to repeat information already given.

## Response format
- Use Markdown: **bold**, bullet lists, small tables where helpful.
- Speak like a confident local agricultural officer — plain, direct, Malayalam
  month names alongside Gregorian when relevant.
- NEVER say "As an AI" or fabricate data not returned by a tool.
- If a tool returns no data, say so briefly and move on.
"""

# ─── OpenAI-compatible tool definitions for Groq ──────────────────────────────
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
                "muskmelon, apple, orange, papaya, coconut, cotton, jute, coffee."
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
                "required": ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "yield_prediction_model",
            "description": (
                "Predicts expected yield per hectare and total harvest for a given crop, season, and state, "
                "using annual rainfall. Only covers crops and states present in the training data. "
                "Fall back to kau_knowledge_search if missing."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "crop": {"type": "string"},
                    "season": {
                        "type": "string",
                        "description": "One of: 'Kharif', 'Rabi', 'Whole Year'",
                    },
                    "state": {"type": "string"},
                    "annual_rainfall": {
                        "type": "number",
                        "description": "Annual rainfall in mm for the region.",
                    },
                    "farm_area": {
                        "type": "number",
                        "description": "Farm area in HECTARES. If user gave acres, convert: hectares = acres * 0.4047.",
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
                "Returns the traditional Malayalam-calendar planting and harvesting window for a crop. "
                "Always call this before discussing timing."
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
                "Looks up traditional/folk companion-planting pairs for a crop. "
                "Call this FIRST when suggesting intercrops."
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
                "Semantic search over Kerala Agricultural University's Package of Practices. "
                "Use for any crop NOT covered by crop_recommendation_model, and to add "
                "supporting agronomic detail."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "top_k": {"type": "integer"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "weather_lookup",
            "description": (
                "Returns current weather conditions and a short-term forecast for a Kerala district. "
                "Call whenever the question involves timing or weather directly."
            ),
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
            "description": (
                "Returns recent Kerala mandi (wholesale market) prices for a commodity from Agmarknet. "
                "Call whenever the question involves selling decisions, current prices, or price outlook."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "commodity": {
                        "type": "string",
                        "description": "Crop/commodity name, e.g. 'coconut', 'pepper', 'rice'.",
                    },
                    "district": {
                        "type": "string",
                        "description": "Optional Kerala district to narrow results.",
                    },
                },
                "required": ["commodity"],
            },
        },
    },
]


async def execute_tool_call(db: Prisma, tool_name: str, arguments: dict, crop_model):
    """Routes a tool call from the LLM to the actual Python function."""
    # Guard against placeholder arguments
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
        top_k = arguments.get("top_k", 3)
        return await search_kau_knowledge(db, query=arguments.get("query", ""), top_k=top_k)
    elif tool_name == "weather_lookup":
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
    max_turns: int = 6,
    farm_info: dict | None = None,
):
    """
    The core agent loop using Groq (llama-3.3-70b-versatile).
    Groq provides blazing-fast inference with native OpenAI-compatible tool calling.
    """
    memory_summary, recent_messages = await load_context(db, session_id)

    system_content = SYSTEM_PROMPT
    if memory_summary:
        system_content += "\n\nContext from earlier in this conversation:\n" + memory_summary

    if farm_info:
        loc = farm_info.get("location") or "Kerala"
        district = loc.split(",")[0].strip() if loc else "Kerala"
        npk_val = farm_info.get("npk") or "Not recorded"
        acres_val = farm_info.get("acres") or "Not recorded"
        farm_name = farm_info.get("name") or "Farmer's Field"
        status_val = farm_info.get("status") or "Inspection Due"

        system_content += f"""

## Active Farm Profile (Automatically Loaded from Database)
- Plot / Field Name: {farm_name}
- Location: {loc} (District: {district})
- Plot Area: {acres_val}
- Recorded Soil Telemetry (NPK & pH): {npk_val}
- Health / Monitoring Status: {status_val}

### CRITICAL INSTRUCTIONS ON AUTOMATIC FARM CONTEXT:
1. AUTOMATIC LOCATION: The farmer's plot location is ALREADY KNOWN ({loc}, District: {district}).
   - For weather inquiries or planting calendars, automatically call `weather_lookup` or relevant tools using district="{district}".
   - For mandi price inquiries, automatically call `market_price_lookup` using district="{district}".
   - DO NOT ask the farmer for their location or district unless they explicitly ask for advice regarding a different location.
2. AUTOMATIC SOIL DATA:
   - If the farmer asks for crop recommendation or fertilizer advice and soil parameters ({npk_val}) are recorded above, use them automatically with `crop_recommendation_model`.
   - ONLY ask the farmer for soil values (N, P, K, pH) if the record above is missing, "--", or unrecorded.
3. ACREAGE / YIELD:
   - Use the plot area ({acres_val}) for yield prediction if applicable.
"""
    else:
        system_content += """

## Active Farm Profile
No specific plot is selected for this conversation. If the user's question requires a location (e.g. weather forecast, local mandi rates, or crop suitability) and no location was mentioned in their query, politely ask them to mention their district in Kerala before or while answering.
"""

    # Build OpenAI-compatible message list
    messages = [{"role": "system", "content": system_content}]

    # Add history
    for msg in recent_messages:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg["content"]})

    # Add current user message
    messages.append({"role": "user", "content": user_message})

    reasoning_trace = []
    final_answer = None
    tool_calls_made = set()

    for turn in range(max_turns):
        is_final_push = turn >= max_turns - 2

        # On final push, instruct model to stop calling tools
        if is_final_push and turn == max_turns - 2:
            messages.append({
                "role": "user",
                "content": (
                    "[System: You have collected enough tool data. "
                    "Stop calling tools now. Write your final, complete, "
                    "actionable farming advice for the farmer using all "
                    "the tool results above. Do NOT call any more tools.]"
                )
            })

        # Build kwargs — omit tools/tool_choice entirely on final push
        completion_kwargs: dict = {
            "model": MODEL_NAME,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 1500,
        }
        if not is_final_push:
            completion_kwargs["tools"] = TOOLS
            completion_kwargs["tool_choice"] = "auto"

        try:
            response = client.chat.completions.create(**completion_kwargs)
        except Exception as e:
            return {
                "answer": f"Agent failed: {str(e)}",
                "reasoning_trace": reasoning_trace,
                "session_id": session_id,
            }

        choice = response.choices[0]
        msg = choice.message

        # Check if the model made tool calls
        if not msg.tool_calls:
            # Model replied with plain text — final answer
            final_answer = msg.content
            break

        # Append the assistant's tool-call message to history
        messages.append({"role": "assistant", "content": msg.content, "tool_calls": [
            {
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
            }
            for tc in msg.tool_calls
        ]})

        # Execute each tool call
        for tc in msg.tool_calls:
            tool_name = tc.function.name
            try:
                arguments = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                arguments = {}

            call_key = f"{tool_name}:{json.dumps(arguments, sort_keys=True)}"
            if call_key in tool_calls_made:
                result = {"note": "Already called with same arguments. Use prior result."}
            else:
                tool_calls_made.add(call_key)
                result = await execute_tool_call(db, tool_name, arguments, crop_model)
                reasoning_trace.append({
                    "tool": tool_name,
                    "arguments": arguments,
                    "result_summary": str(result)[:200],
                })

            # Append tool result as a "tool" role message
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result),
            })

    if final_answer is None:
        try:
            force_response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages + [{
                    "role": "user",
                    "content": "[System: Give your final concise answer now. No more tool calls.]"
                }],
                temperature=0.3,
                max_tokens=1500,
            )
            final_answer = force_response.choices[0].message.content
        except Exception:
            final_answer = "I collected the tool data but wasn't able to finalize an answer. Please try again."

    await save_turn(db, session_id, user_message, final_answer)
    await maybe_summarize(db, session_id)

    return {
        "answer": final_answer,
        "reasoning_trace": reasoning_trace,
        "session_id": session_id,
    }