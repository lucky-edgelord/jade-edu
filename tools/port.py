#!/usr/bin/env python3
"""Port the pure modules of Lilith Learning Lab (UMD scripts) to jade-edu's ES modules.

    python3 tools/port.py /path/to/Lilith-Learning-Lab/build/src

Writes src/core/{course,slides,narrate,maps,math,xdc}.js. The course format becomes "jade-course"
("lilith-course" files still load), the webxdc bridge becomes window.jade (window.lilith stays as an
alias), and Python labs load MicroPython from a base URL (setPython) instead of a bundled global.
Run it again after Lilith changes; the result is committed so the CDN serves it as is.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "src", "core")
NAMES = ["course", "slides", "narrate", "maps", "math", "xdc"]
IMPORTS = {
    "slides": "import N from './narrate.js';\nimport M from './maps.js';\n",
    "narrate": "import LM from './math.js';\n",
}

PY_NEW = r'''  /* MicroPython comes from a base URL (micropython.mjs + micropython.wasm), fetched the first time a Python lab runs.
     jade-edu points it at jade-vn-engine's engine/vendor/ on the CDN; setPython(base) changes it. */
  var pyBase = null, pyLoad = null;
  function setPython(base) { pyBase = base ? String(base).replace(/\/?$/, '/') : null; pyLoad = null; }
  function loadPy() {
    if (!pyBase) return Promise.reject(new Error('Python is not available in this build'));
    if (!pyLoad) pyLoad = Promise.all([
      fetch(pyBase + 'micropython.mjs').then(function (r) { if (!r.ok) throw new Error('micropython.mjs ' + r.status); return r.text(); }),
      fetch(pyBase + 'micropython.wasm').then(function (r) { if (!r.ok) throw new Error('micropython.wasm ' + r.status); return r.arrayBuffer(); })
    ]).then(function (a) {
      // a classic script: module workers do not start from a blob everywhere
      var mjs = a[0].replace(/import\.meta\.url/g, '"http://localhost/micropython.mjs"').replace('export default _createMicroPythonModule', '').replace('export async function loadMicroPython', 'async function loadMicroPython');
      return { mjs: mjs, wasm: a[1] };
    });
    pyLoad.catch(function () { pyLoad = null; });
    return pyLoad;
  }
  function runPython(lab, code, opts) {
    opts = opts || {};
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return Promise.resolve({ pass: false, msgs: ['ERROR Python is not available here'] });
    return loadPy().then(function (MP) {
      return new Promise(function (resolve) {
        var w, url, done = false;
        function finish(r) { if (done) return; done = true; try { w.terminate(); } catch (e) {} try { URL.revokeObjectURL(url); } catch (e) {} resolve(r); }
        try {
          var glue = '\nvar same=' + same.toString() + ',arr=' + arr.toString() + ';\nvar runPythonCore=' + runPythonCore.toString() + ';\n' +
            'onmessage=async function(e){var out=[];try{var wurl=URL.createObjectURL(new Blob([e.data.wasm],{type:\'application/wasm\'}));var mp=await loadMicroPython({url:wurl,heapsize:8*1024*1024,stdout:function(s){out.push(s)},stderr:function(s){out.push(s)}});postMessage(await runPythonCore(mp,e.data.lab,e.data.code,out,e.data.outputOnly));}catch(err){postMessage({pass:false,msgs:["ERROR "+String(err&&err.message||err)]});}};';
          url = URL.createObjectURL(new Blob([MP.mjs + glue], { type: 'text/javascript' }));
          w = new Worker(url);
          w.onmessage = function (e) { finish(e.data); };
          w.onerror = function () { finish({ pass: false, msgs: ['ERROR Python could not start on this device'] }); };
          setTimeout(function () { finish({ pass: false, msgs: ['ERROR your code ran longer than 8 seconds (endless loop?)'] }); }, opts.timeout || 8000);
          w.postMessage({ lab: lab, code: code, outputOnly: !!opts.outputOnly, wasm: MP.wasm.slice(0) });
        } catch (e) { finish({ pass: false, msgs: ['ERROR ' + (e && e.message ? e.message : e)] }); }
      });
    }, function (e) { return { pass: false, msgs: ['ERROR ' + (e && e.message ? e.message : e)] }; });
  }

'''


def port(name, src):
    t = src
    head = "// Ported from Lilith Learning Lab by tools/port.py. Edit there or re-port; do not hand-edit.\n"
    # drop the UMD wrapper
    t = re.sub(r"\(function \(root\) \{\n  'use strict';\n", lambda m: IMPORTS.get(name, ""), t, count=1)
    t = re.sub(r"\n  var (N|M) = \(typeof require[^\n]*", "", t)
    t = re.sub(r"\n  var LM = root\.LilithMath[^\n]*", "", t)
    m = re.search(r"\n  if \(typeof module !== 'undefined' && module\.exports\) module\.exports = api;\n  else root\.\w+ = api;\n\}\)\(typeof window !== 'undefined' \? window : globalThis\);\s*$", t)
    assert m, name + ": tail not found"
    t = t[: m.start()]
    t = t.replace("root.katex", "globalThis.katex")
    if name == "course":
        t = t.replace("var FORMAT = 'lilith-course'", "var FORMAT = 'jade-course', FORMATS = ['jade-course', 'lilith-course']")
        t = t.replace("if (raw.format && raw.format !== FORMAT)", "if (raw.format && FORMATS.indexOf(raw.format) < 0)")
        a = t.index("  var pyWasm = null;")
        b = t.index("  /* ----- scripted terminal")
        t = t[:a] + PY_NEW + t[b:]
        t = t.replace("runPython: runPython,", "runPython: runPython, setPython: setPython,")
        t = t.replace("window.lilith.complete()", "window.jade.complete()").replace('"lilith-course"', '"jade-course"')
    if name == "xdc":
        t = t.replace('learner@lilith.local', 'learner@jade.local')
        t = t.replace('{lilith:"update"', '{jade:"update"').replace('post({lilith:"complete"})', 'post({jade:"complete"})')
        t = t.replace('upd.payload.lilith==="complete"', '(upd.payload.jade==="complete"||upd.payload.lilith==="complete")')
        t = t.replace('window.lilith={complete:function(score){post({lilith:"complete",score:score})},report:function(m){post({lilith:"report",msg:String(m)})}};',
                      'window.jade=window.lilith={complete:function(score){post({jade:"complete",score:score})},report:function(m){post({jade:"report",msg:String(m)})}};')
        t = t.replace("window.lilith.complete()", "window.jade.complete()")
    assert "root." not in t and "require(" not in t, name
    t = re.sub(r"Lilith(?=[A-Z])", "", t.replace("Lilith Learning Lab", "jade-edu")).replace("Lilith", "the teacher")
    # dedent one level (the old function body)
    t = "\n".join(l[2:] if l.startswith("  ") else l for l in t.split("\n"))
    keys = re.search(r"var api = \{([^}]*)\};", t, re.S).group(1)
    names = [k.split(":")[0].strip() for k in keys.split(",") if k.strip()]
    tail = "\nexport default api;\nexport { " + ", ".join(names) + " };\n"
    return head + t.rstrip() + "\n" + tail


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Lilith-Learning-Lab/build/src")
    os.makedirs(OUT, exist_ok=True)
    for n in NAMES:
        out = port(n, open(os.path.join(src, n + ".js"), encoding="utf-8").read())
        open(os.path.join(OUT, n + ".js"), "w", encoding="utf-8").write(out)
        print("src/core/%s.js  %d bytes" % (n, len(out)))


if __name__ == "__main__":
    main()
