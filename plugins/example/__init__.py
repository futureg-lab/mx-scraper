import json
from typing import Dict, List, Tuple, Any
from plugin import MxRequest


def mx_is_supported(term: str) -> Dict[str, Any]:
    return term == "example"


# Checked first
def mx_get_urls(term: str, req: MxRequest):
    bug_img = "https://wikimediafoundation.org/wp-content/uploads/2023/12/%D0%96%D1%83%D0%BA_%D1%81%D1%82%D1%80%D0%B8%D0%B1%D1%83%D0%BD.jpg"
    return {
        "title": f'Some nice title from "{term}"',
        "url_source": "https://wikimediafoundation.org/news/2023/12/13/birds-bugs-and-beauty-the-winners-of-wiki-loves-earth-2023/",
        "urls": [bug_img, bug_img, bug_img, bug_img],
        "tags": ["tag1", "tag2"],
    }


# Checked second
# def mx_get_book(term: str, req: MxRequest):
#    pass
