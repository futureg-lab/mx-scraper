import json
from typing import Dict, List, Tuple, Any
from example.other import read_book_from_file
from plugin import roulette


# Checked first
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


# Checked first
def mx_get_book(term: str) -> Dict[str, Any]:
    content = read_book_from_file()
    # print(content)
    return json.loads(content)
