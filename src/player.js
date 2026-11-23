// The course player: chapters rail, lecture (slides + talking teacher), reading view, practice labs, flashcards
// and a final exam. Loaded by edu.js the first time a course is shown.
import C from './core/course.js';
import S from './core/slides.js';
import N from './core/narrate.js';
import Mp from './core/maps.js';
import Mt from './core/math.js';
import { CSS } from './style.js';
import { config, teacher as makeTeacher } from './edu.js';

const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const pad2 = (n) => String(n).padStart(2, '0');

let fontsDone = false;
function loadFonts() {
  if (fontsDone || !config.fonts) return; fontsDone = true;
  if (document.getElementById('jade-fonts')) return;      // jade-agent-ui-ux already loaded them
  const F = [['Rajdhani', 'rajdhani', [500, 600, 700]], ['Chakra Petch', 'chakra-petch', [400, 500, 600]], ['JetBrains Mono', 'jetbrains-mono', [400, 600]]];
  const st = document.createElement('style'); st.id = 'jade-fonts';
  st.textContent = F.flatMap(([fam, pkg, ws]) => ws.map((w) => `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(https://cdn.jsdelivr.net/npm/@fontsource/${pkg}@5/files/${pkg}-latin-${w}-normal.woff2) format('woff2')}`)).join('');
  document.head.append(st);
}
let katexP = null;
function loadKatex(root) {
  const link = () => h('link', { rel: 'stylesheet', href: config.katex + 'katex.min.css' });
  if (!katexP) katexP = new Promise((ok) => {
    if (globalThis.katex) return ok();
    document.head.append(link());                          // fonts must be declared in the document
    const s = h('script', { src: config.katex + 'katex.min.js' }); s.onload = ok; s.onerror = ok; document.head.append(s);
  });
  if (!root.querySelector('link[href*="katex"]')) root.prepend(link());
  return katexP;
}

/* progress, per course, in localStorage */
function store(id) {
  const key = 'jade-edu:' + id;
  let d = {}; try { d = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) {}
  d.lecture ||= {}; d.quiz ||= {}; d.labs ||= {}; d.exam ||= null;
  return { d, save() { try { localStorage.setItem(key, JSON.stringify(d)); } catch (e) {} } };
}

export class Player {
  constructor(host, opts = {}) {
    this.host = host; this.opts = opts;
    this.root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    this.root.innerHTML = '';
    this.root.append(h('style', {}, CSS));
    this.app = h('div', { class: 'app' }); this.root.append(this.app);
    loadFonts();
    this.tab = 'lecture';
  }

  emit(type, detail = {}) {
    const ev = { type, course: this.course?.id, chapter: this.ch?.id, ...detail };
    this.host.dispatchEvent(new CustomEvent('jade-edu', { detail: ev, bubbles: true, composed: true }));
    this.opts.onEvent?.(ev);
  }

  async open(src) {
    let raw = src;
    try {
      if (typeof src === 'string' && !/^\s*\{/.test(src)) { const r = await fetch(src); if (!r.ok) throw new Error(src + ': ' + r.status); raw = await r.json(); }
      const v = C.validate(raw);
      if (!v.ok) throw new Error('This course does not load:\n' + v.errors.join('\n'));
      this.warnings = v.warnings; this.course = v.course;
    } catch (e) { this.app.replaceChildren(h('div', { class: 'err' }, String(e.message || e))); this.emit('error', { message: String(e.message || e) }); return; }
    const c = this.course;
    C.setPython(config.python);
    N.setPronounce?.(c.pronounce || {});
    this.st = store(c.id);
    if (Mt.hasMath(JSON.stringify(raw))) loadKatex(this.root).then(() => this.retypeset());
    this.shell();
    if (!this.teacher) {
      const spec = this.opts.teacher || c.teacher || 'jade';
      try { this.teacher = await makeTeacher(typeof spec === 'string' && !['jade', 'sprite', 'live2d', 'none'].includes(spec) ? 'jade' : spec); }
      catch (e) { console.warn(e); this.teacher = await makeTeacher('jade'); }
    }
    this.nar?.pause();
    const env = this.opts.voice === 'off' ? N.silentEnv() : N.makeEnv(window);
    this.voice = env;
    this.nar = N.createNarrator(env, {
      onChunk: (i, ch) => this.onChunk(i, ch),
      onSpeaking: (on) => { this.teacher.speaking(on); this.portrait?.classList.toggle('talk', on); },
      onWord: () => this.teacher.word(),
      onHold: (i, ch) => this.onHold(i, ch),
      onDone: () => { this.st.d.lecture[this.ch.id] = true; this.st.save(); this.rail(); this.emit('lecture-done'); },
      onState: (s) => this.onState(s),
      onFail: (why) => { this.caption('The voice stopped working (' + why + '). Captions keep going without it.'); this.nar.load(this.lec.chunks, this.nar.state.i); this.voice = N.silentEnv(); },
    });
    const start = this.opts.chapter ? c.chapters.find((x) => x.id === this.opts.chapter || String(x.n) === String(this.opts.chapter)) : c.chapters.find((x) => x.id === this.st.d.last);
    this.chapter(start || c.chapters[0]);
    this.emit('open', { chapters: c.chapters.length, warnings: this.warnings });
  }

  math(s) { return Mt.render(String(s ?? '')); }
  // KaTeX arrived: redraw what shows math, without wiping a lab or an exam in progress
  retypeset() {
    if (this.tab === 'read' || this.tab === 'cards') this.render();
    else if (this.tab === 'lecture' && this.slideEl && !this.slideEl.querySelector('.opt:disabled')) { this.slideEl.dataset.key = ''; const i = this.nar.state.i; this.onChunk(i, this.lec.chunks[i]); }
  }

  /* ---------------- layout ---------------- */
  shell() {
    const c = this.course;
    this.meter = h('i'); this.pctEl = h('span', { class: 'pct' });
    this.nav = h('nav', { class: 'rail', 'aria-label': 'Chapters' });
    this.tabsEl = h('div', { class: 'tabs', role: 'tablist' });
    this.view = h('section', { class: 'view' });
    this.app.replaceChildren(
      h('header', { class: 'bar' },
        h('button', { class: 'icon menu', 'aria-label': 'Chapters', onclick: () => this.app.classList.toggle('open') }, '☰'),
        h('span', { class: 'tag' }, 'JADE//EDU'),
        h('div', { class: 'grow' }, h('h1', {}, c.title), c.subtitle ? h('small', {}, c.subtitle) : null),
        h('div', { class: 'meter', title: 'Progress' }, this.meter), this.pctEl),
      this.nav, h('div', { class: 'scrim', onclick: () => this.app.classList.remove('open') }),
      h('main', {}, this.tabsEl, this.view));
  }

  progress() {
    const c = this.course, d = this.st.d; let have = 0, want = 0;
    for (const ch of c.chapters) {
      want += 1; have += d.lecture[ch.id] ? 1 : 0;
      if (ch.quiz.length) { want += 1; have += (d.quiz[ch.id]?.best || 0) / ch.quiz.length; }
      for (const l of ch.practice) { want += 1; have += d.labs[ch.id + '/' + l.id] ? 1 : 0; }
    }
    if (c.exam || c.chapters.some((x) => x.quiz.length)) { want += 2; have += d.exam?.passed ? 2 : 0; }
    return want ? have / want : 0;
  }

  rail() {
    const d = this.st.d;
    const items = this.course.chapters.map((ch) => {
      const labs = ch.practice.filter((l) => d.labs[ch.id + '/' + l.id]).length;
      const done = d.lecture[ch.id] && labs === ch.practice.length && (!ch.quiz.length || d.quiz[ch.id]);
      return h('button', { class: done ? 'done' : '', 'aria-current': String(ch === this.ch && this.tab !== 'exam'), onclick: () => { this.app.classList.remove('open'); this.chapter(ch); } },
        h('span', { class: 'n' }, pad2(ch.n)), h('span', { class: 't', title: ch.title }, ch.title),
        h('span', { class: 'st' }, done ? '◆' : ch.practice.length ? labs + '/' + ch.practice.length : d.lecture[ch.id] ? '◇' : ''));
    });
    const hasExam = this.course.exam || this.course.chapters.some((x) => x.quiz.length);
    this.nav.replaceChildren(h('div', { class: 'label' }, 'CHAPTERS'), ...items,
      hasExam ? h('button', { class: 'exam' + (d.exam?.passed ? ' done' : ''), 'aria-current': String(this.tab === 'exam'), onclick: () => { this.app.classList.remove('open'); this.show('exam'); } },
        h('span', { class: 'n' }, 'EX'), h('span', { class: 't' }, this.course.exam?.title || 'Final exam'), h('span', { class: 'st' }, d.exam ? d.exam.score + '%' : '')) : null);
    const p = Math.round(this.progress() * 100);
    this.meter.style.width = p + '%'; this.pctEl.textContent = p + '%';
  }

  tabs() {
    const ch = this.ch;
    const T = [['lecture', 'Lecture'], ['read', 'Read'], ['practice', 'Practice', ch.practice.length], ['cards', 'Cards', ch.cards.length]].filter((t) => t[2] !== 0);
    this.tabsEl.replaceChildren(...T.map(([k, label, n]) => h('button', { role: 'tab', 'aria-selected': String(this.tab === k), onclick: () => this.show(k) }, label, n ? h('span', { class: 'ct' }, n) : null)));
    this.tabsEl.style.display = this.tab === 'exam' ? 'none' : '';
  }

  chapter(ch) {
    this.nar?.pause();
    this.ch = ch; this.view_ = this.course && C.chapterView(ch, this.course);
    this.st.d.last = ch.id; this.st.save();
    this.lec = S.buildLecture(this.view_, { label: 'Chapter' });
    this.starts = S.slideStarts(this.lec);
    this.nar.load(this.lec.chunks, 0);
    this.lab = null;
    if (this.tab === 'exam' || (this.tab === 'practice' && !ch.practice.length) || (this.tab === 'cards' && !ch.cards.length)) this.tab = 'lecture';
    this.render();
    this.emit('chapter', { n: ch.n, title: ch.title });
  }

  show(tab) { if (tab !== 'lecture') this.nar?.pause(); this.tab = tab; this.render(); this.view.scrollTop = 0; }

  render() {
    if (!this.ch) return;
    this.rail(); this.tabs();
    this.wrapCleanup?.(); this.wrapCleanup = null;
    if (this.tab === 'lecture') this.renderLecture();
    else if (this.tab === 'read') this.view.replaceChildren(this.renderRead());
    else if (this.tab === 'practice') this.renderPractice();
    else if (this.tab === 'cards') this.view.replaceChildren(this.renderCards());
    else if (this.tab === 'exam') this.view.replaceChildren(this.renderExam());
  }

  /* ---------------- lecture ---------------- */
  renderLecture() {
    const t = this.teacher;
    this.slideEl = h('div', { class: 'slide' });
    this.dotsEl = h('div', { class: 'dots' });
    this.capEl = h('div', { class: 'cap', 'aria-live': 'polite' });
    this.lblEl = h('span', { class: 'lbl' });
    this.portrait = h('div', { class: 'portrait frame cut' }, h('div', { class: 'in cut' }, t.el, h('span', { class: 'speaking-led' }, '● VOICE')));
    this.playBtn = h('button', { class: 'icon big', 'aria-label': 'Play', onclick: () => this.toggle() }, '▶');
    this.posEl = h('span', { class: 'pos' });
    const rate = h('select', { 'aria-label': 'Speed', onchange: (e) => this.nar.setRate(+e.target.value) }, ...[0.8, 1, 1.15, 1.3, 1.5].map((r) => h('option', { value: r, selected: r === this.nar.state.rate }, r + '×')));
    const voices = this.voice.voices?.() || [];
    const vsel = voices.length > 1 ? h('select', { 'aria-label': 'Voice', onchange: (e) => this.voice.setVoice(e.target.value) }, ...voices.map((v) => h('option', { value: v.name }, v.name.slice(0, 28)))) : null;
    this.view.replaceChildren(h('div', { class: 'lecture' },
      h('div', { class: 'stage frame cut' }, h('div', { class: 'in cut' }, this.slideEl, this.dotsEl)),
      h('aside', { class: 'teach' }, this.portrait,
        h('div', { class: 'dialog frame cut' }, h('div', { class: 'in cut' }, h('span', { class: 'name' }, t.name.toUpperCase()), this.lblEl, this.capEl))),
      h('div', { class: 'ctrl' },
        h('button', { class: 'icon', 'aria-label': 'Previous', onclick: () => this.nar.prev() }, '◀◀'), this.playBtn,
        h('button', { class: 'icon', 'aria-label': 'Next', onclick: () => this.nar.next() }, '▶▶'), this.posEl, h('span', { class: 'sp' }), vsel, rate)));
    t.start();
    const i = Math.min(this.nar.state.i, this.lec.chunks.length - 1);
    this.onChunk(i, this.lec.chunks[i]); this.onState({ playing: this.nar.state.playing, i, n: this.lec.chunks.length });
  }

  toggle() { this.teacher.start(); this.nar.toggle(); }
  caption(s) { if (this.capEl) this.capEl.innerHTML = this.math(s); }

  onState(s) {
    if (!this.playBtn) return;
    this.playBtn.textContent = s.playing ? '❚❚' : '▶'; this.playBtn.setAttribute('aria-label', s.playing ? 'Pause' : 'Play');
    this.posEl.textContent = pad2(s.i + 1) + ' / ' + pad2(s.n);
  }

  onChunk(i, ch) {
    if (!ch || this.tab !== 'lecture' || !this.slideEl) return;
    this.teacher.emotion(ch.emotion || 'neutral');
    if (ch.shown || ch.text) this.caption(ch.shown || ch.text);
    this.lblEl.textContent = (ch.label || '').toUpperCase();
    this.drawSlide(this.lec.slides[ch.slide], ch);
    this.dotsEl.replaceChildren(...this.lec.slides.map((s, k) => h('button', { class: k === ch.slide ? 'on' : k < ch.slide ? 'seen' : '', 'aria-label': 'Slide ' + (k + 1), onclick: () => this.nar.jump(this.starts[k]) })));
  }

  onHold(i, ch) {
    const sl = this.lec.slides[ch.slide];
    if (sl.type !== 'quiz') this.caption((ch.shown || ch.text) + ' <span style="color:var(--dim)">— press ▶ to go on.</span>');
  }

  drawSlide(sl, ch) {
    const el = this.slideEl, step = ch.step || 0;
    el.className = 'slide ' + sl.type;
    const key = sl.type === 'quiz' ? 'q' + ch.slide : ch.slide + ':' + step;      // a quiz keeps its answered state
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    const head = (k) => [h('div', { class: 'kick' }, k), h('h2', { html: this.math(sl.heading) })];
    if (sl.type === 'title') el.replaceChildren(h('div', { class: 'sub' }, (sl.sub || '').toUpperCase()), h('h2', { html: this.math(sl.heading) }), h('div', { class: 'kick' }, this.course.title.toUpperCase()));
    else if (sl.type === 'bullets') el.replaceChildren(...head(sl.stage.toUpperCase()), h('ul', { class: 'bul' }, ...sl.bullets.map((b, k) => h('li', { class: (k <= step ? 'on' : '') + (k === step ? ' now' : '') },
      b.head ? h('b', { class: 'head', html: this.math(b.head) }) : null, b.detail ? h('span', { class: 'd', html: this.math(b.detail) }) : null))));
    else if (sl.type === 'map') el.replaceChildren(...head('CONCEPT MAP'), this.mapSvg(sl.layout, ch.edge));
    else if (sl.type === 'table') el.replaceChildren(...head('TABLE'), this.table(sl.head, sl.rows));
    else if (sl.type === 'code') el.replaceChildren(...head('EXAMPLE'), h('pre', {}, h('code', {}, sl.code)));
    else if (sl.type === 'figure') el.replaceChildren(...head('FIGURE'), this.figure(sl.image, sl.caption));
    else if (sl.type === 'quiz') el.replaceChildren(...head('QUIZ ' + (sl.qi + 1) + '/' + sl.total).slice(0, 1), this.question(sl, ch));
    else if (sl.type === 'practice') el.replaceChildren(...head('PRACTICE'), h('div', { class: 'opts' }, ...sl.labs.map((l) => h('button', { class: 'opt', onclick: () => { this.lab = l.id; this.show('practice'); } }, h('span', { class: 'k' }, l.kind.toUpperCase()), h('span', {}, l.title)))));
    else if (sl.type === 'office') el.replaceChildren(...head('OFFICE HOURS'), h('p', {}, 'Questions about ' + sl.sub + '? Ask, then press ▶ to go on.'));
    else if (sl.type === 'end') el.replaceChildren(...head('COMPLETE'), h('p', { html: this.math(sl.sub) }), this.nextChapterBtn());
    else el.replaceChildren(...head(sl.type.toUpperCase()));
  }

  nextChapterBtn() {
    const cs = this.course.chapters, k = cs.indexOf(this.ch);
    const row = h('div', { class: 'row', style: 'display:flex;gap:8px;margin-top:16px' });
    if (this.ch.practice.length) row.append(h('button', { class: 'btn', onclick: () => this.show('practice') }, 'Practice'));
    if (k < cs.length - 1) row.append(h('button', { class: 'btn primary', onclick: () => this.chapter(cs[k + 1]) }, 'Next chapter ▸'));
    else row.append(h('button', { class: 'btn primary', onclick: () => this.show('exam') }, 'Final exam ▸'));
    return row;
  }

  question(sl, ch) {
    const L = 'ABCDEFGH', q = this.ch.quiz[sl.qi];
    const box = h('div', {}, h('h2', { html: this.math(q.q) }));
    const ex = h('div');
    const btns = q.options.map((o, k) => h('button', { class: 'opt', onclick: () => answer(k) }, h('span', { class: 'k' }, L[k]), h('span', { html: this.math(o) })));
    const answer = (k) => {
      const right = k === q.answer;
      btns.forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
      ex.replaceChildren(h('div', { class: 'explain', html: (right ? '<b>Correct.</b> ' : '<b>Not quite.</b> The answer is ' + L[q.answer] + '. ') + this.math(q.explain || '') }));
      const d = this.st.d, rec = d.quiz[this.ch.id] ||= { answers: {}, best: 0 };
      rec.answers[sl.qi] = right; rec.best = Math.max(rec.best, Object.values(rec.answers).filter(Boolean).length); this.st.save(); this.rail();
      this.emit('quiz', { q: sl.qi, right });
      // narrate the feedback (the chunk after the question is left empty for it)
      const qi = this.starts[this.lec.slides.indexOf(sl)], fb = this.lec.chunks[qi + 1];
      if (fb && fb.feedback) {
        const said = (right ? 'Correct! ' : 'Not quite. The answer is ' + L[q.answer] + ': ' + q.options[q.answer] + '. ') + (q.explain || '');
        fb.text = N.speakable(said); fb.shown = N.caption(said); fb.emotion = right ? 'happy' : 'sad';
        this.nar.jump(qi + 1); this.teacher.start(); this.nar.play();
      }
    };
    box.append(h('div', { class: 'opts' }, ...btns), ex);
    return box;
  }

  mapSvg(L, edge) {
    const svg = svgEl('svg', { class: 'map', viewBox: `0 0 ${L.width} ${L.height}`, role: 'img', 'aria-label': L.outline.join('; ') });
    const lit = new Set();
    L.edges.forEach((e, k) => {
      const cls = edge == null || edge < 0 ? '' : k > edge ? 'off' : k === edge ? 'now' : '';
      if (k === edge) { lit.add(e.from); lit.add(e.to); }
      const g = svgEl('g', { class: 'edge ' + cls });
      g.append(svgEl('path', { d: e.d, 'marker-end': 'url(#arrow)' }));
      const t = svgEl('text', { x: e.lx, y: e.ly, 'text-anchor': 'middle' }); t.textContent = e.rel; g.append(t);
      svg.append(g);
    });
    const defs = svgEl('defs'), mk = svgEl('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    const ap = svgEl('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'currentColor' }); mk.append(ap); defs.append(mk); svg.prepend(defs);
    svg.style.color = 'var(--hot)';
    for (const n of L.nodes) {
      const g = svgEl('g', { class: 'node' + (n.ch ? ' link' : '') + (lit.has(n.id) ? ' lit' : '') });
      const c = 7, x = n.x, y = n.y, w = n.w, hh = n.h;
      g.append(svgEl('polygon', { points: `${x + c},${y} ${x + w},${y} ${x + w},${y + hh - c} ${x + w - c},${y + hh} ${x},${y + hh} ${x},${y + c}`, fill: 'var(--s2)', stroke: lit.has(n.id) ? 'var(--acc)' : n.ch ? 'var(--acc2)' : 'var(--line)' }));
      n.lines.forEach((ln, k) => { const t = svgEl('text', { x: x + w / 2, y: y + 14 + k * 14, 'text-anchor': 'middle' }); t.textContent = ln; g.append(t); });
      if (n.ch) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => { const to = this.course.chapters.find((c2) => c2.n === n.ch); if (to) this.chapter(to); });
      }
      svg.append(g);
    }
    return svg;
  }

  table(head, rows) { return h('table', {}, h('thead', {}, h('tr', {}, ...head.map((x) => h('th', { html: this.math(x) })))), h('tbody', {}, ...rows.map((r) => h('tr', {}, ...r.map((x) => h('td', { html: this.math(x) })))))); }
  figure(name, cap) {
    const svg = this.course.images[name];
    return h('figure', {}, svg ? h('img', { alt: cap || name, src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) }) : h('div', { class: 'empty' }, 'missing figure ' + name), cap ? h('figcaption', { html: this.math(cap) }) : null);
  }

  /* ---------------- read ---------------- */
  renderRead() {
    const ch = this.ch, sec = (title, ...k) => h('section', { class: 'panel' }, h('h3', {}, title), ...k);
    const out = h('div', { class: 'read' }, h('div', {}, h('div', { class: 'kick', style: 'font:600 11px var(--mono);color:var(--acc);letter-spacing:.18em' }, 'CHAPTER ' + pad2(ch.n)), h('h2', { class: 'disp', style: 'margin:.1em 0 0;font:700 32px/1.1 var(--disp)' }, ch.title)));
    if (ch.summary.length) out.append(sec('Summary', ...ch.summary.map((p) => h('p', { html: this.math(p) }))));
    for (const m of ch.maps) { const mp = Mp.parseMaps(C.mapBlock(m))[0]; if (mp) out.append(sec('Concept map', this.mapSvg(Mp.layout(mp)))); }
    if (ch.keyPoints.length) out.append(sec('Key points', h('ul', {}, ...ch.keyPoints.map((p) => h('li', { html: this.math(p) })))));
    if (ch.glossary.length) out.append(sec('Glossary', h('dl', {}, ...ch.glossary.flatMap((g) => [h('dt', { html: this.math(g.term) }), h('dd', { html: this.math(g.def) })]))));
    if (ch.lesson.length) out.append(sec('Lesson', ...ch.lesson.map((b) => {
      if (b.type === 'text') return h('ul', {}, ...b.items.map((t) => h('li', { html: this.math(t) })));
      if (b.type === 'code') return h('pre', {}, h('code', {}, b.code));
      if (b.type === 'table') return h('div', {}, b.title ? h('p', {}, h('b', {}, b.title)) : null, this.table(b.head, b.rows));
      if (b.type === 'figure') return this.figure(b.image, b.caption);
      if (b.type === 'map') { const mp = Mp.parseMaps(C.mapBlock(b.map))[0]; return mp ? this.mapSvg(Mp.layout(mp)) : null; }
      return null;
    }).filter(Boolean)));
    if (ch.references.length) out.append(sec('References', h('ul', { class: 'refs' }, ...ch.references.map((r) => h('li', {}, r.url ? h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.title || r.url) : r.title, r.note ? h('small', {}, ' — ' + r.note) : null)))));
    out.append(this.nextChapterBtn());
    return out;
  }

  /* ---------------- practice ---------------- */
  async renderPractice() {
    const ch = this.ch, d = this.st.d;
    const lab = ch.practice.find((l) => l.id === this.lab) || ch.practice[0];
    this.lab = lab.id;
    const pane = h('div', { class: 'panel' }, h('div', { class: 'empty' }, 'Loading…'));
    this.view.replaceChildren(h('div', { class: 'practice' },
      h('div', { class: 'lablist' }, ...ch.practice.map((l) => h('button', { 'aria-current': String(l === lab), onclick: () => { this.lab = l.id; this.render(); } },
        h('span', {}, h('div', { class: 'k' }, l.type.toUpperCase()), l.title), h('span', { class: d.labs[ch.id + '/' + l.id] ? 'ok' : '' }, d.labs[ch.id + '/' + l.id] ? '◆' : '◇')))),
      pane));
    const { renderLab } = await import('./labs.js');
    if (this.lab !== lab.id || this.tab !== 'practice') return;
    const el = renderLab(lab, {
      C, X: () => import('./core/xdc.js').then((m) => m.default), math: (s) => this.math(s),
      onResult: (pass, msgs) => {
        this.emit('lab', { lab: lab.id, kind: lab.type, pass, msgs });
        if (!pass || d.labs[ch.id + '/' + lab.id]) return;
        d.labs[ch.id + '/' + lab.id] = true; this.st.save(); this.rail();
        const mark = this.view.querySelector('.lablist button[aria-current=true] span:last-child'); if (mark) { mark.className = 'ok'; mark.textContent = '◆'; }
      },
    });
    this.wrapCleanup = el.cleanup;
    pane.replaceChildren(el);
  }

  /* ---------------- flashcards ---------------- */
  renderCards() {
    const cards = this.ch.cards; let k = 0, back = false;
    const card = h('div', { class: 'card', role: 'button', tabindex: '0' });
    const pos = h('span', { class: 'pos', style: 'font:600 12px var(--mono);color:var(--dim)' });
    const draw = () => {
      card.className = 'card cut' + (back ? ' back' : '');
      card.replaceChildren(h('span', { class: 'side' }, back ? 'ANSWER' : 'QUESTION'), h('div', { html: this.math(back ? cards[k].a : cards[k].q) }));
      pos.textContent = pad2(k + 1) + ' / ' + pad2(cards.length);
    };
    const flip = () => { back = !back; draw(); };
    card.addEventListener('click', flip); card.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
    const go = (d) => { k = (k + d + cards.length) % cards.length; back = false; draw(); };
    draw();
    return h('div', { class: 'cards' }, h('h3', {}, 'Flashcards'), card,
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => go(-1) }, '◀ Prev'), pos, h('button', { class: 'btn', onclick: () => go(1) }, 'Next ▶')));
  }

  /* ---------------- final exam ---------------- */
  renderExam() {
    const c = this.course, L = 'ABCDEFGH';
    let qs = c.exam ? c.exam.questions.slice() : c.chapters.flatMap((ch) => ch.quiz);
    const size = c.exam?.size || Math.min(qs.length, 20), pass = c.exam?.passMark || 70;
    qs = qs.map((q) => [Math.random(), q]).sort((a, b) => a[0] - b[0]).slice(0, size).map((x) => x[1]);
    const picks = new Array(qs.length).fill(-1);
    const out = h('div', { class: 'exam' }, h('h3', {}, c.exam?.title || 'Final exam'), h('p', { class: 'empty' }, qs.length + ' questions · pass mark ' + pass + '%' + (this.st.d.exam ? ' · best so far ' + this.st.d.exam.best + '%' : '')));
    const blocks = qs.map((q, i) => {
      const btns = q.options.map((o, k) => h('button', { class: 'opt', onclick: () => { picks[i] = k; btns.forEach((b, j) => b.setAttribute('aria-pressed', String(j === k))); btns.forEach((b, j) => b.style.boxShadow = j === k ? 'inset 0 0 0 1px var(--acc)' : ''); } }, h('span', { class: 'k' }, L[k]), h('span', { html: this.math(o) })));
      return { q, btns, el: h('div', { class: 'q' }, h('p', { html: '<b>' + pad2(i + 1) + '.</b> ' + this.math(q.q) }), h('div', { class: 'opts' }, ...btns)) };
    });
    blocks.forEach((b) => out.append(b.el));
    const res = h('div');
    const submit = h('button', { class: 'btn primary', onclick: () => {
      let right = 0;
      blocks.forEach((b, i) => {
        b.btns.forEach((x, j) => { x.disabled = true; if (j === b.q.answer) x.classList.add('right'); else if (j === picks[i]) x.classList.add('wrong'); });
        if (picks[i] === b.q.answer) right++;
        if (b.q.explain) b.el.append(h('div', { class: 'explain', html: this.math(b.q.explain) }));
      });
      const score = Math.round(100 * right / Math.max(1, qs.length)), ok = score >= pass, d = this.st.d;
      d.exam = { score, best: Math.max(score, d.exam?.best || 0), passed: ok || !!d.exam?.passed }; this.st.save(); this.rail();
      res.replaceChildren(h('div', { class: 'score' + (ok ? '' : ' fail') }, score + '%'), h('p', {}, ok ? 'Passed. Well done.' : 'Not passed yet (' + pass + '% needed). Review the chapters and try again.'),
        h('button', { class: 'btn', onclick: () => this.render() }, 'Try again'));
      submit.remove(); res.scrollIntoView({ behavior: 'smooth' });
      this.emit('exam', { score, passed: ok });
    } }, 'Submit');
    out.append(submit, res);
    return out;
  }

  /** what an agent needs to know about where the learner is */
  state() {
    return { course: this.course?.id, chapter: this.ch?.id, tab: this.tab, progress: Math.round(this.progress() * 100), saved: this.st?.d };
  }
  destroy() { this.nar?.pause(); this.teacher?.destroy(); this.root.innerHTML = ''; }
}
