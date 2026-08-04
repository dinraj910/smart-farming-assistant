"""
Weather lookup tool -- wraps the Open-Meteo free weather API (no API key,
no signup, no billing). This is the "internal function from earlier backend
phases" the guide assumes already exists -- we're building it now.
"""
import httpx
from datetime import datetime, timedelta

# Kerala district reference coordinates (district HQ towns), used to query
# Open-Meteo. Good enough granularity for agricultural weather advice.
KERALA_DISTRICT_COORDS = {
    "thiruvananthapuram": (8.5241, 76.9366),
    "kollam": (8.8932, 76.6141),
    "pathanamthitta": (9.2648, 76.7870),
    "alappuzha": (9.4981, 76.3388),
    "kottayam": (9.5916, 76.5222),
    "idukki": (9.8497, 76.9681),
    "ernakulam": (9.9816, 76.2999),
    "thrissur": (10.5276, 76.2144),
    "palakkad": (10.7867, 76.6548),
    "malappuram": (11.0510, 76.0711),
    "kozhikode": (11.2588, 75.7804),
    "wayanad": (11.6854, 76.1320),
    "kannur": (11.8745, 75.3704),
    "kasaragod": (12.4996, 74.9869),
}

# Tiny in-memory cache (not persistent -- resets on server restart).
# Keeps you well under any reasonable rate limit and speeds up repeat
# questions about the same district within a session.
_cache: dict[str, tuple[datetime, dict]] = {}
_CACHE_TTL = timedelta(minutes=30)

# Open-Meteo's WMO weather codes -> plain language (only codes relevant to
# Kerala's tropical climate; no snow codes needed).
_WEATHER_CODES = {
    0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "fog", 48: "depositing rime fog",
    51: "light drizzle", 53: "moderate drizzle", 55: "dense drizzle",
    61: "slight rain", 63: "moderate rain", 65: "heavy rain",
    80: "slight rain showers", 81: "moderate rain showers", 82: "violent rain showers",
    95: "thunderstorm", 96: "thunderstorm with slight hail", 99: "thunderstorm with heavy hail",
}


def _describe_weather_code(code) -> str:
    return _WEATHER_CODES.get(code, "unknown")


def _resolve_district(district: str) -> tuple[float, float]:
    key = district.lower().strip().replace(" ", "")
    for name, coords in KERALA_DISTRICT_COORDS.items():
        if name in key or key in name:
            return coords
    # Unknown district name -> fall back to Ernakulam (roughly central
    # Kerala) rather than failing the whole tool call.
    return KERALA_DISTRICT_COORDS["ernakulam"]


async def run_weather_lookup(district: str, forecast_days: int = 3) -> dict:
    """
    Returns current conditions + a short daily forecast for a Kerala
    district. Called by the agent orchestrator's weather_lookup tool.
    """
    forecast_days = max(1, min(forecast_days, 7))
    cache_key = f"{district.lower()}:{forecast_days}"

    cached = _cache.get(cache_key)
    if cached and datetime.now() - cached[0] < _CACHE_TTL:
        return cached[1]

    lat, lon = _resolve_district(district)

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code",
        "timezone": "Asia/Kolkata",
        "forecast_days": forecast_days,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get("https://api.open-meteo.com/v1/forecast", params=params)
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, httpx.TimeoutException) as e:
            return {"error": f"Weather service unavailable: {e}"}

    current = data.get("current", {})
    daily = data.get("daily", {})

    result = {
        "district": district,
        "current": {
            "temperature_c": current.get("temperature_2m"),
            "humidity_pct": current.get("relative_humidity_2m"),
            "precipitation_mm": current.get("precipitation"),
            "wind_speed_kmh": current.get("wind_speed_10m"),
            "condition": _describe_weather_code(current.get("weather_code")),
        },
        "forecast": [
            {
                "date": daily["time"][i],
                "temp_max_c": daily["temperature_2m_max"][i],
                "temp_min_c": daily["temperature_2m_min"][i],
                "rain_mm": daily["precipitation_sum"][i],
                "rain_probability_pct": daily["precipitation_probability_max"][i],
                "condition": _describe_weather_code(daily["weather_code"][i]),
            }
            for i in range(len(daily.get("time", [])))
        ],
    }

    _cache[cache_key] = (datetime.now(), result)
    return result