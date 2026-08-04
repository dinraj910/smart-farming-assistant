"""
Manual isolation test for every agent tool, per Phase 8.1.
Run with: python test_tools.py
"""
import asyncio
from dotenv import load_dotenv

load_dotenv()  # loads DATA_GOV_IN_API_KEY, GROQ_API_KEY, DATABASE_URL from .env

from app.agent.tools.weather_tool import run_weather_lookup
from app.agent.tools.market_tool import run_market_price_lookup
from app.agent.tools.calendar_tool import lookup_calendar
from app.agent.tools.companion_tool import lookup_companions
from app.agent.tools.crop_tool import run_crop_recommendation
from app.agent.tools.kau_search_tool import search_kau_knowledge
from app.agent.tools.yield_tool import run_yield_prediction
from app.ml.crop_model import CropRecommendationModel


def print_result(label, result):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    print(result)


async def main():
    # 1. Calendar lookup -- no network, no key needed
    print_result(
        "calendar_tool: coconut",
        lookup_calendar("coconut"),
    )

    # 2. Companion lookup -- no network, no key needed
    print_result(
        "companion_tool: coconut",
        lookup_companions("coconut"),
    )

    # 3. Weather lookup -- needs internet, no key needed
    print_result(
        "weather_tool: Kottayam, 3 days",
        await run_weather_lookup("Kottayam", 3),
    )

    # 4. Market price lookup -- needs DATA_GOV_IN_API_KEY
    print_result(
        "market_tool: coconut in Kottayam",
        await run_market_price_lookup("coconut", "Kottayam"),
    )

    print_result(
        "market_tool: pepper, statewide",
        await run_market_price_lookup("pepper"),
    )

    # 5. Crop recommendation tool -- needs model instance
    try:
        crop_model = CropRecommendationModel(model_dir="ml_models/crop_recommendation")
        print_result(
            "crop_tool: sample values",
            run_crop_recommendation(crop_model, 90, 42, 43, 20.8, 82.0, 6.5, 202.9),
        )
    except Exception as e:
        print_result("crop_tool: error", f"Could not load model: {e}")

    # 6. KAU Search -- needs DATABASE_URL (vector DB)
    try:
        print_result(
            "kau_search_tool: pepper",
            await search_kau_knowledge("pepper", top_k=2),
        )
    except Exception as e:
        print_result("kau_search_tool: error", f"Could not search vector DB: {e}")

    # 7. Yield prediction -- loads its own pipeline
    try:
        print_result(
            "yield_tool: rice, kharif, Kerala, 2000mm, 1.0 hectare",
            run_yield_prediction("rice", "Kharif", "Kerala", 2000.0, 1.0),
        )
    except Exception as e:
        print_result("yield_tool: error", f"Could not run yield prediction: {e}")


if __name__ == "__main__":
    asyncio.run(main())