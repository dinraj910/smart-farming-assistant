import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def test():
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    print("Connected successfully!")
    version = await conn.fetchval("SELECT version();")
    print(version)
    await conn.close()

asyncio.run(test())