import json
from typing import Dict, List, Tuple, Any
from example.other import read_book_from_file
from plugin import MxRequest


def mx_is_supported(term: str) -> Dict[str, Any]:
    # return roulette()
    return term != "a" and term != "b"


# Checked first
# def mx_get_urls(term: str) -> Tuple[str, str, List[str], List[str]]:
#     return {
#         "title": "Some nice title",
#         "url_source": "http://url1/dog",
#         "urls": ["http://url1/dog", "http://url2/cat.jpg"],
#         "tags": ["tag1", "tagdsdsdsdsd2", "tag3"],
#     }

# Checked second
def mx_get_book(term: str, req: MxRequest) -> Dict[str, Any]:
    content = read_book_from_file()
    print("Context", req.context)

    print("Config context", len(req.fetch("http://example.com").decode('utf-8')))
    print("Custom context tere", len(req.fetch("http://example.com", req.context).decode('utf-8')))

    # print(req.fetch("http://example.com"))
    return json.loads(content)
