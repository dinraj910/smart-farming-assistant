"""
Market price lookup tool. Tries, in order:
  Tier 0: live scrape of commodityonline.com's Kerala district pages
  Tier 1: Agmarknet (data.gov.in) for Kerala
  Tier 2: Agmarknet for a neighbouring state (LAST RESORT, heavily summarized)
  Tier 3: a manually-maintained static reference table

Output is intentionally compact -- a price summary plus 2-3 sample markets,
never a raw dump of every market row. Also attaches a qualitative seasonal
note (not a numeric forecast) by cross-referencing crop_calendar_lookup's
harvest window, since no free source here provides real price forecasting.
"""
import os
import httpx
from datetime import datetime, timedelta

from app.agent.tools.kerala_price_scraper import scrape_kerala_prices
from app.agent.tools.calendar_tool import lookup_calendar

RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
BASE_URL = f"https://api.data.gov.in/resource/{RESOURCE_ID}"

COMMODITY_ALIASES = {
    "rice": "Rice", "paddy": "Paddy(Dhan)(Common)", "maize": "Maize",
    "banana": "Banana", "coconut": "Coconut", "mango": "Mango",
    "papaya": "Papaya", "grapes": "Grapes", "watermelon": "Water Melon",
    "muskmelon": "Musk Melon", "apple": "Apple", "orange": "Orange",
    "cotton": "Cotton", "jute": "Jute", "coffee": "Coffee",
    "pepper": "Pepper ungarbled", "black pepper": "Pepper ungarbled",
    "ginger": "Ginger(Green)", "cardamom": "Cardamoms", "rubber": "Rubber",
    "arecanut": "Arecanut(Betelnut/Supari)", "cocoa": "Cocoa",
    "tapioca": "Tapioca", "cassava": "Tapioca", "jackfruit": "Jack Fruit",
    "chickpea": "Bengal Gram(Gram)(Whole)", "kidneybeans": "Rajma",
    "pigeonpeas": "Arhar (Tur/Red Gram)(Whole)", "mothbeans": "Moth",
    "mungbean": "Green Gram (Moong)(Whole)",
    "blackgram": "Black Gram (Urd Beans)(Whole)",
    "lentil": "Lentil (Masur)(Whole)", "pomegranate": "Pomegranate",
}

NEIGHBOR_STATE_FALLBACK = {
    "Coconut": ["Tamil Nadu", "Karnataka"],
    "Pepper ungarbled": ["Karnataka"],
    "Cardamoms": ["Karnataka"],
    "Arecanut(Betelnut/Supari)": ["Karnataka"],
    "Cocoa": ["Karnataka"],
    "Rubber": ["Tamil Nadu"],
}

STATIC_REFERENCE_PRICES = {
    "Coconut": {"price_per_kg": 0.0, "source": "Coconut Development Board", "last_updated": ""},
    "Pepper ungarbled": {"price_per_kg": 0.0, "source": "Spices Board India", "last_updated": ""},
    "Cardamoms": {"price_per_kg": 0.0, "source": "Spices Board India", "last_updated": ""},
    "Rubber": {"price_per_kg": 0.0, "source": "Rubber Board India", "last_updated": ""},
}

_cache: dict[str, tuple[datetime, dict]] = {}
_CACHE_TTL = timedelta(hours=6)

SAMPLE_MARKET_COUNT = 3  # how many individual markets to show as evidence


def _resolve_commodity(commodity: str) -> str:
    key = commodity.lower().strip()
    if key in COMMODITY_ALIASES:
        return COMMODITY_ALIASES[key]
    for k, v in COMMODITY_ALIASES.items():
        if key in k or k in key:
            return v
    return commodity.strip().title()


def _seasonal_note(commodity: str) -> str | None:
    """
    Qualitative-only seasonal context, derived from the calendar tool's
    harvest window -- NOT a numeric price forecast, since no free source
    here provides real historical trend data to forecast from.
    """
    cal = lookup_calendar(commodity)
    if "error" in cal:
        return None
    harvest = cal.get("harvest_gregorian")
    if not harvest:
        return None
    return (
        f"Traditional harvest window is {harvest}. As harvest approaches, "
        f"local supply typically increases, which can soften prices -- "
        f"this is a general seasonal pattern, not a numeric forecast."
    )


def _price_stats(records: list[dict]) -> dict:
    """Computes summary stats from ANY list of records with modal_price_per_kg."""
    prices = [r["modal_price_per_kg"] for r in records if r.get("modal_price_per_kg")]
    if not prices:
        return {}
    return {
        "average_price_per_kg": round(sum(prices) / len(prices), 2),
        "min_price_per_kg": round(min(prices), 2),
        "max_price_per_kg": round(max(prices), 2),
        "market_count": len(records),
    }


def _sample_markets(records: list[dict]) -> list[dict]:
    """Returns a small, representative sample -- not the full list."""
    return [
        {
            "market": r.get("market"),
            "district": r.get("district"),
            "price_per_kg": r.get("modal_price_per_kg"),
        }
        for r in records[:SAMPLE_MARKET_COUNT]
    ]


async def _query_agmarknet(client: httpx.AsyncClient, api_key: str, commodity: str,
                            state: str, district: str | None = None) -> list[dict]:
    params = {
        "api-key": api_key, "format": "json", "limit": 100,
        "filters[state]": state, "filters[commodity]": commodity,
    }
    if district:
        params["filters[district]"] = district.strip().title()
    resp = await client.get(BASE_URL, params=params)
    resp.raise_for_status()
    raw = resp.json().get("records", [])

    out = []
    for r in raw:
        try:
            modal = float(r.get("modal_price", 0))
        except (TypeError, ValueError):
            continue
        if modal <= 0:
            continue
        out.append({
            "market": r.get("market"), "district": r.get("district"),
            "modal_price_per_kg": round(modal / 100, 2),
        })
    return out


async def run_market_price_lookup(commodity: str, district: str | None = None) -> dict:
    resolved_commodity = _resolve_commodity(commodity)
    cache_key = f"{resolved_commodity.lower()}:{(district or '').lower()}"

    cached = _cache.get(cache_key)
    if cached and datetime.now() - cached[0] < _CACHE_TTL:
        return cached[1]

    seasonal_note = _seasonal_note(commodity)

    # Tier 0: live scrape of Kerala district data
    try:
        scraped = await scrape_kerala_prices(commodity, district)
        if scraped:
            stats = _price_stats(scraped)
            result = {
                "commodity": commodity,
                "resolved_commodity": resolved_commodity,
                "district_filter": district,
                "data_source": "kerala_live",
                "arrival_date": scraped[0].get("arrival_date"),
                **stats,
                "sample_markets": _sample_markets(scraped),
                "seasonal_note": seasonal_note,
            }
            _cache[cache_key] = (datetime.now(), result)
            return result
    except Exception:
        pass

    # Tier 1: Agmarknet Kerala
    api_key = os.environ.get("DATA_GOV_IN_API_KEY")
    if api_key:
        async with httpx.AsyncClient(
            timeout=30.0,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"},
        ) as client:
            try:
                records = await _query_agmarknet(client, api_key, resolved_commodity, "Kerala", district)
                if not records and district:
                    records = await _query_agmarknet(client, api_key, resolved_commodity, "Kerala")

                if records:
                    stats = _price_stats(records)
                    result = {
                        "commodity": commodity, "resolved_commodity": resolved_commodity,
                        "district_filter": district, "data_source": "kerala_agmarknet",
                        **stats, "sample_markets": _sample_markets(records),
                        "seasonal_note": seasonal_note,
                    }
                    _cache[cache_key] = (datetime.now(), result)
                    return result

                # Tier 2: neighbour state -- LAST RESORT, heavily summarized
                for neighbor_state in NEIGHBOR_STATE_FALLBACK.get(resolved_commodity, []):
                    records = await _query_agmarknet(client, api_key, resolved_commodity, neighbor_state)
                    if records:
                        stats = _price_stats(records)
                        result = {
                            "commodity": commodity, "resolved_commodity": resolved_commodity,
                            "district_filter": district,
                            "data_source": "regional_reference",
                            "reference_state": neighbor_state,
                            "note": (
                                f"No Kerala-specific price data found for {resolved_commodity} today "
                                f"-- figures below are from {neighbor_state}, a major producing state, "
                                f"as a rough reference only, not a Kerala price."
                            ),
                            **stats, "sample_markets": _sample_markets(records),
                            "seasonal_note": seasonal_note,
                        }
                        _cache[cache_key] = (datetime.now(), result)
                        return result
            except Exception:
                pass

    # Tier 3: static reference table
    static = STATIC_REFERENCE_PRICES.get(resolved_commodity)
    if static and static["price_per_kg"] > 0:
        result = {
            "commodity": commodity, "resolved_commodity": resolved_commodity,
            "data_source": "static_reference_not_live",
            "price_per_kg": static["price_per_kg"], "source": static["source"],
            "last_updated": static["last_updated"],
            "note": "No live mandi data available -- manually-maintained reference price, not a live quote.",
            "seasonal_note": seasonal_note,
        }
        _cache[cache_key] = (datetime.now(), result)
        return result

    result = {
        "commodity": commodity, "resolved_commodity": resolved_commodity, "district": district,
        "error": f"No mandi price data available for '{resolved_commodity}' from any source.",
        "seasonal_note": seasonal_note,
    }
    _cache[cache_key] = (datetime.now(), result)
    return result