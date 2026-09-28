#!/usr/bin/env python3
"""Chạy query ADO, bỏ bug Resolved/Removed, dump mỗi bug ra <out>/<id>.md (Repro · Description · AC ·
System info · attachment · toàn bộ comment) + <out>/index.tsv để phân loại.

index.tsv có cột `triage` (so với comment gần nhất của CHÍNH tài khoản az đang đăng nhập):
  new       — mình chưa comment lần nào                ⇒ phân tích đầy đủ
  qa-reply  — có comment người khác SAU comment của mình ⇒ đọc phản hồi, làm lại
  reverify  — mình comment cuối nhưng Verify chỉ "đọc code" ⇒ tái hiện runtime rồi sửa comment
  wait-qa   — mình comment cuối, đã verify runtime      ⇒ bỏ qua (chờ QA retest)

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
from ado_common import ORG, PROJECT, WIT, call, comments, me  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('--out', required=True)
p.add_argument('--query', default='a8e0b97f-e38b-4beb-96cc-a41ad562c618')
p.add_argument('--skip-state', action='append', default=None, help='mặc định: Resolved, Removed, Closed')
a = p.parse_args()
skip = set(a.skip_state or ['Resolved', 'Removed', 'Closed'])
os.makedirs(a.out, exist_ok=True)

rows = json.loads(subprocess.check_output(
    ['az', 'boards', 'query', '--org', ORG, '--project', PROJECT, '--id', a.query, '-o', 'json']))


ME = me()
# Dấu hiệu CHỈ-ĐỌC-CODE tường minh do ado-post-comments.py ghi khi `level: code`; không dựa vào chữ "runtime"
# (câu "chưa chạy runtime" sẽ khớp nhầm). "đọc code + màn … trên stack local" là ĐÃ chạy thật ⇒ runtime.
CODE_ONLY = 'chỉ đọc code'
RUNTIME = re.compile(r'Playwright|Chrome|stack local', re.I)


def triage(cs):
    """cs: comment mới nhất trước. Trả (triage, số comment người khác sau mình, mức verify của mình)."""
    mine = [i for i, c in enumerate(cs) if (c['createdBy'].get('uniqueName') or '').lower() == ME]
    if not mine:
        return 'new', '-', '-'
    t = cs[mine[0]].get('text') or ''
    # Chỉ xét ĐOẠN VERIFY: Root Cause nhắc "stack local"/"đọc code" (rất tự nhiên) không được đổi mức verify —
    # xếp nhầm `wait-qa` là bug bị bỏ qua vĩnh viễn dù chưa từng chạy thật.
    if '<strong>Verify</strong>' in t:
        t = t.split('<strong>Verify</strong>', 1)[1]
    if CODE_ONLY in t:
        level = 'code'
    elif RUNTIME.search(t):
        level = 'runtime'
    else:
        level = 'code' if 'đọc code' in t else '?'
    if mine[0] > 0:
        return 'qa-reply', str(mine[0]), level
    return ('reverify' if level != 'runtime' else 'wait-qa'), '0', level


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
    tri, after, level = triage(cs)
    out += ['## Comments'] + [f"--- {c['createdBy']['displayName']} {c['createdDate']}\n{text(c['text'])}" for c in cs]
    with open(os.path.join(a.out, f'{bug}.md'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(out))
    last = cs[0] if cs else {}
    index.append('\t'.join(str(x) for x in [
        bug, tri, full.get('System.State'), sev, len(cs),
        (last.get('createdBy') or {}).get('displayName', '-'), (last.get('createdDate') or '-')[:10],
        after, level, full.get('System.Title', '')]))

ORDER = {'new': 0, 'qa-reply': 1, 'reverify': 2, 'wait-qa': 3}
index.sort(key=lambda row: (ORDER.get(row.split('\t')[1], 9), row))  # việc cần làm lên đầu, wait-qa xuống cuối
with open(os.path.join(a.out, 'index.tsv'), 'w', encoding='utf-8') as fh:
    fh.write('id\ttriage\tstate\tseverity\tcomments\tlast_by\tlast_date\tothers_after_mine\tmy_verify\ttitle\n'
             + '\n'.join(index) + '\n')
counts = {}
for row in index:
    counts[row.split('\t')[1]] = counts.get(row.split('\t')[1], 0) + 1
print(f'{len(index)} bug → {a.out} · triage: ' + ' · '.join(f'{k} {v}' for k, v in sorted(counts.items())))
