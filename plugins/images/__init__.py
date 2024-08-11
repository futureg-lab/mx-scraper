from typing import Dict, List, Tuple, Any
from plugin import MxRequest
from images.utils import extract_images_and_title

"""
This will collect all imag from an url.
Requires bs4 installed:

pip install beautifulsoup4
"""

PREFIX = "img:"

def mx_is_supported(term: str) -> Dict[str, Any]:
    return term.startswith(PREFIX)

def mx_get_urls(term: str, req: MxRequest) -> Tuple[str, str, List[str], List[str]]:
    url = term.removeprefix(PREFIX)
    title, images = extract_images_and_title(url, req)
    return {
        "title": title,
        "url_source": url,
        "urls": images,
        "tags": ["tag1", "tag2"],
    }
