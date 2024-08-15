from typing import Dict, List, Tuple, Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from plugin import MxRequest

"""
This will collect all images from an url.
Requires bs4 installed:

pip install beautifulsoup4
"""

PREFIX = "img:"


def mx_is_supported(term: str) -> Dict[str, Any]:
    return term.startswith(PREFIX)


def mx_get_urls(term: str, req: MxRequest) -> Tuple[str, str, List[str], List[str]]:
    url = term.removeprefix(PREFIX)
    response = req.fetch(url).decode("utf-8")
    soup = BeautifulSoup(response, "html.parser")
    title = soup.title.string if soup.title else "No title found"
    img_sources = [
        urljoin(url, img["src"]) for img in soup.find_all("img") if "src" in img.attrs
    ]

    return {
        "title": title,
        "url_source": url,
        "urls": img_sources,
        "tags": [],
    }
