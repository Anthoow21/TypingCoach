import json
from functools import lru_cache
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DEFAULT_WORD_BANK_PATH = DATA_DIR / "francais_formatte.json"


@lru_cache(maxsize=1)
def load_french_word_bank(path: str | None = None) -> list[dict]:
    word_bank_path = Path(path) if path else DEFAULT_WORD_BANK_PATH

    if not word_bank_path.exists():
        return []

    with word_bank_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    if not isinstance(payload, list):
        return []

    return payload


def clear_french_word_bank_cache() -> None:
    load_french_word_bank.cache_clear()
