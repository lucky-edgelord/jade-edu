// Practice labs: fill, order, match, write, code (JavaScript in a Worker), python (MicroPython in a Worker,
// loaded on first run), terminal (scripted shell) and webxdc (any webxdc app in a sandboxed iframe).
// renderLab(lab, ctx) -> element.  ctx: { C (course module), X (xdc module, loaded on demand), math(s) -> html, onResult(pass, msgs) }
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function shuffled(a) { if (a.length < 2) return a.slice(); let b; do b = shuffle(a); while (b.every((x, i) => x === a[i])); return b; }

function results(box, r) {
  box.replaceChildren(...(r.msgs || []).map((m) => {
    const cls = /^PASS/.test(m) ? 'ok' : /^(FAIL|ERROR)/.test(m) ? 'bad' : /^OUT/.test(m) ? 'out' : '';
    return h('div', { class: 'line ' + cls }, m.replace(/^OUT /, ''));
  }));
  if (r.pass === true) box.prepend(h('div', { class: 'line verdict ok' }, '// PASSED'));
  else if (r.pass === false) box.prepend(h('div', { class: 'line verdict bad' }, '// NOT YET'));
}

function editor(value, rows = 10) {
  const t = h('textarea', { class: 'code', rows, spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off' });
  t.value = value || '';
  t.addEventListener('keydown', (e) => {           // tab inserts spaces
    if (e.key !== 'Tab') return; e.preventDefault();
    const s = t.selectionStart; t.setRangeText('    ', s, t.selectionEnd, 'end');
  });
  return t;
}

export function renderLab(lab, ctx) {
  const { C } = ctx;
  const out = h('div', { class: 'results' });
  const done = (r) => { results(out, r); ctx.onResult(r.pass === true, r.msgs); };
  const body = h('div', { class: 'lab-body' });
  const actions = h('div', { class: 'row' });
  const wrap = h('div', { class: 'lab', 'data-type': lab.type },
    h('div', { class: 'lab-head' }, h('span', { class: 'kind' }, lab.type.toUpperCase()), h('h3', {}, lab.title)),
    lab.intro && lab.type !== 'write' ? h('p', { class: 'intro', html: ctx.math(lab.intro) }) : null,
    body, actions, out);
  const btn = (label, fn, primary) => h('button', { class: 'btn' + (primary ? ' primary' : ''), onclick: fn }, label);
  if (lab.hint) actions.append(btn('Hint', () => results(out, { msgs: ['Hint: ' + lab.hint] })));
  if (lab.solution) actions.append(btn('Show solution', () => { const t = body.querySelector('textarea'); if (t) t.value = lab.solution; else results(out, { msgs: ['Solution: ' + lab.solution] }); }));

  if (lab.type === 'fill') {
    const parts = C.parseFill(lab.text), inputs = [];
    const p = h('p', { class: 'fill' });
    parts.forEach((x) => {
      if (x.t === 'text') p.append(h('span', { html: ctx.math(x.v) }));
      else { const i = h('input', { size: Math.max(4, Math.min(24, (x.alts[0] || '').length + 2)), autocapitalize: 'off', spellcheck: 'false' }); inputs.push(i); p.append(i); }
    });
    body.append(p);
    actions.prepend(btn('Check', () => done(C.checkFill(lab, inputs.map((i) => i.value))), true));
  } else if (lab.type === 'order') {
    let seq = shuffled(lab.items);
    const list = h('ol', { class: 'order' });
    const draw = () => list.replaceChildren(...seq.map((t, i) => h('li', {},
      h('span', { html: ctx.math(t) }),
      h('span', { class: 'mv' },
        h('button', { class: 'icon', 'aria-label': 'Move up', disabled: i === 0, onclick: () => { [seq[i - 1], seq[i]] = [seq[i], seq[i - 1]]; draw(); } }, '▲'),
        h('button', { class: 'icon', 'aria-label': 'Move down', disabled: i === seq.length - 1, onclick: () => { [seq[i + 1], seq[i]] = [seq[i], seq[i + 1]]; draw(); } }, '▼')))));
    draw(); body.append(list);
    actions.prepend(btn('Check', () => done(C.checkOrder(lab, seq)), true));
  } else if (lab.type === 'match') {
    const rights = shuffle(lab.pairs.map((p) => p[1]));
    const sels = lab.pairs.map(() => h('select', {}, h('option', { value: '' }, '—'), ...rights.map((r) => h('option', { value: r }, r))));
    body.append(h('div', { class: 'match' }, ...lab.pairs.map((p, i) => h('label', {}, h('span', { html: ctx.math(p[0]) }), sels[i]))));
    actions.prepend(btn('Check', () => done(C.checkMatch(lab, sels.map((s) => s.value))), true));
  } else if (lab.type === 'write') {
    const t = editor(lab.starter, 6); t.classList.toggle('prose', !lab.lang);
    body.append(h('p', { class: 'intro', html: ctx.math(lab.prompt) }), t);
    actions.prepend(btn('Check', () => done(C.checkWrite(lab, t.value)), true));
  } else if (lab.type === 'code' || lab.type === 'python') {
    const t = editor(lab.starter, 12);
    body.append(t);
    const run = async (outputOnly) => {
      results(out, { msgs: [lab.type === 'python' ? 'Starting Python…' : 'Running…'] });
      const r = lab.type === 'python' ? await C.runPython(lab, t.value, { outputOnly }) : await C.runCode(lab, t.value);
      if (outputOnly) results(out, r); else done(r);
    };
    actions.prepend(btn('Run tests', () => run(false), true));
    if (lab.type === 'python') actions.prepend(btn('Run', () => run(true)));
  } else if (lab.type === 'terminal') {
    const term = C.makeScriptTerm(lab);
    const screen = h('div', { class: 'term', tabindex: '-1' });
    const line = (t, c) => screen.append(h('div', { class: 'tl ' + (c || '') }, t));
    const input = h('input', { class: 'tin', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Command' });
    const tasks = h('ul', { class: 'tasks' });
    const drawTasks = () => tasks.replaceChildren(...term.tasks.map((t) => h('li', { class: term.state.done[t.id] ? 'ok' : '' }, (term.state.done[t.id] ? '[x] ' : '[ ] ') + t.text)));
    (lab.banner || lab.intro || 'Type help to start.').split('\n').forEach((l) => line(l, 'dim'));
    const exec = (cmd) => {
      line(lab.prompt + ' ' + cmd, 'cmd');
      const r = term.exec(cmd);
      if (r === 'CLEAR') screen.replaceChildren(); else r.forEach((x) => line(x.t, x.c));
      screen.scrollTop = screen.scrollHeight; drawTasks();
      if (term.tasks.length && term.tasks.every((t) => term.state.done[t.id])) done({ pass: true, msgs: ['PASS all tasks done'] });
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { exec(input.value); input.value = ''; } });
    body.append(screen, h('div', { class: 'prompt' }, h('span', {}, lab.prompt), input),
      lab.chips.length ? h('div', { class: 'chips' }, ...lab.chips.map((c) => h('button', { class: 'chip', onclick: () => exec(c) }, c))) : null,
      term.tasks.length ? tasks : null);
    drawTasks();
  } else if (lab.type === 'webxdc') {
    const frame = h('iframe', { class: 'xdc', sandbox: 'allow-scripts allow-forms allow-modals', style: `height:${lab.height}px`, title: lab.title });
    body.append(frame);
    ctx.X().then((X) => X.labToHtml(lab, [], 'Learner')).then((r) => { frame.srcdoc = r.html; }, (e) => results(out, { pass: false, msgs: ['ERROR ' + e.message] }));
    const onMsg = (e) => {
      if (e.source !== frame.contentWindow || !e.data) return;
      const k = e.data.jade || e.data.lilith;
      if (k === 'complete') done({ pass: true, msgs: ['PASS the app reported the lab complete' + (e.data.score != null ? ' (score ' + e.data.score + ')' : '')] });
      if (k === 'report') results(out, { msgs: [String(e.data.msg)] });
    };
    addEventListener('message', onMsg);
    wrap.cleanup = () => removeEventListener('message', onMsg);
  }
  return wrap;
}
