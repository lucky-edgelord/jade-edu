// Sprite teacher: four frames per emotion (1 eyes open / mouth shut, 2 open / open, 3 shut / shut, 4 shut / open),
// animated by the narrator's avatar controller (blinks, flaps the mouth on word events).
import N from '../core/narrate.js';

const JADE = new URL('../../assets/jade/', import.meta.url).href;
export const EMOTIONS = ['neutral', 'happy', 'sad', 'mad', 'shy'];

/** sprite({ name, frames: (emotion, n) => url, emotions, fit, position }) */
export function sprite(o = {}) {
  const emotions = o.emotions || EMOTIONS;
  const frame = o.frames || ((e, n) => (o.base || JADE) + e + n + '.' + (o.ext || 'webp'));
  const el = document.createElement('div');
  el.className = 'teacher sprite';
  el.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden';
  const img = new Image(); img.alt = o.name || 'Teacher'; img.decoding = 'async'; img.draggable = false;
  img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:${o.fit || 'cover'};object-position:${o.position || '50% 8%'};user-select:none`;
  el.append(img);
  const cache = {};
  function warm(e) {        // load one emotion's frames the first time it is shown
    if (cache[e]) return; cache[e] = [1, 2, 3, 4].map((n) => { const i = new Image(); i.decoding = 'async'; i.src = frame(e, n); return i; });
  }
  const av = N.createAvatar((e, n) => {
    if (!emotions.includes(e)) e = 'neutral';
    warm(e); const src = frame(e, n); if (img.getAttribute('src') !== src) img.src = src;
  });
  warm('neutral');
  return {
    kind: 'sprite', name: o.name || 'Teacher', el,
    start: () => { av.start(); setTimeout(() => emotions.forEach(warm), 1500); },
    stop: () => av.stop(),
    emotion: (e) => av.emotion(e),
    speaking: (on) => av.speaking(on),
    word: () => av.word(),
    destroy: () => { av.stop(); el.remove(); },
  };
}

/** Jade, the stack's default teacher */
export function jade(o = {}) { return sprite({ name: 'Jade', ...o }); }

/** no picture: the caption box only */
export function none(o = {}) {
  const el = document.createElement('div'); el.className = 'teacher none';
  const f = () => {};
  return { kind: 'none', name: o.name || 'Teacher', el, start: f, stop: f, emotion: f, speaking: f, word: f, destroy: () => el.remove() };
}
