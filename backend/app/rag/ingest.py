"""
One-time script: extracts text from the KAU PDF, splits it into overlapping
chunks, and returns them ready for embedding. Run manually, not on every
server startup -- see Phase 2 Step 2.5 for how to run this.
"""

import fitz # PyMuPDF

CHUNK_SIZE = 800 # characters per chunk
CHUNK_OVERLAP = 150 # overlap so a fact split across a chunk boundary isn’t lost

def extract_and_chunk(pdf_path: str):

    doc = fitz.open(pdf_path)
    chunks = []

    for page_num, page in enumerate(doc, start=1):

        text = page.get_text().strip()
        if not text:
            continue
        
        start = 0
        while start < len(text):

            end = start + CHUNK_SIZE
            chunk_text = text[start:end].strip()

            if len(chunk_text) > 50: # skip near-empty fragments
                chunks.append({"content": chunk_text, "source_page": page_num})
                start += CHUNK_SIZE - CHUNK_OVERLAP

    doc.close()
    print(f"Extracted {len(chunks)} chunks from {pdf_path}")
    return chunks




    