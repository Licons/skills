#!/usr/bin/env python3
"""Apply localization key edits line-by-line (no json.dump of the whole file).
keys.json: {"vi": {"Key": "Value"}, "en": {"Key": "Value"}, "remove": ["Key"]}
Existing key -> value replaced in place. New key -> inserted after the last key sharing its prefix
(text before the last ':'), else before the closing of "Texts". Validates with json.loads."""
import json, re, sys
L = 'services/saas/FPTCXSuite.SaasService.Contracts/Localization/SaasService/'
spec = json.load(open(sys.argv[1], encoding='utf-8'))
for lang in ('vi', 'en'):
    path = L + lang + '.json'
    lines = open(path, encoding='utf-8').read().split('\n')
    keyre = re.compile(r'^(\s*)"((?:[^"\\]|\\.)*)":')
    def find(k):
        for i, ln in enumerate(lines):
            m = keyre.match(ln)
            if m and json.loads('"' + m.group(2) + '"') == k:
                return i
        return -1
    for k in spec.get('remove', []):
        i = find(k)
        if i >= 0:
            del lines[i]
    for k, v in (spec.get(lang) or {}).items():
        enc = json.dumps(k, ensure_ascii=False) + ': ' + json.dumps(v, ensure_ascii=False)
        i = find(k)
        if i >= 0:
            ind = keyre.match(lines[i]).group(1)
            lines[i] = ind + enc + (',' if lines[i].rstrip().endswith(',') else '')
            continue
        prefix = k.rsplit(':', 1)[0] + ':' if ':' in k else None
        anchor = find(spec['after'][k]) if k in spec.get('after', {}) else -1
        if anchor < 0 and prefix:
            for j, ln in enumerate(lines):
                m = keyre.match(ln)
                if m and json.loads('"' + m.group(2) + '"').startswith(prefix):
                    anchor = j
        if anchor < 0:  # before the last key line of Texts
            anchor = max(j for j, ln in enumerate(lines) if keyre.match(ln))
        ind = keyre.match(lines[anchor]).group(1)
        if not lines[anchor].rstrip().endswith(','):
            lines[anchor] = lines[anchor].rstrip() + ','
            lines.insert(anchor + 1, ind + enc)
        else:
            lines.insert(anchor + 1, ind + enc + ',')
    txt = '\n'.join(lines)
    json.loads(txt)
    open(path, 'w', encoding='utf-8').write(txt)
    print(lang, 'ok')
