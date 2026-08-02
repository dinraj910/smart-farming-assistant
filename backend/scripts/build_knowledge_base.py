"""
Run this ONCE to populate kau_chunks.

Re-run only if the source PDF changes.

Usage:
    python scripts/build_knowledge_base.py
"""

import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, PROJECT_ROOT)

import asyncio
import asyncpg
from dotenv import load_dotenv

from app.rag.ingest import extract_and_chunk
from app.rag.embed_utils import embed_text

# Load environment variables from .env
load_dotenv()


async def main():
    # Extract text chunks from the KAU PDF
    chunks = extract_and_chunk("data/kau_pop.pdf")

    # Connect to the Neon PostgreSQL database
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise ValueError("DATABASE_URL not found in .env file")

    conn = await asyncpg.connect(database_url)

    # Clear old data if the script is re-run
    await conn.execute(
        "TRUNCATE TABLE kau_chunks RESTART IDENTITY;"
    )

    # Generate embeddings and store them
    for i, chunk in enumerate(chunks):
        vector = embed_text(chunk["content"])

        # Convert embedding list into pgvector format
        vector_str = "[" + ",".join(str(x) for x in vector) + "]"

        await conn.execute(
            """
            INSERT INTO kau_chunks (
                content,
                source_page,
                embedding
            )
            VALUES (
                $1,
                $2,
                $3::vector
            )
            """,
            chunk["content"],
            chunk["source_page"],
            vector_str,
        )

        if i % 50 == 0:
            print(f"Inserted {i}/{len(chunks)} chunks...")

    await conn.close()

    print("Knowledge base build complete.")


if __name__ == "__main__":
    asyncio.run(main())









