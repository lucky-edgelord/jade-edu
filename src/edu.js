// jade-edu: interactive courses (lecture slides with a talking teacher, concept maps, quizzes, practice labs,
// flashcards, a final exam) from one JSON file. Part of the Jade Agent Stack.
//
//   <script type="module" src="https://cdn.jsdelivr.net/gh/lucky-edgelord/jade-edu@<ref>/src/edu.js"></script>
//   <jade-course src="my-course.json"></jade-course>
//
// This entry is small: the player, the labs, the teachers, MicroPython and KaTeX are loaded the first time
// they are needed, from the same place this file came from (or the CDN paths below).
export const VERSION = '0.1.0';
export const BASE = new URL('../', import.meta.url).href;

// The rest of the stack, pinned. Override with configure({ ... }).
export const config = {
  // MicroPython for Python labs (same build jade-vn-engine runs its scripts on)
  python: 'https://cdn.jsdelivr.net/gh/lucky-edgelord/jade-vn-engine@fe61a50/engine/vendor/',
  // jade-vn-engine, for the Live2D teacher
  engine: 'https://cdn.jsdelivr.net/gh/lucky-edgelord/jade-vn-engine@fe61a50/engine/',
  // jade-agent-ui-ux, for useStackTheme()
  ui: 'https://cdn.jsdelivr.net/gh/lucky-edgelord/jade-agent-ui-ux@fb6303d/dist/',
  katex: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/',
  fonts: true,
};
export function configure(o = {}) { Object.assign(config, o); return config; }

// Pure modules (no DOM): course format, lecture builder, narration, concept maps, math, webxdc
export const core = {
  course: () => import('./core/course.js').then((m) => m.default),
  slides: () => import('./core/slides.js').then((m) => m.default),
  narrate: () => import('./core/narrate.js').then((m) => m.default),
  maps: () => import('./core/maps.js').then((m) => m.default),
  math: () => import('./core/math.js').then((m) => m.default),
  xdc: () => import('./core/xdc.js').then((m) => m.default),
};

/** validate(json | string) -> { ok, errors, warnings, course } */
export async function validate(raw) { return (await core.course()).validate(raw); }
/** a starter course to edit */
export async function template() { return (await core.course()).template(); }

// Teachers: a factory returns { el, start, stop, emotion(e), speaking(on), word(), destroy() }.
const TEACHERS = {
  jade: (o) => import('./teacher/sprite.js').then((m) => m.jade(o)),
  sprite: (o) => import('./teacher/sprite.js').then((m) => m.sprite(o)),
  live2d: (o) => import('./teacher/live2d.js').then((m) => m.live2d(o)),
  none: (o) => import('./teacher/sprite.js').then((m) => m.none(o)),
};
export function registerTeacher(name, factory) { TEACHERS[name] = factory; }
export function teacher(spec = 'jade') {
  const o = typeof spec === 'string' ? { kind: spec } : { ...spec };
  const f = TEACHERS[o.kind || 'jade'];
  if (!f) throw new Error('jade-edu: unknown teacher "' + o.kind + '"');
  return f(o);
}

/** mount(target, course | url, { teacher, voice, store, onEvent }) -> Promise<player> */
export async function mount(target, course, opts = {}) {
  const { Player } = await import('./player.js');
  const p = new Player(target, opts);
  await p.open(course);
  return p;
}

/** Use the Jade Agent Stack look on the whole page (jade-agent-ui-ux's Vault theme, with grid and scanlines). */
export async function useStackTheme(o = { backdrop: true }) {
  const m = await import(/* @vite-ignore */ config.ui + 'theme.js');
  return m.setTheme(o);
}

if (typeof customElements !== 'undefined' && !customElements.get('jade-course')) {
  customElements.define('jade-course', class extends HTMLElement {
    static get observedAttributes() { return ['src']; }
    connectedCallback() { this.#go(); }
    attributeChangedCallback() { if (this.isConnected) this.#go(); }
    async #go() {
      const src = this.getAttribute('src'); if (!src || src === this._src) return; this._src = src;
      const { Player } = await import('./player.js');
      if (!this.player) {
        let t = this.getAttribute('teacher') || 'jade';
        const model = this.getAttribute('model'); if (model) t = { kind: 'live2d', model, core: this.getAttribute('core') || undefined };
        this.player = new Player(this, { teacher: t, voice: this.getAttribute('voice') || 'auto', chapter: this.getAttribute('chapter') });
      }
      this.player.open(src);
    }
    // the course as validated, the player, and its progress
    get course() { return this.player?.course; }
  });
}
