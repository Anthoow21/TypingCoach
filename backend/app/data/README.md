French word bank

This directory stores the local French word bank used by Typing Coach.

Main file:
- `francais_formatte.json`

Expected JSON shape:

```json
[
  {
    "word": "bonjour",
    "frequency": 1234.56,
    "length": 7,
    "bigrams": ["bo", "on", "nj", "jo", "ou", "ur"],
    "lemma": "bonjour",
    "pos": "NOM"
  }
]
```

This file is versioned in the project so adaptive training works without
downloading any external dataset at runtime.
