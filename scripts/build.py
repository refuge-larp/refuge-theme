#!/usr/bin/env python3
"""Build a site with an immutable snapshot of the selected theme release."""
import json
import os
import shutil
import sys
import urllib.request
from pathlib import Path

site = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
if output.exists() or output == site or output in site.parents:
    raise SystemExit('Output must be a new directory, outside the site source.')
config = json.loads((site / 'theme.json').read_text())
release = config['release']
base = 'https://api.github.com/repos/refuge-larp/refuge-theme'
headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'refuge-theme-builder'}
if os.environ.get('GH_TOKEN'):
    headers['Authorization'] = 'Bearer ' + os.environ['GH_TOKEN']
def api(path):
    return json.load(urllib.request.urlopen(urllib.request.Request(base + path, headers=headers), timeout=30))
if release == 'latest':
    release = api('/releases/latest')['tag_name']
if not isinstance(release, str) or not release.startswith('v') or any(c not in 'v0123456789.-' for c in release):
    raise SystemExit('Use latest or a version tag such as v1.0.0.')
commit = api('/commits/' + release)['sha']
if len(commit) != 40 or any(c not in '0123456789abcdef' for c in commit):
    raise SystemExit('Invalid theme commit.')
shutil.copytree(site, output, ignore=shutil.ignore_patterns('.git', '.github', '.theme-tooling', 'node_modules', 'site-output', 'playwright-report', 'test-results'))
for name in ['styles.css', 'polish.css', 'motion.css', 'motion.js']:
    url = f'https://raw.githubusercontent.com/refuge-larp/refuge-theme/{commit}/assets/{name}'
    data = urllib.request.urlopen(url, timeout=30).read()
    (output / name).write_bytes(data)
(output / 'theme-version.json').write_text(json.dumps({'release': release, 'commit': commit}) + '\n')
print(json.dumps({'release': release, 'commit': commit, 'output': str(output)}))
