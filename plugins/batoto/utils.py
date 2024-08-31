import re
import json
from typing import List, Dict, Any, Tuple
from bs4 import BeautifulSoup

from plugin import MxRequest


def fetch_pages(
    chapter_identifier: str, base_url, request: MxRequest
) -> Tuple[str, List[Dict[str, Any]]]:
    chapter_id = parse_identifier(chapter_identifier)
    chapter_url = f"{base_url}/chapter/{chapter_id}"
    html = request.fetch(chapter_url)
    parser = BeautifulSoup(html, "html.parser")

    script_code = next(
        (script for script in parser.select("script") if "imgHttps" in script.text),
        None,
    ).text

    raw_pages = json.loads(
        re.search(r"const\s*imgHttps\s*=(.+?);", script_code).group(1)
    )

    pages = []
    for index, url in enumerate(raw_pages):
        ext = re.search(r'\.([A-Za-z0-9]+)$', url).group(1) or 'jpg'
        pages.append({
            "filename": f"{index + 1}.{ext}",
            "number": index + 1,
            "title": str(index + 1),
            "url": url,
        })

    return chapter_url, pages


def fetch_book(identifier: str, base_url: str, request: MxRequest) -> Dict[str, Any]:
    book_id = parse_identifier(identifier)
    book_url = f"{base_url}/series/{book_id}"
    html = request.fetch(book_url)
    parser = BeautifulSoup(html, "html.parser")

    # Title
    title = parser.title.string.strip()

    # Tags, authors,..
    meta_fields = [
        entry.get_text().strip().replace("\n", "").replace("\t", "").split(":")
        for entry in parser.select("div>div.attr-item")
    ]

    tags = []
    metadata = []
    authors = []
    seen_authors = set()

    for key, value in meta_fields:
        values = [v.strip() for v in value.split(",")]
        if re.search(r"author|artist", key, re.I):
            for name in values:
                if name not in seen_authors:
                    seen_authors.add(name)
                    authors.append({"name": name, "description": ""})
        elif re.search(r"genre|tag", key, re.I):
            tags.extend([{"name": name, "metadata": []} for name in values])
        else:
            metadata.append({"label": key.strip(), "content": value.strip()})

    # Description
    description = parser.select_one("#limit-height-body-summary").get_text().strip()

    # Chapters
    chapters = []
    for index, item in enumerate(reversed(parser.select("a.visited.chapt"))):
        rel_url = item["href"]
        text = item.get_text().replace("\n", "").replace("\t", "").strip()

        chapter_url, pages = fetch_pages(rel_url, base_url, request)
        chapters.append(
            {
                "title": text,
                "description": text,
                "number": index + 1,
                "pages": pages,
                "url": chapter_url,
            }
        )

    return {
        "title": title,
        "title_aliases": [],
        "source_id": book_id,
        "url": book_url,
        "authors": authors,
        "tags": tags,
        "description": description,
        "chapters": chapters,
        "metadata": metadata,
    }


def parse_identifier(identifier: str) -> str:
    match = re.search(r"(\d+)", identifier)
    if match:
        return match.group(1)
    raise ValueError(f"Could not retrieve id from {identifier}")
