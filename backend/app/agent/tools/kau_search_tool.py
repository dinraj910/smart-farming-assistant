"""
Embeds the incoming query, then asks Postgres (via pgvector) for the chunks
whose stored embeddings are closest by cosine distance. This is the tool
that lets the agent answer questions about crops outside Model 1's training
set -- pepper, cardamom, rubber, tapioca, etc.
"""

import os

import asyncpg

from app.rag.embed_utils import embed_text


async def search_kau_knowledge(query: str, top_k: int = 3):
    # Convert the user's query into an embedding vector
    query_vector = embed_text(query)

    # Convert the vector into pgvector's string format
    vector_str = "[" + ",".join(str(x) for x in query_vector) + "]"

    # Connect to the PostgreSQL database
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])

    try:
        rows = await conn.fetch(
            """
            SELECT
                content,
                source_page,
                1 - (embedding <=> $1::vector) AS similarity
            FROM kau_chunks
            ORDER BY embedding <=> $1::vector
            LIMIT $2
            """,
            vector_str,
            top_k,
        )

    finally:
        await conn.close()

    return [
        {
            "content": row["content"],
            "source_page": row["source_page"],
            "similarity": round(float(row["similarity"]), 3),
        }
        for row in rows
    ]