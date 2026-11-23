// Browser test of the player: lecture, quiz, read view, every lab type, cards, exam, narrow layout, Live2D teacher.
//   CHROME=/usr/bin/google-chrome ENGINE=../jade-vn-engine/engine node tests/player.test.mjs
// ENGINE is a jade-vn-engine checkout's engine/ folder (for MicroPython and the Live2D renderer); without it those
// steps are skipped. Screenshots go to tests/out/.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = process.env.ENGINE ? path.resolve(process.env.ENGINE) : path.join(ROOT, '..', 'vn-engine', 'engine');
const hasEngine = fs.existsSync(path.join(ENGINE, 'vendor', 'micropython.wasm'));
const OUT = path.join(ROOT, 'tests', 'out'); fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

const { srv, url } = await serve({ '/engine/': ENGINE + '/', '/engine-root/': path.join(ENGINE, '..') + '/', '/': ROOT + '/' });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
async function open(q = '', vp = { width: 1280, height: 800 }) {
  const p = await browser.newPage({ viewport: vp });
  p.on('pageerror', (e) => errors.push(e.message));
  if (process.env.DEBUG) p.on('console', (m) => console.log('  console:', m.text()));
  await p.goto(url + '/tests/page.html?fonts=0&' + q);
  await p.waitForFunction(() => window.player && window.player.ch);
  return p;
}
const $ = (p, sel) => p.locator('div >> ' + sel);   // pierce the shadow root
const ev = (p, type) => p.evaluate((t) => window.events.filter((e) => e.type === t), type);

try {
  const p = await open();
  await p.evaluate(() => localStorage.clear());
  ok(await $(p, 'header h1').textContent() === 'Jade Agent Stack 101', 'course title in the header');
  ok(await $(p, 'nav.rail button').count() === 4, '3 chapters + final exam in the rail');
  const src0 = await $(p, '.portrait img').getAttribute('src');
  ok(/assets\/jade\/neutral[1-4]\.webp$/.test(src0), 'Jade is the teacher (' + src0 + ')');

  // lecture: play (silent voice reads along), slide advances, map slide edges
  await $(p, '.ctrl .icon.big').click();
  await p.waitForFunction(() => window.player.nar.state.i >= 1, null, { timeout: 8000 });
  ok(true, 'narration advances');
  await $(p, '.ctrl .icon.big').click();
  await $(p, '.dots button').nth(1).click();
  ok(await $(p, '.slide.map svg.map').count() === 1, 'concept map slide');
  await p.screenshot({ path: path.join(OUT, 'lecture-map.png') });

  // quiz slide: answer wrong, explanation shows, progress saved
  const qs = await p.evaluate(() => window.player.lec.slides.findIndex((s) => s.type === 'quiz'));
  await $(p, '.dots button').nth(qs).click();
  await $(p, '.slide.quiz .opt').first().click();
  ok(await $(p, '.slide .explain').count() === 1, 'quiz feedback shown');
  ok((await ev(p, 'quiz')).length === 1, 'quiz event emitted');
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'lecture-quiz.png') });
  // the teacher's mouth moves while the feedback is read
  const frames = new Set();
  for (let k = 0; k < 14; k++) { frames.add(await $(p, '.portrait img').getAttribute('src')); await p.waitForTimeout(90); }
  ok(frames.size >= 2, 'teacher animates while speaking (' + frames.size + ' frames)');
  await p.evaluate(() => window.player.nar.pause());

  // read view
  await $(p, '.tabs button:has-text("Read")').click();
  ok(await $(p, '.read svg.map').count() >= 1 && await $(p, '.read table').count() === 1 && await $(p, '.read figure img').count() === 1, 'read view: map, table, figure');
  await p.screenshot({ path: path.join(OUT, 'read.png'), fullPage: false });

  // practice: match, order, webxdc
  await $(p, '.tabs button:has-text("Practice")').click();
  await $(p, '.lab select').first().waitFor();
  const pairs = { 'Vault': 'agent loop', 'Agent Base': 'identity and data', 'Agent UI/UX': 'web components', 'jade-edu': 'courses' };
  for (const lab of await $(p, '.match label').all()) await lab.locator('select').selectOption(pairs[(await lab.locator('span').textContent()).trim()]);
  await $(p, '.lab .btn.primary').click();
  ok(await $(p, '.results .verdict.ok').count() === 1, 'match lab passes');
  await $(p, '.lablist button').nth(1).click();
  await $(p, '.order').waitFor();
  const want = await p.evaluate(() => window.player.ch.practice[1].items);
  for (let i = 0; i < want.length; i++) {          // bubble each item up to its place
    for (;;) {
      const cur = await $(p, '.order li > span:first-child').allTextContents(); const at = cur.indexOf(want[i]);
      if (at === i) break; await $(p, '.order li').nth(at).locator('button').first().click();
    }
  }
  await $(p, '.lab .btn.primary').click();
  ok(await $(p, '.results .verdict.ok').count() === 1, 'order lab passes');
  await $(p, '.lablist button').nth(2).click();
  const fr = p.frameLocator('div >> iframe.xdc');
  await fr.locator('button').nth(1).click();
  await p.waitForFunction(() => window.events.some((e) => e.type === 'lab' && e.lab === 'pincheck' && e.pass));
  ok(true, 'webxdc lab reports completion through window.jade.complete()');
  await p.screenshot({ path: path.join(OUT, 'practice-webxdc.png') });

  // chapter 2: fill + JS code lab
  await $(p, 'nav.rail button').nth(1).click();
  await $(p, '.tabs button:has-text("Practice")').click();
  const ins = $(p, '.fill input'); await ins.nth(0).fill('gh'); await ins.nth(1).fill('v0.1.0');
  await $(p, '.lab .btn.primary').click();
  ok(await $(p, '.results .verdict.ok').count() === 1, 'fill lab passes');
  await $(p, '.lablist button').nth(1).click();
  await $(p, '.lab .btn:has-text("Run tests")').click();
  await $(p, '.results .verdict').waitFor();
  ok(await $(p, '.results .verdict.bad').count() === 1, 'code lab fails the starter');
  await $(p, '.lab .btn:has-text("Show solution")').click();
  await $(p, '.lab .btn:has-text("Run tests")').click();
  await $(p, '.results .verdict.ok').waitFor({ timeout: 5000 });
  ok(true, 'code lab passes the solution (Worker)');

  // chapter 3: Python (MicroPython from the engine mount) + terminal, math typeset
  await $(p, 'nav.rail button').nth(2).click();
  await $(p, '.tabs button:has-text("Practice")').click();
  if (hasEngine) {
    await $(p, '.lab .btn:has-text("Show solution")').click();
    await $(p, '.lab .btn:has-text("Run tests")').click();
    await $(p, '.results .verdict').waitFor({ timeout: 20000 });
    ok(await $(p, '.results .verdict.ok').count() === 1, 'python lab passes on MicroPython: ' + (await $(p, '.results').textContent()).slice(0, 120));
    await p.screenshot({ path: path.join(OUT, 'practice-python.png') });
  } else console.log('skip python lab (no ENGINE)');
  await $(p, '.lablist button').nth(1).click();
  for (const c of ['jade vn new mygame', 'jade vn build mygame', 'jade edu validate course.json']) { await $(p, '.tin').fill(c); await $(p, '.tin').press('Enter'); }
  ok(await $(p, '.results .verdict.ok').count() === 1, 'terminal lab passes when all tasks are done');
  await p.screenshot({ path: path.join(OUT, 'practice-terminal.png') });

  // cards
  await $(p, '.tabs button:has-text("Cards")').click();
  await $(p, '.card').click();
  ok((await $(p, '.card .side').textContent()) === 'ANSWER', 'flashcard flips');

  // exam: answer all right
  await $(p, 'nav.rail button.exam').click();
  const answers = await p.evaluate(() => window.player.course.exam.questions.map((q) => [q.q, q.answer]));
  for (const q of await $(p, '.exam .q').all()) {
    const t = (await q.locator('p').textContent()).replace(/^\d+\.\s*/, '');
    const a = answers.find((x) => x[0] === t)[1]; await q.locator('.opt').nth(a).click();
  }
  await $(p, '.exam .btn.primary').click();
  ok((await $(p, '.score').textContent()) === '100%', 'exam scored 100%');
  ok(await p.evaluate(() => window.player.state().progress) > 50, 'progress saved: ' + await p.evaluate(() => window.player.state().progress) + '%');
  ok(await p.evaluate(() => !!JSON.parse(localStorage.getItem('jade-edu:jade-stack-101')).exam.passed), 'progress in localStorage');
  await p.screenshot({ path: path.join(OUT, 'exam.png') });
  await p.close();

  // narrow (phone) layout: rail is a drawer
  const m = await open('', { width: 390, height: 844 });
  ok(!(await $(m, 'nav.rail').isVisible()) || (await $(m, 'nav.rail').boundingBox()).x < 0, 'rail hidden on a phone');
  await $(m, '.icon.menu').click(); await m.waitForTimeout(300);
  ok((await $(m, 'nav.rail').boundingBox()).x >= 0, 'menu opens the rail');
  await $(m, '.scrim').click({ position: { x: 370, y: 400 } }); await m.waitForTimeout(300);
  await m.screenshot({ path: path.join(OUT, 'phone.png') });
  await m.close();

  // Live2D teacher: Jade's own model (in jade-vn-engine's Jade's Vault game); the Cubism Core from that checkout if it was
  // fetched (git-ignored there), else from Live2D's site
  const A = '/engine-root/games/jade-vault/assets/';
  const CORE = fs.existsSync(path.join(ENGINE, '..', 'games', 'jade-vault', 'assets', 'live2dcubismcore.min.js')) ? A + 'live2dcubismcore.min.js'
    : 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';
  if (hasEngine && fs.existsSync(path.join(ENGINE, '..', 'games', 'jade-vault', 'assets', 'jade-live2d', 'jadecat.model3.json'))) {
    const l = await open('model=' + A + 'jade-live2d/jadecat.model3.json&core=' + encodeURIComponent(CORE) + '&zoom=1.9&yoff=330');
    await l.waitForTimeout(2500);
    const lit = await l.evaluate(() => {
      const c = window.player.teacher.el.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) n++; return n;
    });
    ok(lit > 50, 'Live2D teacher draws through jade-vn-engine (' + lit + ' samples)');
    await l.screenshot({ path: path.join(OUT, 'live2d.png') });
    await l.close();
  } else console.log('skip Live2D (no model in the engine checkout)');
} catch (e) { console.log('FAIL ' + (e.stack || e)); fails++; }
ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close(); srv.close();
console.log(fails ? fails + ' failed' : 'all passed');
process.exit(fails ? 1 : 0);
