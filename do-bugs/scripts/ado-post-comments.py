#!/usr/bin/env python3
"""Đăng comment theo template của do-bugs: Root Cause · Fix (commit gắn AB#id) · Verify + ảnh nhúng.

Spec JSON: { "<id>": { "rc": "<html>", "shots": ["a.png"], "verify": "<html, tuỳ chọn>", "fix": true,
                         "level": "runtime" | "code" } }
  - shots: tên tệp trong --shots; mỗi ảnh được upload rồi nhúng <img>.
  - fix=false: bỏ dòng Fix (bug không có commit trong nhánh — đã fix trước / DATA / không phải bug).
  - gap: "<html>" thay cho rc ⇒ comment câu hỏi BA theo Template GAP của SKILL.md (Kết luận · Vì sao · Căn cứ ·
    Cần BA chốt · Chi tiết); script tự nối dòng Verify + ảnh, không có dòng Fix.
  - level (BẮT BUỘC): "runtime" = đã chạy thật trên stack · "code" = CHỈ đọc code ⇒ Verify mở đầu bằng
    dấu hiệu "chỉ đọc code" để lượt sau `ado-dump-bugs.py` xếp bug vào triage `reverify`.
  - verify mặc định: "stack local (DB local, tài khoản admin), <--browser>, <ngày>."
  - fix=true mà commit CHƯA có trên origin/<nhánh> ⇒ dừng: hash ghi trong comment sẽ đổi nếu còn rebase.
    Push trước (hoặc --allow-unpushed nếu chắc chắn không rebase nữa).

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
p.add_argument('--browser', default='Chrome', help='ghi vào Verify mặc định: Chrome · Chrome DevTools MCP · Playwright headless')
p.add_argument('--allow-unpushed', action='store_true')
p.add_argument('--dry-run', action='store_true')
p.add_argument('ids', nargs='*')
a = p.parse_args()
spec = json.load(open(a.spec, encoding='utf-8'))


def commits(bug):
    out = subprocess.check_output(['git', '-C', a.repo, 'log', f'{a.base}..HEAD', '--format=%h', f'--grep=AB#{bug}([^0-9]|$)',
                                   '--extended-regexp']).decode().split()
    return out


def pushed(commit):
    return subprocess.run(['git', '-C', a.repo, 'merge-base', '--is-ancestor', commit, f'origin/{a.branch}'],
                          capture_output=True).returncode == 0


ids = a.ids or list(spec)
bad = [b for b in ids if spec[b].get('level') not in ('runtime', 'code')]
if bad:
    sys.exit(f'⛔ thiếu/sai "level" (runtime|code) cho: {bad}')
# Kiểm HẾT trước khi ghi bất cứ thứ gì lên ADO — dừng giữa chừng là để lại nửa lô comment + ảnh mồ côi.
def wants_fix(b):
    return spec[b].get('fix', True) and 'gap' not in spec[b]


plan = {b: commits(b) if wants_fix(b) else [] for b in ids}
unpushed = {b: [c for c in cs if not pushed(c)] for b, cs in plan.items()}
unpushed = {b: cs for b, cs in unpushed.items() if cs}
if unpushed and not a.allow_unpushed and not a.dry_run:
    sys.exit(f'⛔ commit chưa có trên origin/{a.branch}: {unpushed} — push trước khi comment (hash đổi nếu còn rebase)')
# fix=true mà 0 commit ⇒ dòng Fix biến mất ÂM THẦM: gõ sai AB#<id>, hoặc rebase đã drop commit trùng upstream.
nofix = [b for b in ids if wants_fix(b) and not plan[b]]
if nofix:
    sys.exit(f'⛔ fix=true nhưng không thấy commit AB#<id> trong {a.base}..HEAD: {nofix} — kiểm message commit, '
             f'hoặc đặt "fix": false nếu bug không có commit trong nhánh')
missing = [os.path.join(a.shots, s) for b in ids for s in spec[b].get('shots', []) if not os.path.exists(os.path.join(a.shots, s))]
if missing:
    sys.exit(f'⛔ thiếu ảnh: {missing}')

for bug in ids:
    item, cs = spec[bug], plan[bug]
    if item['level'] == 'code':
        verify = item.get('verify', f'đọc code, {a.date}.')
        if not verify.startswith('<b>chỉ đọc code</b>'):
            verify = f'<b>chỉ đọc code</b> (chưa tái hiện trên stack) — {verify}'
    else:
        verify = item.get('verify', f'stack local (DB local, tài khoản <code>admin</code>), {a.browser}, {a.date}.')
    imgs = ''
    for shot in item.get('shots', []):
        path = os.path.join(a.shots, shot)
        url = 'DRY-RUN' if a.dry_run else upload(path, f'AB{bug}-{shot}')
        imgs += f'<img src="{url}" alt="{shot}" /><br>'
    fix = f'<br><strong>Fix</strong>: nhánh <code>{a.branch}</code> — ' + ' · '.join(f'<code>{c}</code>' for c in cs) if cs else ''
    body = item['gap'] if 'gap' in item else f'<strong>Root Cause</strong>: {item["rc"]}{fix}'
    html = f'{body}<br><strong>Verify</strong>: {verify}<br>{imgs}'
    if a.dry_run:
        print(f'===== {bug} · level={item["level"]} · commit={cs} · chưa push={unpushed.get(bug, [])}\n{html}\n')
        continue
    res = add_comment(bug, html)
    print(bug, 'comment', res.get('id'), 'ảnh', len(item.get('shots', [])), 'commit', len(cs))
