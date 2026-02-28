import re
from dataclasses import dataclass

from app.config import settings


@dataclass
class Chunk:
    text: str
    page_numbers: list[int]
    chunk_index: int


def chunk_pages(pages: list[dict]) -> list[Chunk]:
    """
    Split page texts into overlapping chunks that respect sentence boundaries.
    Each page dict has {"page": int, "text": str}.
    """
    # Build a flat list of (char, page_number) so we can track provenance
    chars: list[tuple[str, int]] = []
    for page in pages:
        for ch in page["text"]:
            chars.append((ch, page["page"]))
        chars.append((" ", page["page"]))  # space between pages

    full_text = "".join(c for c, _ in chars)
    if not full_text.strip():
        return []

    # Find sentence boundaries
    sentence_ends = [m.end() for m in re.finditer(r'[.!?]\s+', full_text)]
    if not sentence_ends or sentence_ends[-1] < len(full_text):
        sentence_ends.append(len(full_text))

    chunks: list[Chunk] = []
    start = 0
    chunk_idx = 0

    while start < len(full_text):
        end = start + settings.chunk_size

        if end >= len(full_text):
            end = len(full_text)
        else:
            # Snap to nearest sentence boundary
            best = None
            for se in sentence_ends:
                if se <= end and se > start:
                    best = se
            if best and best > start + settings.chunk_size // 2:
                end = best

        chunk_text = full_text[start:end].strip()
        if chunk_text:
            page_nums = sorted(set(chars[i][1] for i in range(start, min(end, len(chars)))))
            chunks.append(Chunk(text=chunk_text, page_numbers=page_nums, chunk_index=chunk_idx))
            chunk_idx += 1

        start = end - settings.chunk_overlap
        if start >= len(full_text) or end == len(full_text):
            break

    return chunks
