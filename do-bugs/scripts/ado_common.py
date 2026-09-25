"""Dùng chung cho các script ADO của skill do-bugs: token az + gọi REST work item."""
import json
import subprocess
import urllib.request

ORG = 'https://dev.azure.com/Loyalstar'
PROJECT = 'VietBank'
WIT = f'{ORG}/{PROJECT}/_apis/wit'
ADO_RESOURCE = '499b84ac-1321-427f-aa17-267ca6975798'

_token = None


def token() -> str:
    global _token
    if _token is None:
        _token = subprocess.check_output(
            ['az', 'account', 'get-access-token', '--resource', ADO_RESOURCE,
             '--query', 'accessToken', '-o', 'tsv']).decode().strip()
    return _token


def call(url: str, method: str = 'GET', body=None, raw: bytes | None = None,
         ctype: str = 'application/json'):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={'Authorization': 'Bearer ' + token(), 'Content-Type': ctype})
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def comments(bug: int | str) -> list:
    return call(f'{WIT}/workItems/{bug}/comments?api-version=7.1-preview.4&$top=200').get('comments', [])


def add_comment(bug: int | str, html: str) -> dict:
    return call(f'{WIT}/workItems/{bug}/comments?api-version=7.1-preview.4', 'POST', {'text': html})


def edit_comment(bug: int | str, comment_id: int, html: str) -> dict:
    return call(f'{WIT}/workItems/{bug}/comments/{comment_id}?api-version=7.1-preview.4', 'PATCH', {'text': html})


def upload(path: str, name: str) -> str:
    """Tải ảnh lên kho attachment của ADO, trả URL để nhúng vào <img>."""
    with open(path, 'rb') as fh:
        res = call(f'{WIT}/attachments?fileName={name}&api-version=7.1', 'POST',
                   raw=fh.read(), ctype='application/octet-stream')
    return res['url']
