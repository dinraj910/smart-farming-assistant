import fitz

CHUNK_SIZE = 800
CHUNK_OVERLAP = 150


def extract_and_chunk(pdf_path: str):
    print(f"Opening PDF: {pdf_path}")

    doc = fitz.open(pdf_path)

    print(f"PDF opened successfully.")
    print(f"Total pages: {len(doc)}")

    chunks = []

    for page_num, page in enumerate(doc, start=1):

        if page_num % 20 == 0:
            print(f"Processing page {page_num}/{len(doc)}")

        text = page.get_text().strip()

        if not text:
            continue

        start = 0

        while start < len(text):
            end = start + CHUNK_SIZE

            chunk_text = text[start:end].strip()

            if len(chunk_text) > 50:
                chunks.append({
                    "content": chunk_text,
                    "source_page": page_num,
                })

            start += CHUNK_SIZE - CHUNK_OVERLAP

    doc.close()

    print(f"Extracted {len(chunks)} chunks")

    return chunks