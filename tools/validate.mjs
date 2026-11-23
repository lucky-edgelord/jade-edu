#!/usr/bin/env node
// jade-edu validate <course.json> [--json] [--template]   checks a course the way the player loads it.
import fs from 'node:fs';
import C from '../src/core/course.js';
const args = process.argv.slice(2), json = args.includes('--json'), files = args.filter((a) => !a.startsWith('--'));
if (args.includes('--template')) { process.stdout.write(JSON.stringify(C.template(), null, 1) + '\n'); process.exit(0); }
if (!files.length) { console.error('usage: jade-edu validate <course.json> [--json] | --template'); process.exit(2); }
let bad = 0; const out = [];
for (const f of files.filter((f) => f !== 'validate')) {
  let v; try { v = C.validate(fs.readFileSync(f, 'utf8')); } catch (e) { v = { ok: false, errors: [String(e.message)], warnings: [] }; }
  const r = { file: f, ok: v.ok, errors: v.errors, warnings: v.warnings, id: v.course?.id, chapters: v.course?.chapters.length,
    labs: v.course ? v.course.chapters.reduce((n, c) => n + c.practice.length, 0) : 0 };
  out.push(r); if (!v.ok) bad++;
  if (!json) {
    console.log(`${f}: ${v.ok ? 'ok' : 'FAILED'}${v.ok ? `, ${r.chapters} chapters, ${r.labs} labs, ${v.warnings.length} warnings` : ''}`);
    v.errors.forEach((e) => console.log('  error: ' + e)); v.warnings.forEach((w) => console.log('  warning: ' + w));
  }
}
if (json) console.log(JSON.stringify(out.length === 1 ? out[0] : out, null, 1));
process.exit(bad ? 1 : 0);
