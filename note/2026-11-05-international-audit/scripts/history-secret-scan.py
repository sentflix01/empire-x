#!/usr/bin/env python3
"""
Scans every added line in the full git history for well-known credential
formats. Prints commit, file and rule only — never the matched value.

  python3 -I note/2026-11-05-international-audit/scripts/history-secret-scan.py > evidence/wave2/history-secret-scan.txt

A dedicated scanner (gitleaks/trufflehog) in CI is still recommended; this
script is a stop-gap with a smaller rule set.
"""
import re, subprocess, sys
from collections import Counter

RULES = {
    "aws-access-key": r"\b(AKIA|ASIA)[0-9A-Z]{16}\b",
    "stripe-live-secret": r"\b(sk|rk)_live_[0-9a-zA-Z]{20,}",
    "stripe-test-secret": r"\b(sk|rk)_test_[0-9a-zA-Z]{20,}",
    "stripe-webhook-secret": r"\bwhsec_[0-9a-zA-Z]{20,}",
    "github-token": r"\b(ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{36}\b|\bgithub_pat_[0-9A-Za-z_]{40,}",
    "slack-token": r"\bxox[baprs]-[0-9A-Za-z-]{10,}",
    "google-api-key": r"\bAIza[0-9A-Za-z_\-]{35}\b",
    "private-key-block": r"-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY",
    "openai-key": r"\bsk-(proj-)?[A-Za-z0-9_\-]{32,}",
    "anthropic-key": r"\bsk-ant-[A-Za-z0-9_\-]{20,}",
    "resend-key": r"\bre_[A-Za-z0-9]{8}_[A-Za-z0-9]{16,}",
    "chapa-secret": r"\bCHASECK(_TEST)?-[A-Za-z0-9]{20,}",
    "telegram-bot-token": r"\b\d{8,10}:AA[0-9A-Za-z_\-]{33}\b",
    "db-url-with-password": r"postgres(ql)?://[^:\s/'\"]+:[^@\s'\"]{6,}@(?!localhost|127\.0\.0\.1|postgres[:/]|db[:/]|\$\{)[A-Za-z0-9.\-]+",
    "jwt": r"\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}",
}
PLACEHOLDER = re.compile(r"(x{4,}|X{4,}|placeholder|example|your[_-]|<[^>]+>|changeme|dummy|fake|test_ci|\.\.\.)", re.I)
compiled = {k: re.compile(v) for k, v in RULES.items()}

proc = subprocess.Popen(["git", "log", "--all", "-p", "--no-color", "--unified=0", "--format=COMMIT %H %ad", "--date=short"],
                        stdout=subprocess.PIPE, text=True, errors="replace")
commit = date = path = None
hits, seen = [], set()
for line in proc.stdout:
    if line.startswith("COMMIT "):
        _, commit, date = line.split()[:3]; continue
    if line.startswith("+++ "):
        path = line[6:].strip() if line.startswith("+++ b/") else None; continue
    if not line.startswith("+") or line.startswith("+++") or path is None:
        continue
    for rule, rx in compiled.items():
        m = rx.search(line)
        if not m or PLACEHOLDER.search(m.group(0)) or PLACEHOLDER.search(line[max(0, m.start()-20):m.end()+20]):
            continue
        key = (rule, path)
        if key in seen: continue
        seen.add(key)
        hits.append((rule, path, commit[:9], date, len(m.group(0))))
proc.wait()

total = int(subprocess.check_output(["git", "rev-list", "--all", "--count"], text=True))
print(f"# history-secret-scan: {total} commits scanned, {len(hits)} distinct (rule, file) hits — values withheld")
for rule, path, c, d, n in sorted(hits):
    print(f"{rule:24} {path}  first-seen={c} {d}  match-length={n}")
print("# by rule:", dict(Counter(h[0] for h in hits)))
