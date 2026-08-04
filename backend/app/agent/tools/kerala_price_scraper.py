"""
Live scraper for acrop.app's Kerala commodity price pages. This aggregates
Agmarknet data across recent reporting days per market -- unlike querying
Agmarknet directly for "today only", which is why coconut/pepper kept
coming back empty. This is now the PRIMARY source for market_tool.py;
district data is included on the same page, so one fetch covers both a
Kerala state average and a per-district breakdown.

Parsing strategy: the page's <meta name="description"> tag is templated
and far more stable than scraping visual layout, so that's the primary
extraction point. District breakdown and trend info are parsed best-effort
from the page body and can be None without breaking the tool.
"""
import re
import httpx
from bs4 import BeautifulSoup

BASE = "https://acrop.app/prices"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    )
}

# Our internal crop key -> acrop.app's URL slug. Ones marked "confirmed"
# were seen directly on the site; others are best-effort guesses that fail
# gracefully (empty result) if wrong -- fix by testing and correcting.
ACROP_SLUGS = {
    "coconut": "coconut",           # confirmed
    "banana": "banana",             # confirmed
    "banana - green": "bananagreen",
    "raw banana": "bananagreen",
    "arecanut": "arecanut",         # confirmed
    "cocoa": "cocoa",               # confirmed
    "copra": "copra",               # confirmed
    "coffee": "coffee",             # confirmed
    "ginger": "ginger",             # confirmed
    "dried ginger": "dryginger",    # confirmed
    "pepper": "blackpepper",        # confirmed
    "black pepper": "blackpepper",  # confirmed
    "pigeonpeas": "tur",            # confirmed
    "chickpea": "chana",            # confirmed
    "blackgram": "urad",            # confirmed
    "mungbean": "moong",            # confirmed
    "grapes": "grapes",             # confirmed
    "rice": "rice",                 # guess
    "maize": "maize",               # guess
    "cardamom": "cardamom",         # guess
    "rubber": "rubber",             # guess
    "tapioca": "tapioca",           # guess
    "cassava": "tapioca",           # guess
    "jackfruit": "jackfruit",       # guess
    "cotton": "cotton",             # guess
    "mango": "mango",               # guess
    "papaya": "papaya",             # guess
    "watermelon": "watermelon",     # guess
    "pomegranate": "pomegranate",   # guess
    "kidneybeans": "rajma",         # guess
}

KERALA_DISTRICTS = {
    "thiruvananthapuram", "thrissur", "kollam", "ernakulam", "kottayam",
    "malappuram", "palakkad", "pathanamthitta", "idukki", "alappuzha",
    "kannur", "kozhikode", "wayanad", "kasaragod",
}

_META_RE = re.compile(
    r"₹([\d,]+)/qtl\s*\(₹([\d.]+)/kg\)\s*avg across (\d+) APMCs?\.\s*"
    r"Highest ₹([\d,]+) at (.+?)\.",
    re.IGNORECASE,
)
_TREND_RE = re.compile(
    r"(up|down)\s*([\d.]+)%\s*from yesterday'?s\s*₹([\d,]+)",
    re.IGNORECASE,
)
_WEEK_RE = re.compile(
    r"7-day average:\s*₹([\d,]+)\s*\(([\d.]+)%\s*(above|below)\s*last week\)",
    re.IGNORECASE,
)
_DISTRICT_ROW_RE = re.compile(
    r"([A-Za-z][A-Za-z\s]*?)\s*(\d+)\s*APMCs?\s*reporting\s*·\s*"
    r"(\d{1,2}\s+\w+\s+\d{4})\s*Best:\s*(.+?)\s*₹\s*([\d,]+)\s*₹\s*([\d,]+)\s*Avg\.",
    re.IGNORECASE,
)


def _resolve_slug(commodity: str) -> str:
    key = commodity.lower().strip()
    if key in ACROP_SLUGS:
        return ACROP_SLUGS[key]
    for k, v in ACROP_SLUGS.items():
        if key in k or k in key:
            return v
    return re.sub(r"[^a-z0-9]+", "", key)


def _resolve_district_key(district: str | None) -> str | None:
    if not district:
        return None
    key = district.lower().strip().replace(" ", "")
    for d in KERALA_DISTRICTS:
        if key in d or d in key:
            return d
    return None


async def fetch_kerala_price(commodity: str, district: str | None = None) -> dict | None:
    """
    Returns a dict with Kerala state average + district breakdown, or None
    if the fetch/parse failed -- callers should fall through to the next
    tier, not treat None as a hard error.
    """
    slug = _resolve_slug(commodity)
    url = f"{BASE}/{slug}/kerala"

    try:
        async with httpx.AsyncClient(timeout=20.0, headers=HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None
            html = resp.text
    except Exception:
        return None

    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception:
        return None

    meta = soup.find("meta", attrs={"name": "description"})
    meta_content = meta.get("content", "") if meta else ""
    match = _META_RE.search(meta_content)
    if not match:
        return None

    state_price_qtl, state_price_kg, apmc_count, highest_price, highest_market = match.groups()

    page_text = soup.get_text(" ", strip=True)

    trend = None
    trend_match = _TREND_RE.search(page_text)
    if trend_match:
        direction, pct, yesterday_price = trend_match.groups()
        trend = {
            "direction": direction.lower(),
            "change_pct": float(pct),
            "yesterday_price_per_quintal": int(yesterday_price.replace(",", "")),
        }

    week_trend = None
    week_match = _WEEK_RE.search(page_text)
    if week_match:
        week_avg, week_pct, week_dir = week_match.groups()
        week_trend = {
            "seven_day_average_per_quintal": int(week_avg.replace(",", "")),
            "change_pct": float(week_pct),
            "direction": week_dir.lower(),
        }

    districts = []
    for m in _DISTRICT_ROW_RE.finditer(page_text):
        d_name, apmc_n, date, best_market, best_price, avg_price = m.groups()
        districts.append({
            "district": d_name.strip(),
            "apmc_count": int(apmc_n),
            "reporting_date": date.strip(),
            "best_market": best_market.strip(),
            "best_price_per_quintal": int(best_price.replace(",", "")),
            "avg_price_per_quintal": int(avg_price.replace(",", "")),
        })

    result = {
        "state_average_price_per_quintal": int(state_price_qtl.replace(",", "")),
        "state_average_price_per_kg": float(state_price_kg),
        "apmc_count": int(apmc_count),
        "highest_price_per_quintal": int(highest_price.replace(",", "")),
        "highest_price_market": highest_market.strip(),
        "trend_vs_yesterday": trend,
        "trend_vs_last_week": week_trend,
        "district_breakdown": districts,
    }

    district_key = _resolve_district_key(district)
    if district_key and districts:
        match_row = next(
            (d for d in districts if district_key in d["district"].lower().replace(" ", "")),
            None,
        )
        if match_row:
            result["requested_district_data"] = match_row
        else:
            result["requested_district_note"] = (
                f"{district} isn't currently reporting for this crop -- "
                f"showing the Kerala state average instead."
            )

    return result