import json
from typing import Dict, List, Tuple, Any
from example.other import read_book_from_file
from plugin import MxRequest


def mx_is_supported(term: str) -> Dict[str, Any]:
    # return roulette()
    return term != "a" and term != "b"


# Checked first
def mx_get_urls(term: str, req: MxRequest) -> Tuple[str, str, List[str], List[str]]:
    bug_img = "https://wikimediafoundation.org/wp-content/uploads/2023/12/%D0%96%D1%83%D0%BA_%D1%81%D1%82%D1%80%D0%B8%D0%B1%D1%83%D0%BD.jpg"
    return {
        "title": f"Some nice title from \"{term}\"",
        "url_source": "https://wikimediafoundation.org/news/2023/12/13/birds-bugs-and-beauty-the-winners-of-wiki-loves-earth-2023/",
        "urls": [bug_img, bug_img, bug_img, bug_img],
        "tags": ["tag1", "tag2"],
    }

# Checked second
# def mx_get_book(term: str, req: MxRequest) -> Dict[str, Any]:
    # content = read_book_from_file()
    # print("Context", req.context)

    # print("Config context", len(req.fetch("http://example.com").decode('utf-8')))
    # print("Custom context tere", len(req.fetch("http://example.com", req.context).decode('utf-8')))

    # # print(req.fetch("http://example.com"))
    # return json.loads(content)
