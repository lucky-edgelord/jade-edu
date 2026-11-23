// Live2D teacher, drawn by jade-vn-engine's Live2D renderer (loaded from the engine's CDN path the first time).
//   live2d({ model: 'hiyori/Hiyori.model3.json', core: 'live2dcubismcore.min.js',
//            expressions: { happy: 'F01' }, motions: { happy: 'TapBody' }, idle: 'Idle', zoom: 1.6, yoffset: 0 })
// The Cubism Core is Live2D's proprietary runtime and is not shipped: give its URL in "core" (you accept
// Live2D's licence by using it). The mouth follows the narrator's word events; the eyes follow the pointer.
import { config } from '../edu.js';

export async function live2d(o = {}) {
  if (!o.model) throw new Error('jade-edu: the live2d teacher needs a "model" (.model3.json URL)');
  const L = await import(/* @vite-ignore */ (o.engine || config.engine) + 'live2d.js');
  const el = document.createElement('div'); el.className = 'teacher live2d';
  el.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden';
  const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  el.append(cv);
  const g = cv.getContext('2d');
  let mouse = [0, 0], level = 0, target = 0, speaking = false, raf = 0, alive = true;
  el.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); mouse = [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; });
  const model = new URL(o.model, document.baseURI).href, core = o.core ? new URL(o.core, document.baseURI).href : undefined;
  const inst = L.create({ mouse: () => mouse, voiceLevel: () => level, redraw: () => {} });
  const spec = { model, core, motion: o.idle || 'Idle', expression: null, look: 'mouse', lipsync: true, zoom: o.zoom || 1, yoffset: o.yoffset || 0, xoffset: o.xoffset || 0 };
  function frame() {
    if (!alive) return;
    const r = el.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), w = Math.max(1, r.width * dpr | 0), h = Math.max(1, r.height * dpr | 0);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    // a speaking mouth: random openings between word events, closed when quiet
    if (speaking && Math.random() < 0.25) target = 0.05 + Math.random() * 0.12;
    if (!speaking) target = 0;
    level += (target - level) * 0.35; target *= 0.9;
    inst.flush?.();
    g.clearRect(0, 0, w, h);
    inst.draw(g, spec, 0, 0, w, h, performance.now() / 1000);
    raf = requestAnimationFrame(frame);
  }
  return {
    kind: 'live2d', name: o.name || 'Teacher', el,
    start: () => { if (!raf) raf = requestAnimationFrame(frame); },
    stop: () => { cancelAnimationFrame(raf); raf = 0; speaking = false; },
    emotion: (e) => {
      if (o.expressions && e in o.expressions) spec.expression = o.expressions[e];
      const m = o.motions && o.motions[e]; if (m) inst.command({ motion: m });
    },
    speaking: (on) => { speaking = on; },
    word: () => { target = 0.12 + Math.random() * 0.06; },
    destroy: () => { alive = false; cancelAnimationFrame(raf); el.remove(); },
  };
}
