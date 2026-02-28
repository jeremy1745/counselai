from datetime import datetime, timezone

from fpdf import FPDF

from app.models.case import Case
from app.models.conversation import Conversation
from app.models.message import Message


def _collect_citations(messages: list[Message]) -> list[dict]:
    """Deduplicate citations across all messages, preserving order."""
    seen: set[tuple[str, int]] = set()
    citations: list[dict] = []
    for msg in messages:
        if msg.role != "assistant" or not isinstance(msg.citations, list):
            continue
        for c in msg.citations:
            key = (c.get("document_name", ""), c.get("source_index", 0))
            if key not in seen:
                seen.add(key)
                citations.append(c)
    return citations


def generate_markdown(
    conversation: Conversation, case: Case, messages: list[Message]
) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: list[str] = []
    lines.append(f"# {conversation.title}")
    lines.append(f"**Case:** {case.name} | **Exported:** {now}")
    lines.append("")
    lines.append("---")
    lines.append("")

    for msg in messages:
        label = "You" if msg.role == "user" else "CAISE"
        lines.append(f"**{label}:** {msg.content}")
        lines.append("")

    citations = _collect_citations(messages)
    if citations:
        lines.append("---")
        lines.append("")
        lines.append("## Citations")
        lines.append("")
        lines.append("| # | Document | Pages | Excerpt |")
        lines.append("|---|----------|-------|---------|")
        for c in citations:
            idx = c.get("source_index", "")
            doc = c.get("document_name", "")
            pages = ", ".join(str(p) for p in c.get("page_numbers", []))
            snippet = c.get("snippet", "")[:120].replace("|", "\\|").replace("\n", " ")
            lines.append(f"| {idx} | {doc} | {pages} | {snippet} |")
        lines.append("")

    return "\n".join(lines)


def generate_pdf(
    conversation: Conversation, case: Case, messages: list[Message]
) -> bytes:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Header
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, conversation.title, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, f"Case: {case.name}  |  Exported: {now}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)

    pdf.ln(4)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(6)

    # Messages
    for msg in messages:
        if msg.role == "user":
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(0, 6, "You:", new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(79, 70, 229)  # indigo-600
            pdf.cell(0, 6, "CAISE:", new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)

        pdf.set_font("Helvetica", "", 10)
        # Replace unsupported characters for the built-in font
        safe_content = msg.content.encode("latin-1", errors="replace").decode("latin-1")
        pdf.multi_cell(0, 5, safe_content)
        pdf.ln(4)

    # Citations table
    citations = _collect_citations(messages)
    if citations:
        pdf.ln(2)
        pdf.set_draw_color(200, 200, 200)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(6)

        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 8, "Citations", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        # Table header
        col_w = [12, 55, 25, 98]
        row_h = 7
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(241, 245, 249)  # slate-100
        pdf.cell(col_w[0], row_h, "#", border=1, fill=True)
        pdf.cell(col_w[1], row_h, "Document", border=1, fill=True)
        pdf.cell(col_w[2], row_h, "Pages", border=1, fill=True)
        pdf.cell(col_w[3], row_h, "Excerpt", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "", 8)
        for c in citations:
            idx = str(c.get("source_index", ""))
            doc = c.get("document_name", "")[:30]
            pages = ", ".join(str(p) for p in c.get("page_numbers", []))
            snippet = c.get("snippet", "").replace("\n", " ")
            safe_snippet = snippet.encode("latin-1", errors="replace").decode("latin-1")
            safe_doc = doc.encode("latin-1", errors="replace").decode("latin-1")

            # Calculate the height needed for the excerpt multi_cell
            x_start = pdf.get_x()
            y_start = pdf.get_y()

            # Measure excerpt height by rendering it off-screen
            pdf.set_xy(x_start + col_w[0] + col_w[1] + col_w[2], y_start)
            pdf.multi_cell(col_w[3], 5, safe_snippet, border=0, split_only=True)
            # Count lines to determine row height
            lines = pdf.multi_cell(col_w[3], 5, safe_snippet, border=0, split_only=True)
            line_count = len(lines) if lines else 1
            computed_row_h = max(6, line_count * 5)

            # Reset position and draw the row
            pdf.set_xy(x_start, y_start)

            # Draw bordered cells for first 3 columns at the computed height
            # Use cell for fixed-width columns, manually draw borders
            pdf.cell(col_w[0], computed_row_h, idx, border=1)
            pdf.cell(col_w[1], computed_row_h, safe_doc, border=1)
            pdf.cell(col_w[2], computed_row_h, pages, border=1)

            # Draw the excerpt with multi_cell for wrapping
            excerpt_x = pdf.get_x()
            excerpt_y = pdf.get_y()
            # Draw border rect manually, then fill with multi_cell
            pdf.rect(excerpt_x, excerpt_y, col_w[3], computed_row_h)
            pdf.set_xy(excerpt_x + 1, excerpt_y + 0.5)
            pdf.multi_cell(col_w[3] - 2, 5, safe_snippet, border=0)
            pdf.set_xy(x_start, y_start + computed_row_h)

    return bytes(pdf.output())
