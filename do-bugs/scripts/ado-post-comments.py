#!/usr/bin/env python3
"""Đăng comment theo template của do-bugs: Root Cause · Fix (commit gắn AB#id) · Verify + ảnh nhúng.

Spec JSON: { "<id>": { "rc": "<html>", "shots": ["a.png"], "verify": "<html, tuỳ chọn>", "fix": true } }
  - shots: tên tệp trong --shots; mỗi ảnh được upload rồi nhúng <img>.
  - fix=false: bỏ dòng Fix (bug không có commit trong nhánh — đã fix trước / DATA / không phải bug).
  - verify mặc định: "stack local (DB local, tài khoản ho), Chrome, <ngày>."

  python3 ado-post-comments.py --spec spec.json --shots <dir> --branch fix/ado-xxx --date 25/09/2026 [id ...]
  (không truyền id ⇒ mọi id trong spec)  ·  --dry-run in HTML, không đăng
"""
import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from ado_common import add_comment, upload  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('--spec', required=True)
p.add_argument('--shots', required=True)
p.add_argument('--branch', required=True)
p.add_argument('--date', required=True)
p.add_argument('--base', default='origin/develop', help='commit của bug = base..HEAD có AB#<id>')
p.add_argument('--repo', default=os.getcwd())
p.add_argument('--dry-run', action='store_true')
p.add_argument('ids', nargs='*')
a = p.parse_args()
spec = json.load(open(a.spec, encoding='utf-8'))


def commits(bug):
    out = subprocess.check_output(['git', '-C', a.repo, 'log', f'{a.base}..HEAD', '--format=%h', f'--grep=AB#{bug}([^0-9]|$)',
                                   '--extended-regexp']).decode().split()
    return out


for bug in a.ids or list(spec):
    item = spec[bug]
    imgs = ''
    for shot in item.get('shots', []):
        path = os.path.join(a.shots, shot)
        url = 'DRY-RUN' if a.dry_run else upload(path, f'AB{bug}-{shot}')
        imgs += f'<img src="{url}" alt="{shot}" /><br>'
    cs = commits(bug) if item.get('fix', True) else []
    fix = f'<br><strong>Fix</strong>: nhánh <code>{a.branch}</code> — ' + ' · '.join(f'<code>{c}</code>' for c in cs) if cs else ''
    verify = item.get('verify', f'stack local (DB local, tài khoản <code>ho</code>), Chrome, {a.date}.')
    html = f'<strong>Root Cause</strong>: {item["rc"]}{fix}<br><strong>Verify</strong>: {verify}<br>{imgs}'
    if a.dry_run:
        print(bug, html[:300], '…')
        continue
    res = add_comment(bug, html)
    print(bug, 'comment', res.get('id'), 'ảnh', len(item.get('shots', [])), 'commit', len(cs))
