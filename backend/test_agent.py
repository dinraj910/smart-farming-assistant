"""
Test script for the full Agent loop (Phase 8.2).
Run this script while the FastAPI server is running (e.g. uvicorn main:app --reload --host 0.0.0.0 --port 8000).
"""

import httpx
import asyncio
import json

BASE_URL = "http://localhost:8000/api/v1/agent/crop-advisory"

async def test_scenario(name: str, message: str):
    print(f"\n{'='*80}")
    print(f"Testing Scenario: {name}")
    print(f"Message: {message}")
    print(f"{'='*80}")
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                BASE_URL,
                json={"message": message}
            )
            response.raise_for_status()
            
            data = response.json()
            print("\nResponse from Agent:")
            print(json.dumps(data, indent=2))
            
    except Exception as e:
        print(f"\nError connecting to the agent endpoint: {e}")
        print("Make sure the backend server is running (uvicorn main:app --reload)!")

async def main():
    scenario_a_msg = (
        "My soil has N=40 P=30 K=35 pH=5.8, 1 acre in Kottayam. "
        "What should I plant, and what grows well alongside it?"
    )
    
    scenario_b_msg = (
        "Is my land in Wayanad suitable for growing cardamom, and when should I plant it?"
    )

    await test_scenario("Scenario A - Crop IN the training set", scenario_a_msg)
    await test_scenario("Scenario B - Crop OUTSIDE the training set", scenario_b_msg)

if __name__ == "__main__":
    asyncio.run(main())
