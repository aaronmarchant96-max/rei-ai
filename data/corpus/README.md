# REI Evaluation Corpus

Immutable evaluation datasets for reproducible REI Engine benchmarking.

## D1 — Scientific Literature

`REI-D1-corpus.json` — 30 frozen arXiv papers for long-context generation and CARDO GUARD validation.

| Detail | Value |
|--------|-------|
| Snapshot date | August 1, 2026 |
| Source | arXiv API v2 — cs.AI, cs.CL, physics, q-bio |
| Papers | 30 (10 biomedical, 10 cs/ai, 10 physics) |
| Selection | Programmatic filter (200) → manual curation (30) |
| Complexity gates | Citation-dense, quantitative claims, long reasoning chains |

Full paper text lives in `d1-XXX.txt` files. The JSON is metadata only — 15KB index.
Each paper is SHA-256 hashed for integrity verification.

## D2 — Genealogical Records (planned)

`REI-D2-corpus.json` — Marchant Family Archive primary sources: military pay vouchers,
census records, parish registers, letters, birth/death certificates.

## Populating the Corpus

### D1 Script (Python, run on Aug 1, 2026)

```python
import arxiv  # v4.0.0+
import hashlib
import json
import time

# 1. Pull 200 candidates from arXiv
categories = ["cs.AI", "cs.CL", "physics", "q-bio"]
papers = []
for cat in categories:
    search = arxiv.Search(
        query=f"cat:{cat}",
        max_results=50,
        sort_by=arxiv.SortCriterion.SubmittedDate
    )
    for result in search.results():
        papers.append(result)
        time.sleep(0.35)  # respect 3 req/s rate limit

# 2. Filter by length (>8 pages) and recency (Jan-Jul 2026)
filtered = [p for p in papers if p.pdf_url and page_count(p) > 8]

# 3. Manual curation → select 30, populate REI-D1-corpus.json
# 4. Download full text → save to data/corpus/d1-XXX.txt
# 5. SHA-256 hash each file, update JSON
```

## Directory Structure

```
data/corpus/
├── README.md
├── d1-001.txt          ← full paper text (populated Aug 1)
├── d1-002.txt
└── ...
```
