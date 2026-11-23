// Node tests of the pure modules and the entry (no browser). ENGINE=<jade-vn-engine>/engine also runs a Python lab.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as edu from '../src/edu.js';
import C from '../src/core/course.js';
import S from '../src/core/slides.js';
import N from '../src/core/narrate.js';
import X from '../src/core/xdc.js';
import Mt from '../src/core/math.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const course = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/stack-101.course.json'), 'utf8'));

const v = await edu.validate(course);
ok(v.ok && v.warnings.length === 0, 'example course validates with no warnings');
ok(v.course.format === 'jade-course', 'format is jade-course');
ok(C.validate({ ...course, format: 'lilith-course' }).ok, 'lilith-course files still load');
ok(!C.validate({ ...course, format: 'other' }).ok, 'a foreign format is refused');
ok(!C.validate('{').ok && !C.validate({ title: 'x' }).ok, 'bad JSON and missing chapters are refused');
ok((await edu.template()).format === 'jade-course' && C.validate(C.template()).ok, 'template validates');
ok(/jade-vn-engine@[0-9a-f]{7}\/engine\/vendor\/$/.test(edu.config.python), 'Python comes from the pinned jade-vn-engine');

const ch = v.course.chapters[0], lec = S.buildLecture(C.chapterView(ch, v.course), {});
const types = new Set(lec.slides.map((s) => s.type));
ok(['title', 'map', 'bullets', 'table', 'figure', 'quiz', 'practice', 'end'].every((t) => types.has(t)), 'lecture has every slide kind: ' + [...types]);
ok(lec.chunks.every((c) => c.slide < lec.slides.length), 'chunks point at slides');
ok(lec.chunks.some((c) => c.hold) && lec.chunks.some((c) => c.feedback), 'quiz holds and leaves a feedback chunk');

const L = Object.fromEntries(v.course.chapters.flatMap((c) => c.practice).map((l) => [l.id, l]));
ok(C.checkFill(L.url, ['gh', '0.1.0']).pass && !C.checkFill(L.url, ['npm', 'v0.1.0']).pass, 'fill check (alternatives)');
ok(C.checkOrder(L.boot, L.boot.items).pass && !C.checkOrder(L.boot, L.boot.items.slice().reverse()).pass, 'order check');
ok(C.checkMatch(L.roles, L.roles.pairs.map((p) => p[1])).pass, 'match check');
ok(C.runCodeSync(L.cdn, L.cdn.solution).pass && !C.runCodeSync(L.cdn, L.cdn.starter).pass, 'code lab: solution passes, starter fails');
const term = C.makeScriptTerm(L.cli);
['jade vn new mygame', 'jade vn build mygame', 'jade edu validate course.json'].forEach((c) => term.exec(c));
ok(term.tasks.every((t) => term.state.done[t.id]), 'terminal lab: all tasks done');
const html = (await X.labToHtml(L.pincheck, [], 'Learner')).html;
ok(/window\.jade=window\.lilith=/.test(html) && /window\.webxdc=/.test(html), 'webxdc shim exposes window.jade and window.webxdc');
ok(N.speakable('The CDN serves $x^2$') && Mt.hasMath('$x^2$') && !Mt.hasMath('costs $5 and $6'), 'speech text and math detection');

const ENGINE = process.env.ENGINE ? path.resolve(process.env.ENGINE) : path.join(ROOT, '..', 'vn-engine', 'engine');
if (fs.existsSync(path.join(ENGINE, 'vendor', 'micropython.mjs'))) {
  const { loadMicroPython } = await import(pathToFileURL(path.join(ENGINE, 'vendor', 'micropython.mjs')).href);
  const run = async (code) => { const out = []; const mp = await loadMicroPython({ stdout: (s) => out.push(s), stderr: (s) => out.push(s) }); return C.runPythonCore(mp, L.xp, code, out, false); };
  ok((await run(L.xp.solution)).pass, 'python lab passes its solution on MicroPython');
  ok(!(await run(L.xp.starter)).pass, 'python lab fails the starter');
} else console.log('skip python (no ENGINE)');

// every module the CDN serves is self-contained: relative imports only, no bare specifiers
for (const f of fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }).filter((f) => f.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
  const bare = [...src.matchAll(/^\s*(?:import|export)[^;\n]*?from\s*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/gm)].map((m) => m[1] || m[2]).filter((s) => !s.startsWith('.'));
  ok(!bare.length, 'src/' + f + ' imports only relative paths' + (bare.length ? ': ' + bare : ''));
}
console.log(fails ? fails + ' failed' : 'all passed');
process.exit(fails ? 1 : 0);
