from typing import Dict, Optional

# TODO:
# [x] reqwest wrapper
# [ ] afQuery wrapper

class MxRequest:
    context: Dict[str, any]
    def fetch(url: str, context: Optional[Dict[str, any]]) -> bytes:
        pass
