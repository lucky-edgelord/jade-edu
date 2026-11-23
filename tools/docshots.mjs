// Regenerates the screenshots and demo GIFs in docs/img by driving the real player (headless Chrome).
//   CHROME=/usr/bin/google-chrome ENGINE=../vn-engine/engine node tools/docshots.mjs     (needs ffmpeg)
// ENGINE is a jade-vn-engine checkout's engine/ folder (MicroPython and Live2D); without it those shots are skipped.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tests/serve.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = process.env.ENGINE ? path.resolve(process.env.ENGINE) : path.join(ROOT, '..', 'vn-engine', 'engine');
const hasEngine = fs.existsSync(path.join(ENGINE, 'vendor', 'micropython.wasm'));
const OUT = path.join(ROOT, 'docs', 'img'); fs.mkdirSync(OUT, { recursive: true });
const { url } = await serve({ '/engine/': ENGINE + '/', '/engine-root/': path.join(ENGINE, '..') + '/', '/': ROOT + '/' });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const $ = (p, sel) => p.locator('div >> ' + sel);
async function open(q = '', vp = { width: 1280, height: 800 }) {
  const p = await browser.newPage({ viewport: vp });
  await p.goto(url + '/tests/page.html?fonts=0&' + q);
  await p.waitForFunction(() => window.player && window.player.ch);
  await p.evaluate(() => localStorage.clear());
  return p;
}
const shot = async (p, name) => { await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('png', name); };
async function gif(p, name, frames, every, act, width = 640) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'edu-'));
  for (let i = 0; i < frames; i++) { if (act) await act(i); await p.waitForTimeout(every); await p.screenshot({ path: `${d}/f${String(i).padStart(3, '0')}.png` }); }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(Math.round(1000 / every)), '-i', `${d}/f%03d.png`, '-vf', `scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`, '-loop', '0', `${OUT}/${name}.gif`]);
  console.log('gif', name);
}
const tab = (p, t) => $(p, `.tabs button:has-text("${t}")`).click();

try {
  const p = await open();
  await shot(p, 'lecture');
  await $(p, '.dots button').nth(1).click(); await shot(p, 'lecture-map');
  // a GIF of the lecture: Jade reads along and the slides advance
  await p.evaluate(() => window.player.nar.play && 0);
  await $(p, '.dots button').nth(0).click();
  await $(p, '.ctrl .icon.big').click();
  await gif(p, 'lecture-narration', 28, 220);
  await $(p, '.ctrl .icon.big').click().catch(() => {});
  const qs = await p.evaluate(() => window.player.lec.slides.findIndex((s) => s.type === 'quiz'));
  await $(p, '.dots button').nth(qs).click(); await $(p, '.slide.quiz .opt').first().click(); await shot(p, 'lecture-quiz');
  await p.evaluate(() => window.player.nar.pause());
  await tab(p, 'Read'); await shot(p, 'read');

  await tab(p, 'Practice'); await $(p, '.lab select').first().waitFor(); await shot(p, 'lab-match');
  const pairs = { 'Vault': 'agent loop', 'Agent Base': 'identity and data', 'Agent UI/UX': 'web components', 'jade-edu': 'courses' };
  for (const lab of await $(p, '.match label').all()) await lab.locator('select').selectOption(pairs[(await lab.locator('span').textContent()).trim()]);
  await $(p, '.lab .btn.primary').click(); await shot(p, 'lab-match-pass');
  await $(p, '.lablist button').nth(1).click(); await $(p, '.order').waitFor(); await shot(p, 'lab-order');
  await $(p, '.lablist button').nth(2).click();
  await p.frameLocator('div >> iframe.xdc').locator('button').nth(1).click();
  await p.waitForFunction(() => window.events.some((e) => e.type === 'lab' && e.pass)); await shot(p, 'lab-webxdc');

  await $(p, 'nav.rail button').nth(1).click(); await tab(p, 'Practice');
  const ins = $(p, '.fill input'); await ins.nth(0).fill('gh'); await ins.nth(1).fill('v0.1.0');
  await $(p, '.lab .btn.primary').click(); await shot(p, 'lab-fill');
  await $(p, '.lablist button').nth(1).click();
  await $(p, '.lab .btn:has-text("Run tests")').click(); await $(p, '.results .verdict').waitFor(); await shot(p, 'lab-code-fail');
  await $(p, '.lab .btn:has-text("Show solution")').click(); await $(p, '.lab .btn:has-text("Run tests")').click();
  await $(p, '.results .verdict.ok').waitFor({ timeout: 5000 }); await shot(p, 'lab-code-pass');

  await $(p, 'nav.rail button').nth(2).click(); await tab(p, 'Practice');
  if (hasEngine) {
    await $(p, '.lab .btn:has-text("Show solution")').click(); await $(p, '.lab .btn:has-text("Run tests")').click();
    await $(p, '.results .verdict').waitFor({ timeout: 20000 }); await shot(p, 'lab-python');
  }
  await $(p, '.lablist button').nth(1).click();
  const cmds = ['jade vn new mygame', 'jade vn build mygame', 'jade edu validate course.json'];
  await gif(p, 'lab-terminal', 9, 450, async (i) => { if (i % 3 === 1) { const c = cmds[(i - 1) / 3]; await $(p, '.tin').fill(c); await $(p, '.tin').press('Enter'); } });
  await shot(p, 'lab-terminal');
  await tab(p, 'Cards'); await shot(p, 'cards'); await $(p, '.card').click(); await shot(p, 'cards-flipped');
  await $(p, 'nav.rail button.exam').click();
  const answers = await p.evaluate(() => window.player.course.exam.questions.map((q) => [q.q, q.answer]));
  for (const q of await $(p, '.exam .q').all()) { const t = (await q.locator('p').textContent()).replace(/^\d+\.\s*/, ''); await q.locator('.opt').nth(answers.find((x) => x[0] === t)[1]).click(); }
  await $(p, '.exam .btn.primary').click(); await shot(p, 'exam');
  await p.close();

  // the phone
  const ph = await open('', { width: 390, height: 800 }); await shot(ph, 'phone'); await $(ph, 'header .icon.menu').click().catch(() => {}); await shot(ph, 'phone-menu'); await ph.close();
  // the teachers
  const none = await open('teacher=none'); await shot(none, 'teacher-none'); await none.close();
  if (hasEngine) {
    const m = process.env.LIVE2D_MODEL;
    if (m) { const l = await open(`model=${encodeURIComponent(m)}&core=${encodeURIComponent(process.env.LIVE2D_CORE || '')}`); await l.waitForTimeout(4000); await shot(l, 'teacher-live2d'); await l.close(); }
  }
} finally { await browser.close(); process.exit(0); }
