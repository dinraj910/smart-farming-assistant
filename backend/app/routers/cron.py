"""
Cron and Keep-Alive Router
Used by external cron schedulers (e.g., cron-job.org, UptimeRobot, GitHub Actions)
to prevent Render free-tier sleep and run periodic maintenance.
"""

from datetime import datetime
import time
from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()

START_TIME = time.time()


class CronStatusResponse(BaseModel):
    status: str
    timestamp: str
    uptime_seconds: float
    database: str
    message: str


@router.get("/keep-alive", response_model=CronStatusResponse)
async def keep_alive(request: Request):
    """
    Keep-Alive endpoint for cron pingers (e.g. cron-job.org scheduled every 10-14 mins).
    Pings the database to keep connection pools fresh and prevents Render free container spin-down.
    """
    db_status = "unknown"
    try:
        db = getattr(request.app.state, "db", None)
        if db and db.is_connected():
            # Quick lightweight query to keep PostgreSQL connection active
            await db.query_raw("SELECT 1")
            db_status = "connected"
        else:
            db_status = "disconnected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    uptime = round(time.time() - START_TIME, 2)

    return CronStatusResponse(
        status="alive",
        timestamp=datetime.utcnow().isoformat() + "Z",
        uptime_seconds=uptime,
        database=db_status,
        message="Service is warm and active. Ready for farmer requests.",
    )


@router.get("/ping")
async def ping():
    """
    Ultra-lightweight ping endpoint for high-frequency uptime monitoring.
    """
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/sync-mandi")
async def sync_mandi():
    """
    Optional periodic cron task to pre-warm the Agmarknet Mandi market prices cache.
    """
    try:
        from app.routers.market import fetch_kerala_mandi_data
        records = await fetch_kerala_mandi_data()
        return {
            "status": "success",
            "message": f"Mandi price cache refreshed with {len(records)} records.",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        return {
            "status": "warning",
            "message": f"Could not sync mandi data: {str(e)}",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
