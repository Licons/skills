#!/usr/bin/env python3
"""Sửa comment ĐÃ đăng. Chỉ đụng comment của chính tài khoản đang đăng nhập az.

Chế độ 1 — thay chuỗi hàng loạt (mặc định: xoá chuỗi):
  python3 ado-edit-comments.py --find " Trạng thái giữ nguyên, chờ QA retest." [--replace "..."] 141336 141012 ...

Chế độ 2 — cập nhật Verify sau khi tái hiện runtime (dùng cho bug triage `reverify`):
  python3 ado-edit-comments.py --spec edit.json --shots <scratch>/shots [--branch <nhánh>] [--dry-run]
  edit.json: { "<id>": { "verify": "<html>", "shots": ["<id>.png"],
                         "rc": ["<đoạn cũ nguyên văn>", "<đoạn mới>"],   # tuỳ chọn
                         "comment_id": 18932737 } }                      # tuỳ chọn
  - Đích mặc định: comment MỚI NHẤT của mình có "<strong>Verify</strong>".
  - Verify + ảnh là ĐUÔI comment (template của ado-post-comments.py) ⇒ thay CẢ đuôi: Verify mới → ảnh mới →
    ảnh cũ (giữ làm lịch sử). Không cắt ở <br> đầu tiên — Verify nhiều dòng sẽ để lại rác giữa comment.
  - `rc` mới chứa hash commit ⇒ bắt --branch và hash phải có trên origin/<nhánh> (hash đổi nếu còn rebase).
  - Kiểm hết (đích, đoạn rc cũ, ảnh, push) TRƯỚC khi upload/ghi bất cứ thứ gì.
"""
import argparse
import html
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from ado_common import comments, edit_comment, me, upload  # noqa: E402

MARK = '<strong>Verify</strong>'
HASH = re.compile(r'<code>([0-9a-f]{7,12})</code>')


def rewrite_tail(text: str, verify: str, new_imgs: str) -> str:
    """Thay đuôi từ dòng Verify tới hết comment; ảnh cũ trong đuôi được giữ lại sau ảnh mới."""
    i = text.index(MARK)
    old_imgs = ''.join(f'{m}<br>' for m in re.findall(r'<img\b[^>]*>', text[i:]))
    return text[:i] + f'{MARK}: {verify}<br>' + new_imgs + old_imgs


def plain(h: str) -> str:
    """ADO tự escape (" → &quot;) khi lưu ⇒ so bản thuần chữ."""
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--find')
    p.add_argument('--replace', default='')
    p.add_argument('--spec')
    p.add_argument('--shots', default='.')
    p.add_argument('--branch')
    p.add_argument('--allow-unpushed', action='store_true')
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('ids', nargs='*')
    a = p.parse_args()
    if bool(a.find) == bool(a.spec):
        sys.exit('dùng đúng MỘT trong --find hoặc --spec')
    ME = me()

    def mine(c):
        return (c.get('createdBy', {}).get('uniqueName') or '').lower() == ME

    if a.find:
        if not a.ids:
            sys.exit('⛔ --find cần ít nhất 1 id (không id ⇒ "tổng 0" trông như đã chạy xong)')
        total = 0
        for bug in a.ids:
            for c in comments(bug):
                if not mine(c) or a.find not in (c.get('text') or ''):
                    continue
                total += 1
                print(bug, c['id'], 'dry-run' if a.dry_run else 'updated')
                if not a.dry_run:
                    edit_comment(bug, c['id'], c['text'].replace(a.find, a.replace))
        print('tổng', total)
        if not a.dry_run:
            print('còn sót', [b for b in a.ids for c in comments(b) if mine(c) and a.find in (c.get('text') or '')])
        return

    spec = json.load(open(a.spec, encoding='utf-8'))
    jobs = []
    for bug in a.ids or list(spec):
        item = spec[bug]
        cs = [c for c in comments(bug) if mine(c) and MARK in (c.get('text') or '')]
        if item.get('comment_id'):
            cs = [c for c in cs if c['id'] == item['comment_id']]
        if not cs:
            sys.exit(f'⛔ {bug}: không thấy comment của mình có dòng Verify')
        c, t = cs[0], cs[0]['text']
        if item.get('rc'):
            if t.count(item['rc'][0]) != 1:
                sys.exit(f'⛔ {bug}: đoạn rc cũ xuất hiện {t.count(item["rc"][0])} lần (cần đúng 1)')
            hashes = HASH.findall(item['rc'][1])
            if hashes and not a.allow_unpushed:
                if not a.branch:
                    sys.exit(f'⛔ {bug}: rc mới có hash {hashes} ⇒ cần --branch để kiểm đã push')
                bad = [h for h in hashes if subprocess.run(
                    ['git', 'merge-base', '--is-ancestor', h, f'origin/{a.branch}'], capture_output=True).returncode]
                if bad:
                    sys.exit(f'⛔ {bug}: hash chưa có trên origin/{a.branch}: {bad} — push trước')
            t = t.replace(item['rc'][0], item['rc'][1])
        missing = [s for s in item.get('shots', []) if not os.path.exists(os.path.join(a.shots, s))]
        if missing:
            sys.exit(f'⛔ {bug}: thiếu ảnh {missing}')
        jobs.append((bug, c['id'], t, item))

    for bug, cid, t, item in jobs:
        imgs = ''.join(f'<img src="{"DRY-RUN" if a.dry_run else upload(os.path.join(a.shots, s), f"AB{bug}-{s}")}" alt="{s}" /><br>'
                       for s in item.get('shots', []))
        new = rewrite_tail(t, item['verify'], imgs)
        if a.dry_run:
            print(f'===== {bug} · comment {cid}\n{new}\n')
            continue
        edit_comment(bug, cid, new)
        after = next(x for x in comments(bug) if x['id'] == cid)['text']
        ok = plain(after[after.index(MARK):]) == plain(new[new.index(MARK):]) if MARK in after else False
        print(bug, cid, 'updated', len(item.get('shots', [])), 'ảnh', '· đọc lại OK' if ok else '· ⚠️ ĐỌC LẠI LỆCH — mở comment kiểm tay')


if __name__ == '__main__':
    main()
