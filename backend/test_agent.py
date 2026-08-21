"""
Test script for the full Agent loop with Chat Memory.
Run this script while the FastAPI server is running (e.g. uvicorn main:app --reload --host 0.0.0.0 --port 8000).
"""

import httpx
import asyncio
import json

BASE_URL = "http://localhost:8000/api/v1"

async def test_session():
    print(f"\n{'='*80}")
    print("Testing Multi-Turn Chat Session (Memory Feature)")
    print(f"{'='*80}")
    
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Turn 1: Initial query (No session_id, backend will create one)
            msg_1 = "My soil has N=80 P=90 K=88 pH=9, 1 acre in Kottayam. what should i plant?  "
            print(f"\n[Turn 1] User: {msg_1}")
            
            resp_1 = await client.post(
                f"{BASE_URL}/agent/crop-advisory",
                json={"message": msg_1}
            )
            resp_1.raise_for_status()
            data_1 = resp_1.json()
            
            session_id = data_1.get("session_id")
            
            trace_1 = data_1.get("reasoning_trace", [])
            if trace_1:
                print(f"\n[Turn 1] Tools Called:")
                for t in trace_1:
                    print(f"  - {t['tool']} {t['arguments']}")

            print(f"\n[Turn 1] Agent Answer (Session ID: {session_id}):\n{data_1.get('answer')}")
            
            if not session_id:
                print("FAILED: No session_id returned by agent.")
                return

            # Turn 2: Follow-up query using the same session_id
            msg_2 = "What is the best fertilizer for this plant and what is the market price of it in 6 months?"
            print(f"\n[Turn 2] User: {msg_2}")
            print(f"(Sending with session_id: {session_id})")
            
            resp_2 = await client.post(
                f"{BASE_URL}/agent/crop-advisory",
                json={
                    "message": msg_2,
                    "session_id": session_id
                }
            )
            resp_2.raise_for_status()
            data_2 = resp_2.json()
            
            trace_2 = data_2.get("reasoning_trace", [])
            if trace_2:
                print(f"\n[Turn 2] Tools Called:")
                for t in trace_2:
                    print(f"  - {t['tool']} {t['arguments']}")

            print(f"\n[Turn 2] Agent Answer:\n{data_2.get('answer')}")

            # Turn 3: Verify the sessions endpoint can fetch history
            print(f"\n{'='*80}")
            print("Testing /agent/sessions endpoint history retrieval")
            print(f"{'='*80}")
            
            # Note: We didn't supply farm_id in the previous requests, so it created an anonymous session.
            # We can't query by farm_id easily without supplying it first, so let's simulate a new session with farm_id
            farm_id = "test-farm-123"
            print(f"\nCreating/Fetching session for farm: {farm_id}")
            
            resp_3 = await client.post(
                f"{BASE_URL}/agent/sessions",
                json={"farm_id": farm_id}
            )
            resp_3.raise_for_status()
            data_3 = resp_3.json()
            
            print(f"\nSession Endpoint Response:\n{json.dumps(data_3, indent=2)}")

    except httpx.HTTPStatusError as e:
        print(f"\nServer returned HTTP {e.response.status_code}")
        print(f"Error details from server: {e.response.text}")
    except Exception as e:
        import traceback
        print(f"\nError connecting to the endpoints:")
        traceback.print_exc()
        print("Make sure the backend server is running (uvicorn main:app --reload)!")

async def main():
    await test_session()

if __name__ == "__main__":
    asyncio.run(main())
