from typing import Dict, Any
from plugin import MxRequest
from batoto.utils import fetch_book

PREFIX = "to:"
DOMAINS = ["https://mto.to", "https://xbato.com"]


def pick_base(term: str):
    for base in DOMAINS:
        if term.startswith(base):
            return base
    return None


def mx_is_supported(term: str):
    return term.startswith(PREFIX) or pick_base(term.removeprefix(PREFIX)) is not None


def mx_get_book(term: str, req: MxRequest) -> Dict[str, Any]:
    term = term.removeprefix(PREFIX)
    base = pick_base(term)
    return fetch_book(term, base, req)
