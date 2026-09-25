#!/usr/bin/env python3
"""Sửa hàng loạt comment ĐÃ đăng: thay chuỗi --find bằng --replace (mặc định: xoá).
Chỉ đụng comment của chính tài khoản đang đăng nhập az.

  python3 ado-edit-comments.py --find " Trạng thái giữ nguyên, chờ QA retest sau khi deploy." 141336 141012 ...
"""
import argparse
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from ado_common import comments, edit_comment  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('--find', required=True)
p.add_argument('--replace', default='')
p.add_argument('--dry-run', action='store_true')
p.add_argument('ids', nargs='+')
a = p.parse_args()
me = subprocess.check_output(['az', 'account', 'show', '--query', 'user.name', '-o', 'tsv']).decode().strip().lower()

total = 0
for bug in a.ids:
    for c in comments(bug):
        mine = (c.get('createdBy', {}).get('uniqueName') or '').lower() == me
        if not mine or a.find not in (c.get('text') or ''):
            continue
        total += 1
        print(bug, c['id'], 'dry-run' if a.dry_run else 'updated')
        if not a.dry_run:
            edit_comment(bug, c['id'], c['text'].replace(a.find, a.replace))
print('tổng', total)
left = [b for b in a.ids for c in comments(b) if a.find in (c.get('text') or '')] if not a.dry_run else []
print('còn sót', left)
