#!/usr/bin/env python3
"""Stage only the hunks of FILE whose text contains any of the given markers.
usage: stage-hunks.py FILE marker [marker...]"""
import subprocess, sys
f, markers = sys.argv[1], sys.argv[2:]
diff = subprocess.check_output(['git', 'diff', '-U3', '--', f], text=True)
head, *hunks = diff.split('\n@@')
keep = ['@@' + h for h in hunks if any(m in h for m in markers)]
if not keep: sys.exit('no hunk matched')
patch = head + '\n' + '\n'.join(keep)
if not patch.endswith('\n'): patch += '\n'
subprocess.run(['git', 'apply', '--cached', '--recount', '-'], input=patch, text=True, check=True)
print(f'staged {len(keep)}/{len(hunks)} hunks of {f}')
