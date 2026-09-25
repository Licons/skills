#!/usr/bin/env python3
"""Chạy query ADO, bỏ bug Resolved/Removed, dump mỗi bug ra <out>/<id>.md (Repro · Description · AC ·
System info · attachment · toàn bộ comment) + <out>/index.tsv để phân loại.

  python3 ado-dump-bugs.py --out <dir> [--query a8e0b97f-e38b-4beb-96cc-a41ad562c618] [--keep-state Resolved]
"""
import argparse
import html
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from ado_common import ORG, PROJECT, WIT, call, comments  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('--out', required=True)
p.add_argument('--query', default='a8e0b97f-e38b-4beb-96cc-a41ad562c618')
p.add_argument('--skip-state', action='append', default=None, help='mặc định: Resolved, Removed, Closed')
a = p.parse_args()
skip = set(a.skip_state or ['Resolved', 'Removed', 'Closed'])
os.makedirs(a.out, exist_ok=True)

rows = json.loads(subprocess.check_output(
    ['az', 'boards', 'query', '--org', ORG, '--project', PROJECT, '--id', a.query, '-o', 'json']))


def text(h):
    if not h:
        return ''
    h = re.sub(r'<img[^>]*src="([^"]+)"[^>]*>', r'[IMG \1]', h)
    h = re.sub(r'<br\s*/?>|</(p|div|li|tr)>', '\n', h)
    return html.unescape(re.sub(r'<[^>]+>', '', h)).strip()


index = []
for w in rows:
    f = w['fields']
    if f.get('System.State') in skip:
        continue
    bug = w['id']
    item = call(f'{WIT}/workitems/{bug}?$expand=relations&api-version=7.1')
    full, rel = item['fields'], item.get('relations') or []
    sev = full.get('Microsoft.VSTS.Common.Severity')
    out = [f"# {bug} [{full.get('System.State')}] Sev={sev}", full.get('System.Title', ''),
           '## Repro', text(full.get('Microsoft.VSTS.TCM.ReproSteps')),
           '## Description', text(full.get('System.Description')),
           '## AC', text(full.get('Microsoft.VSTS.Common.AcceptanceCriteria')),
           '## SystemInfo', text(full.get('Microsoft.VSTS.TCM.SystemInfo')),
           '## Attachments'] + [f"{r['url']} {r.get('attributes', {}).get('name')}" for r in rel if r['rel'] == 'AttachedFile']
    cs = comments(bug)
    out += ['## Comments'] + [f"--- {c['createdBy']['displayName']} {c['createdDate']}\n{text(c['text'])}" for c in cs]
    with open(os.path.join(a.out, f'{bug}.md'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(out))
    index.append('\t'.join(str(x) for x in [bug, full.get('System.State'), sev, len(cs), full.get('System.Title', '')]))

with open(os.path.join(a.out, 'index.tsv'), 'w', encoding='utf-8') as fh:
    fh.write('id\tstate\tseverity\tcomments\ttitle\n' + '\n'.join(index) + '\n')
print(f'{len(index)} bug → {a.out}')
