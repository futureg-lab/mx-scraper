import json
from typing import Dict, List, Tuple, Any
from example.other import read_book_from_file
from plugin import some_root_fn


# Checked first
def mx_is_supported(term) -> Dict[str, Any]:
    return some_root_fn(term)


# Checked first if defined
# def mx_get_urls(term: str) -> Tuple[str, str, List[str], List[str]]:
#     return {
#         "title": "Some nice title",
#         "url_source": "http://url1/dog",
#         "urls": ["http://url1/dog", "http://url2/cat.jpg"],
#         "tags": ["tag1", "tag2", "tag3"],
#     }


# Checked after
def mx_get_book(term, req) -> Dict[str, Any]:
    content = read_book_from_file()
    return json.loads(content)
