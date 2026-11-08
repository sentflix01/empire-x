"""Builds the per-finding status table for CLOSEOUT.md (run with python3 -I).

Inputs: findings/*.json (what was found), FIXES.md (what was done) and
evidence/prod-verify-2026-11-08.json (what production shows). Statuses that
need a person are set in OWNER and OPEN below, with the reason.
"""
import glob
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

fixes = open(os.path.join(ROOT, 'FIXES.md'), encoding='utf-8').read()
prod = json.load(open(os.path.join(ROOT, 'evidence', 'prod-verify-2026-11-08.json'), encoding='utf-8'))
prod_ok = {}
for r in prod['results']:
    for fid in re.findall(r'F-\d{3}', r['finding']):
        prod_ok.setdefault(fid, []).append(r['pass'])
prod_verified = {fid for fid, results in prod_ok.items() if all(results)}

# Fixed in code; something only the owner can do is still needed in production.
OWNER = {
    'F-013': 'Set PRIVATE_SUPABASE_BUCKET on Render, then run the verification-document move script (dry run first)',
    'F-017': 'Set MFA_ENCRYPTION_KEY on Render; each admin turns on two-factor sign-in',
    'F-024': 'Turn on GitHub secret scanning and push protection',
    'F-032': 'Make the E2E check required on main',
    'F-054': 'Counsel confirms the data-protection proclamation number and obligations',
}
# Not fixed (or only partly).
OPEN = {
    'F-030': 'Open — owner: hosting plan and external uptime alert (API answered today: see production checks)',
    'F-052': 'Partly — unused packages removed; strict TypeScript on for the backend and frontend lib/ and hooks/; components/ and views/ to follow',
    'F-053': 'Open — cause not found; capture the full error on the next CI failure (TD-025)',
    'F-055': 'Partly — statement and licence done; Refund Policy (owner/counsel), OpenAPI file and docs freshness check open',
    'F-029': 'Partly verified — API and frontend checked on production; TLS and email DNS not checked from here',
}

# Evidence where "tests in CI" or a pass/fail label would be wrong.
EVIDENCE = {
    'F-008': 'Docs updated',
    'F-054': 'Docs updated',
    'F-022': 'Workflow settings in effect on every CI run',
    'F-030': 'API answered /health in 707 ms, then 178 ms (2026-11-08)',
}

rows = []
for path in sorted(glob.glob(os.path.join(ROOT, 'findings', 'F-*.json'))):
    f = json.load(open(path, encoding='utf-8'))
    fid = f['id']
    if f['status'] == 'POSITIVE':
        status, evidence = 'Positive — keep', 'No change needed'
    elif fid in OPEN:
        status, evidence = OPEN[fid], ''
    else:
        has_fix = re.search(r'^\| ' + fid + r' ', fixes, re.M) is not None
        status = 'Fixed' if has_fix else 'Not fixed'
        if fid in OWNER:
            status = 'Fixed — owner step pending: ' + OWNER[fid]
        evidence = 'Production check passed' if fid in prod_verified else ('Tests in CI' if has_fix else '')
    if fid in prod_verified and 'Production' not in evidence:
        evidence = (evidence + '; ' if evidence else '') + 'production check passed'
    if fid in EVIDENCE:
        evidence = EVIDENCE[fid]
    rows.append(f"| {fid} | {f['severity']} | {f['title']} | {status} | {evidence or '—'} |")

print('| ID | Severity | Finding | Status (2026-11-08) | Evidence |')
print('|---|---|---|---|---|')
print('\n'.join(rows))
