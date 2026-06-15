from weasyprint import HTML


def render_html_to_pdf(html: str) -> bytes:
    return HTML(string=html).write_pdf()
