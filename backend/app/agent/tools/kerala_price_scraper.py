"""
Live scraper for commodityonline.com's Kerala mandi price pages -- this is
the only source found so far with genuine Kerala DISTRICT-level pricing for
plantation crops (coconut, pepper, cardamom, etc.) that Agmarknet doesn't
cover for Kerala. See market_tool.py for how this fits as Tier 0, ahead of
the Agmarknet-based tiers.

IMPORTANT: this is a private commercial site, not a government open-data
API. There is no published data contract -- if they redesign their page,
this scraper can silently return nothing (it's built to fail safe, not to
crash). Treat this as a best-effort live source layered on top of the
Agmarknet fallback chain, not a sole dependency.
"""
import re
import httpx
from bs4 import BeautifulSoup

BASE = "https://www.commodityonline.com/mandiprices"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    )
}

# Our internal crop key -> commodityonline's URL slug. Verified against the
# site's own "Select Commodity" list. Extend as you test more crops.
COMMODITYONLINE_SLUGS = {
    "coconut": "coconut",
    "banana": "banana",
    "pepper": "black-pepper",
    "black pepper": "black-pepper",
    "cardamom": "cardamom",
    "rubber": "rubber",
    "arecanut": "arecanut-betelnut-supari",
    "cocoa": "cocoa",
    "tapioca": "tapioca",
    "cassava": "tapioca",
    "jackfruit": "jack-fruit",
    "ginger": "ginger-green",
    "rice": "rice",
    "maize": "maize",
    "turmeric": "turmeric",
}

# Our internal district key (matches weather_tool.py's KERALA_DISTRICT_COORDS
# keys) -> commodityonline's URL slug. Most are identical; a couple differ.
KERALA_DISTRICT_SLUGS = {
    "thiruvananthapuram": "thiruvananthapuram",
    "kollam": "kollam",
    "pathanamthitta": "pathanamthitta",
    "alappuzha": "alappuzha",
    "kottayam": "kottayam",
    "idukki": "idukki",
    "ernakulam": "ernakulam",
    "thrissur": "thrissur",
    "palakkad": "palakkad",
    "malappuram": "malappuram",
    "kozhikode": "kozhikode-calicut",
    "wayanad": "wayanad",
    "kannur": "kannur",
    "kasaragod": "kasargod",
}

_PRICE_RE = re.compile(r"Rs\s*([\d,]+)\s*/\s*Quintal", re.IGNORECASE)


def _resolve_slug(commodity: str) -> str:
    key = commodity.lower().strip()
    if key in COMMODITYONLINE_SLUGS:
        return COMMODITYONLINE_SLUGS[key]
    for k, v in COMMODITYONLINE_SLUGS.items():
        if key in k or k in key:
            return v
    # Best-effort generic fallback -- may or may not resolve to a real page.
    return re.sub(r"[^a-z0-9]+", "-", key).strip("-")


def _resolve_district_slug(district: str | None) -> str | None:
    if not district:
        return None
    key = district.lower().strip().replace(" ", "")
    for k, v in KERALA_DISTRICT_SLUGS.items():
        if key in k or k in key:
            return v
    return None


async def scrape_kerala_prices(commodity: str, district: str | None = None) -> list[dict] | None:
    """
    Returns a list of price records scraped live from commodityonline.com,
    or None if the scrape failed/found nothing -- callers should treat None
    as "this tier didn't work, fall through to the next one", not an error.
    """
    commodity_slug = _resolve_slug(commodity)
    district_slug = _resolve_district_slug(district)

    if district_slug:
        url = f"{BASE}/district/kerala/{district_slug}/{commodity_slug}"
    else:
        url = f"{BASE}/{commodity_slug}/kerala"

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

    records = []
    # Every valid data row has a link to a district page -- use that as the
    # anchor to reliably find real price rows amid all the site's other
    # markup, rather than guessing at table/class names that may change.
    district_links = soup.find_all("a", href=re.compile(r"/mandiprices/district/kerala/"))

    for link in district_links:
        row = link.find_parent("tr")
        if row is None:
            continue
        cells = row.find_all("td")
        if len(cells) < 8:
            continue

        cell_texts = [c.get_text(strip=True) for c in cells]
        prices = _PRICE_RE.findall(row.get_text())
        if len(prices) < 3:
            continue

        try:
            min_p, max_p, avg_p = (int(p.replace(",", "")) for p in prices[:3])
        except ValueError:
            continue

        records.append({
            "commodity": cell_texts[0] if len(cell_texts) > 0 else commodity,
            "arrival_date": cell_texts[1] if len(cell_texts) > 1 else None,
            "variety": cell_texts[2] if len(cell_texts) > 2 else None,
            "district": link.get_text(strip=True),
            "market": cell_texts[5] if len(cell_texts) > 5 else None,
            "min_price_per_quintal": min_p,
            "max_price_per_quintal": max_p,
            "modal_price_per_quintal": avg_p,
            "modal_price_per_kg": round(avg_p / 100, 2),
        })

    return records if records else None