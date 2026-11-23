#!/usr/bin/env python3
"""Pack a course into an offline webxdc app (a .xdc zip) with the player, Jade's frames and, optionally, MicroPython.

    python3 tools/pack.py course.json out.xdc [--python ENGINE/vendor] [--name "My course"] [--icon icon.png]

Without --python the Python labs say Python is not available; with it the .xdc grows by about 450 kB.
Webxdc apps have no network, so fonts fall back to system fonts and math shows as TeX.
"""
import argparse
import json
import os
import zipfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><style>html,body{{margin:0;height:100%;background:#040807}}#c{{height:100vh}}</style>
<script src="webxdc.js"></script>
<script type="module">
import {{ configure, mount }} from './src/edu.js';
configure({{ python: {py}, fonts: false }});
mount(document.getElementById('c'), './course.json', {{ teacher: 'jade' }});
</script></head><body><div id="c"></div></body></html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("course"); ap.add_argument("out")
    ap.add_argument("--python", help="folder with micropython.mjs and micropython.wasm (jade-vn-engine/engine/vendor)")
    ap.add_argument("--name"); ap.add_argument("--icon")
    a = ap.parse_args()
    course = json.load(open(a.course, encoding="utf-8"))
    title = a.name or course.get("title", "Course")
    with zipfile.ZipFile(a.out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.writestr("index.html", PAGE.format(title=title.replace("<", ""), py="'./py/'" if a.python else "null"))
        z.writestr("manifest.toml", 'name = %s\nsource_code_url = "https://github.com/lucky-edgelord/jade-edu"\n' % json.dumps(title))
        z.writestr("course.json", json.dumps(course, separators=(",", ":")))
        for base in ("src", os.path.join("assets", "jade")):
            for d, _, fs in os.walk(os.path.join(ROOT, base)):
                for f in fs:
                    p = os.path.join(d, f)
                    z.write(p, os.path.relpath(p, ROOT))
        if a.python:
            for f in ("micropython.mjs", "micropython.wasm"):
                z.write(os.path.join(a.python, f), "py/" + f)
        if a.icon:
            z.write(a.icon, "icon" + os.path.splitext(a.icon)[1])
        else:
            z.write(os.path.join(ROOT, "assets", "jade", "icon.png"), "icon.png")
    print("%s  %d kB" % (a.out, os.path.getsize(a.out) // 1024))


if __name__ == "__main__":
    main()
