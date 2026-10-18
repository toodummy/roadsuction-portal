#!/usr/bin/env python3
"""Build per-portal bundles: dist/<portal>/ and dist/<portal>.zip (index.html at the zip root).

Usage:  python3 build.py                 # all portals
        python3 build.py --only none     # one portal (used by Vercel for the preview)
Env:    GD_GAME_ID, GM_GAME_ID           # GameDistribution / GameMonetize game ids (from their dashboards)
"""
import os, re, shutil, sys, zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, 'dist')
PORTALS = ['none', 'gamemonetize', 'crazygames', 'poki', 'gd']
GAME_IDS = {'gd': os.environ.get('GD_GAME_ID', 'REPLACE_WITH_GD_GAME_ID'),
            'gamemonetize': os.environ.get('GM_GAME_ID', 'REPLACE_WITH_GM_GAME_ID')}
FILES = ['three.module.min.js']
DIRS = ['addons']


def build_index():
    src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    assert src.count('/*@DEV*/true') == 1
    src = src.replace('/*@DEV*/true', 'false')           # disables all debug URL params
    out = [l for l in src.split('\n') if not l.rstrip().endswith('//@dev')]  # strip dev-only hooks
    src = '\n'.join(out)
    for bad in ['//@dev', 'window.__rd', 'navigator.share', 'alert(', 'prompt(', 'three.module.js"']:
        assert bad not in src, bad
    # syntax-check the game module after stripping (needs node; skipped if unavailable)
    import re, subprocess, tempfile
    m = re.search(r'<script type="module">(.*)</script>', src, re.S)
    if m and shutil.which('node'):
        with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False) as t:
            t.write(m.group(1))
        subprocess.run(['node', '--check', t.name], check=True)
        os.unlink(t.name)
    return src


def build(portal, index_html):
    d = os.path.join(DIST, portal)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(index_html)
    pj = open(os.path.join(ROOT, 'portal.js'), encoding='utf-8').read()
    pj = pj.replace("'__PORTAL_NAME__'", repr(portal)).replace("'__GAME_ID__'", repr(GAME_IDS.get(portal, '')))
    open(os.path.join(d, 'portal.js'), 'w', encoding='utf-8').write(pj)
    for f in FILES:
        shutil.copy2(os.path.join(ROOT, f), d)
    for sub in DIRS:
        shutil.copytree(os.path.join(ROOT, sub), os.path.join(d, sub))
    z = os.path.join(DIST, portal + '.zip')
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for r, _, fs in os.walk(d):
            for f in sorted(fs):
                p = os.path.join(r, f)
                zf.write(p, os.path.relpath(p, d))
    n = sum(len(fs) for _, _, fs in os.walk(d))
    raw = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(d) for f in fs)
    print(f'{portal:13s} {n:3d} files  {raw/1024:7.1f} KB raw  {os.path.getsize(z)/1024:6.1f} KB zip  -> {os.path.relpath(z, ROOT)}')


if __name__ == '__main__':
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    os.makedirs(DIST, exist_ok=True)
    html = build_index()
    for p in PORTALS:
        if only and p != only:
            continue
        build(p, html)
