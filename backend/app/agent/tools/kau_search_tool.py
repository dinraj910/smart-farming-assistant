"""
Semantic and keyword search over Kerala Agricultural University's Package of Practices.
Uses fast and memory-efficient SQL ranking over kau_chunks to run seamlessly on 512MB RAM cloud environments (Render) without OOM crashes.
"""
import re
from prisma import Prisma

async def search_kau_knowledge(db: Prisma, query: str, top_k: int = 3):
    # 1. Clean query and extract key agricultural terms
    words = [re.sub(r'[^a-zA-Z0-9]', '', w).lower() for w in query.split()]
    stopwords = {
        'what', 'is', 'the', 'for', 'in', 'kerala', 'according', 'to', 'kau', 'and', 'or',
        'a', 'an', 'of', 'how', 'much', 'can', 'you', 'give', 'me', 'tell', 'about',
        'details', 'please', 'with', 'from', 'this', 'that', 'then'
    }
    keywords = [w for w in words if w and len(w) > 2 and w not in stopwords]

    if not keywords:
        keywords = [w for w in words if w and len(w) > 2]
    if not keywords:
        keywords = ["cultivation"]

    # Synonyms / related terms
    expanded = list(keywords)
    if "paddy" in keywords and "rice" not in keywords:
        expanded.append("rice")
    elif "rice" in keywords and "paddy" not in keywords:
        expanded.append("paddy")

    safe_keywords = [re.sub(r'[^a-zA-Z0-9]', '', kw) for kw in expanded if kw]
    if not safe_keywords:
        safe_keywords = ["cultivation"]

    where_parts = [f"content ILIKE '%{kw}%'" for kw in safe_keywords]
    where_clause = " OR ".join(where_parts)

    score_parts = [f"(CASE WHEN content ILIKE '%{kw}%' THEN 1 ELSE 0 END)" for kw in safe_keywords]
    score_clause = " + ".join(score_parts)

    sql = f"""
        SELECT content, source_page, ({score_clause}) AS score
        FROM kau_chunks
        WHERE {where_clause}
        ORDER BY score DESC, length(content) ASC
        LIMIT {top_k};
    """

    try:
        rows = await db.query_raw(sql)
        return [
            {
                "content": row["content"],
                "source_page": row["source_page"],
                "similarity": round(min(1.0, float(row.get("score", 1)) / max(1, len(keywords))), 3),
            }
            for row in rows
        ]
    except Exception as e:
        print(f"SQL search failed in kau_search_tool: {e}")
        # Fallback to simple ILIKE
        try:
            fallback = await db.query_raw(
                f"SELECT content, source_page FROM kau_chunks WHERE content ILIKE '%{safe_keywords[0]}%' LIMIT {top_k};"
            )
            return [
                {
                    "content": row["content"],
                    "source_page": row["source_page"],
                    "similarity": 0.5,
                }
                for row in fallback
            ]
        except Exception:
            return []