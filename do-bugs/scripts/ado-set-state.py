#!/usr/bin/env python3
"""Đổi State hàng loạt. ⛔ Từ chối 'Resolved'/'Closed' — skill do-bugs cấm tự chuyển.

  python3 ado-set-state.py --state "In Progress" 141336 141012 ...
"""
import argparse
import subprocess
import sys

sys.path.insert(0, __import__('os').path.dirname(__file__))
from ado_common import ORG  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('--state', required=True)
p.add_argument('ids', nargs='+')
a = p.parse_args()
if a.state.lower() in ('resolved', 'closed', 'done'):
    sys.exit(f'⛔ Không tự chuyển sang "{a.state}" — người dùng chuyển sau khi QA retest.')

for bug in a.ids:
    r = subprocess.run(['az', 'boards', 'work-item', 'update', '--org', ORG, '--id', bug, '--state', a.state,
                        '--query', 'fields."System.State"', '-o', 'tsv'], capture_output=True, text=True)
    print(bug, (r.stdout.strip() or r.stderr.strip().splitlines()[-1:]))
