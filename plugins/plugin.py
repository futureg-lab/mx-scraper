from typing import Dict, Optional


class MxRequest:
    context: Dict[str, any]

    def fetch(url: str, context: Optional[Dict[str, any]]) -> bytes:
        pass
