"""
Market price lookup tool. Tries, in order:
  Tier 0: acrop.app -- Kerala state average + district breakdown,
          aggregated across recent Agmarknet reporting days
  Tier 1: manually-maintained static reference table (last resort only)

No other-state data is used -- Kerala only, per project requirements.
Also attaches a qualitative seasonal note from crop_calendar_lookup, since
no free source here provides genuine month-ahead price forecasting.
"""
from datetime import datetime, timedelta

from app.agent.tools.kerala_price_scraper import fetch_kerala_price
from app.agent.tools.calendar_tool import lookup_calendar

STATIC_REFERENCE_PRICES = {
    "coconut": {"price_per_kg": 0.0, "source": "Coconut Development Board", "last_updated": ""},
    "pepper": {"price_per_kg": 0.0, "source": "Spices Board India", "last_updated": ""},
    "cardamom": {"price_per_kg": 0.0, "source": "Spices Board India", "last_updated": ""},
    "rubber": {"price_per_kg": 0.0, "source": "Rubber Board India", "last_updated": ""},
}

_cache: dict[str, tuple[datetime, dict]] = {}
_CACHE_TTL = timedelta(hours=6)


def _seasonal_note(commodity: str) -> str | None:
    """Qualitative-only, NOT a numeric forecast -- see calendar_tool.py."""
    cal = lookup_calendar(commodity)
    if "error" in cal:
        return None
    harvest = cal.get("harvest_gregorian")
    if not harvest:
        return None
    return (
        f"Traditional harvest window is {harvest}. As harvest approaches, "
        f"local supply typically increases, which can soften prices -- "
        f"a general seasonal pattern, not a numeric forecast."
    )


async def run_market_price_lookup(commodity: str, district: str | None = None) -> dict:
    key = commodity.lower().strip()
    cache_key = f"{key}:{(district or '').lower()}"

    cached = _cache.get(cache_key)
    if cached and datetime.now() - cached[0] < _CACHE_TTL:
        return cached[1]

    seasonal_note = _seasonal_note(commodity)

    # Tier 0: acrop.app, Kerala only
    data = await fetch_kerala_price(commodity, district)
    if data:
        result = {
            "commodity": commodity,
            "district_filter": district,
            "data_source": "kerala_agmarknet_aggregated",
            "state_average_price_per_kg": data["state_average_price_per_kg"],
            "apmc_count": data["apmc_count"],
            "highest_price_per_quintal": data["highest_price_per_quintal"],
            "highest_price_market": data["highest_price_market"],
            "trend_vs_yesterday": data["trend_vs_yesterday"],
            "trend_vs_last_week": data["trend_vs_last_week"],
            "district_data": data.get("requested_district_data"),
            "district_note": data.get("requested_district_note"),
            "seasonal_note": seasonal_note,
        }
        _cache[cache_key] = (datetime.now(), result)
        return result

    # Tier 1: static reference table (last resort only)
    static = STATIC_REFERENCE_PRICES.get(key)
    if static and static["price_per_kg"] > 0:
        result = {
            "commodity": commodity,
            "data_source": "static_reference_not_live",
            "price_per_kg": static["price_per_kg"],
            "source": static["source"],
            "last_updated": static["last_updated"],
            "note": "No live Kerala price data available -- manually-maintained reference, not a live quote.",
            "seasonal_note": seasonal_note,
        }
        _cache[cache_key] = (datetime.now(), result)
        return result

    result = {
        "commodity": commodity,
        "district": district,
        "error": f"No Kerala price data available for '{commodity}' from any source.",
        "seasonal_note": seasonal_note,
    }
    _cache[cache_key] = (datetime.now(), result)
    return result