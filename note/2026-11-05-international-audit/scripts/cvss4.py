#!/usr/bin/env python3
"""Score CVSS v4.0 vectors: python3 cvss4.py 'CVSS:4.0/AV:N/...' (needs `pip install cvss`)."""
import sys
from cvss import CVSS4
for v in sys.argv[1:]:
    c = CVSS4(v); print(f"{c.base_score:>4}  {c.severity:<8} {v}")
