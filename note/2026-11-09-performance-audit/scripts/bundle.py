"""First-load client JS per route from `next analyze export` JSONL.
Usage: python3 bundle.py graph.jsonl [route ...]
Sizes are compressed (as reported by the analyzer) and summed per unique file part."""
import json, sys, collections, re

path, *routes = sys.argv[1:]
groups = collections.defaultdict(list)   # route -> [(kind, outputs)]
parts = collections.defaultdict(list)    # (route, filename) -> [(source, size, csize)]
for line in open(path):
    d = json.loads(line)
    if d['type'] == 'group':
        groups[d['route']].append((d['kind'], d['outputs']))
    elif d['type'] == 'part' and d['filename'].startswith('[client-fs]') and d['filename'].endswith('.js'):
        parts[(d['route'], d['filename'])].append((d['source_path'], d['size'], d['compressed_size']))

def pkg(src):
    m = re.search(r'node_modules/((?:@[^/]+/)?[^/]+)', src)
    return m.group(1) if m else 'app:' + '/'.join(src.replace('[project]/', '').split('/')[:2])

rows = []
for r in sorted(groups):
    if routes and r not in routes:
        continue
    init = {o for k, outs in groups[r] if k in ('bootstrap', 'render_dependent') for o in outs if o.endswith('.js')}
    by = collections.Counter(); total = 0
    for f in init:
        for src, size, cs in parts.get((r, f), []):
            by[pkg(src)] += cs; total += cs
    rows.append((r, total, by))
rows.sort(key=lambda x: -x[1])
for r, total, by in rows:
    print(f"{r:45} {total/1024:7.1f} KB")
    if routes:
        for k, v in by.most_common(25):
            print(f"      {k:45} {v/1024:6.1f} KB")
