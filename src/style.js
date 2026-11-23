// The player's look: Jade's Vault netrunner UI. Every colour reads a --jade-* token from jade-agent-ui-ux first,
// so a page themed with the stack (setTheme / useStackTheme) restyles the course too.
export const CSS = `
:host{display:block;position:relative;min-height:520px;
  --bg:var(--jade-bg,#040807);--s1:var(--jade-surface,#09100e);--s2:var(--jade-surface-2,#0f1a17);--line:var(--jade-border,#1a2d27);
  --hot:color-mix(in srgb,var(--acc) 38%,var(--line));--fg:var(--jade-fg,#e3f2ed);--dim:var(--jade-muted,#83998f);--acc:var(--jade-accent,#1fe5a5);
  --acc-fg:var(--jade-accent-fg,#00140c);--acc2:var(--jade-accent-2,#ffb8c6);--ok:var(--jade-ok,#1fe5a5);--bad:var(--jade-danger,#ff3d4f);--warn:var(--jade-warn,#f2c14e);
  --code:var(--jade-code,#060c0a);--cut:var(--jade-cut,10px);
  --disp:var(--jade-display,'Rajdhani','Arial Narrow',system-ui,sans-serif);--body:var(--jade-font,'Chakra Petch',system-ui,sans-serif);--mono:var(--jade-mono,'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace);
  color:var(--fg);background:var(--bg);font:15px/1.5 var(--body);container-type:inline-size}
*{box-sizing:border-box}
button{font:inherit;color:inherit}
.app{display:grid;grid-template-columns:260px 1fr;grid-template-rows:auto 1fr;min-height:inherit;height:100%;position:relative;background:var(--bg)}
.app::before{content:"";position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(90deg,color-mix(in srgb,var(--line) 40%,transparent) 0 1px,transparent 1px 32px),repeating-linear-gradient(0deg,color-mix(in srgb,var(--line) 40%,transparent) 0 1px,transparent 1px 32px);opacity:.55}
.app::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:9;background:repeating-linear-gradient(0deg,rgb(0 0 0/.16) 0 1px,transparent 1px 3px);mix-blend-mode:multiply}
.cut{clip-path:polygon(var(--cut) 0,100% 0,100% calc(100% - var(--cut)),calc(100% - var(--cut)) 100%,0 100%,0 var(--cut))}
.frame{background:var(--hot);padding:1px}
.frame>.in{background:var(--s1);height:100%}
.disp{font-family:var(--disp);text-transform:uppercase;letter-spacing:.08em}
header.bar{grid-column:1/-1;display:flex;align-items:center;gap:14px;padding:10px 16px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--s1) 88%,transparent);position:relative;z-index:2}
header .tag{font:600 11px/1 var(--mono);color:var(--acc);letter-spacing:.14em;border:1px solid var(--hot);padding:4px 6px}
header h1{margin:0;font:700 22px/1.05 var(--disp);letter-spacing:.06em;text-transform:uppercase;text-shadow:0 0 18px color-mix(in srgb,var(--acc) 35%,transparent)}
header small{display:block;color:var(--dim);font-size:12px;letter-spacing:.04em}
header .grow{flex:1;min-width:0}
.meter{width:160px;height:6px;background:var(--s2);border:1px solid var(--line);position:relative}
.meter i{position:absolute;inset:0 auto 0 0;background:var(--acc);box-shadow:0 0 10px var(--acc)}
.pct{font:600 12px var(--mono);color:var(--acc);min-width:3.2em;text-align:right}
.icon.menu{display:none}
nav.rail{border-right:1px solid var(--line);overflow:auto;padding:12px 10px;display:flex;flex-direction:column;gap:6px;background:color-mix(in srgb,var(--s1) 70%,transparent);position:relative;z-index:2}
nav .label{font:600 11px var(--mono);color:var(--dim);letter-spacing:.16em;margin:4px 6px}
nav button{display:grid;grid-template-columns:2.2em 1fr auto;align-items:center;gap:6px;text-align:left;width:100%;padding:8px 10px;border:0;cursor:pointer;
  background:var(--s2);color:var(--fg);clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
nav button .n{font:600 12px var(--mono);color:var(--dim)}
nav button .t{font:600 15px/1.15 var(--disp);letter-spacing:.04em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis}
nav button .st{font:600 11px var(--mono);color:var(--dim)}
nav button.done .st{color:var(--ok)}
nav button:hover{background:color-mix(in srgb,var(--acc) 10%,var(--s2))}
nav button[aria-current=true]{background:color-mix(in srgb,var(--acc) 18%,var(--s2));box-shadow:inset 3px 0 0 var(--acc)}
nav button[aria-current=true] .n{color:var(--acc)}
nav .exam{margin-top:8px;background:color-mix(in srgb,var(--acc2) 12%,var(--s2))}
nav .exam .n{color:var(--acc2)}
main{min-width:0;display:flex;flex-direction:column;position:relative;z-index:2}
.tabs{display:flex;gap:2px;padding:10px 16px 0;border-bottom:1px solid var(--line)}
.tabs button{border:0;background:transparent;padding:8px 14px 9px;cursor:pointer;font:600 14px var(--disp);letter-spacing:.12em;text-transform:uppercase;color:var(--dim);border-bottom:2px solid transparent;margin-bottom:-1px}
.tabs button[aria-selected=true]{color:var(--acc);border-color:var(--acc);text-shadow:0 0 12px color-mix(in srgb,var(--acc) 50%,transparent)}
.tabs .ct{font:500 11px var(--mono);margin-left:4px;opacity:.7}
.view{flex:1;min-height:0;overflow:auto;padding:16px}
.btn{border:0;cursor:pointer;padding:8px 14px;font:600 13px var(--disp);letter-spacing:.1em;text-transform:uppercase;background:var(--s2);color:var(--fg);box-shadow:inset 0 0 0 1px var(--hot);
  clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}
.btn:hover{background:color-mix(in srgb,var(--acc) 14%,var(--s2))}
.btn.primary{background:var(--acc);color:var(--acc-fg);box-shadow:0 0 18px color-mix(in srgb,var(--acc) 40%,transparent)}
.btn:disabled{opacity:.4;cursor:default}
.icon{border:0;background:var(--s2);cursor:pointer;width:34px;height:34px;display:inline-grid;place-items:center;box-shadow:inset 0 0 0 1px var(--line);font-size:13px}
.icon:disabled{opacity:.3}
.icon.big{width:46px;height:46px;background:var(--acc);color:var(--acc-fg);font-size:18px;clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);box-shadow:0 0 18px color-mix(in srgb,var(--acc) 45%,transparent)}
:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
/* lecture */
.lecture{display:grid;grid-template-columns:minmax(0,1fr) 300px;grid-template-rows:1fr auto;gap:14px;height:100%;min-height:440px}
.stage{min-height:300px;position:relative}
.stage .in{display:flex;flex-direction:column;background:radial-gradient(120% 90% at 0% 0%,color-mix(in srgb,var(--acc) 7%,var(--s1)),var(--s1) 60%)}
.slide{flex:1;padding:26px 30px;overflow:auto;position:relative}
.slide .kick{font:600 11px var(--mono);letter-spacing:.18em;color:var(--acc)}
.slide h2{margin:.2em 0 .6em;font:700 30px/1.08 var(--disp);letter-spacing:.04em;text-transform:uppercase}
.slide.title{display:grid;place-content:center;text-align:center}
.slide.title h2{font-size:46px;text-shadow:0 0 28px color-mix(in srgb,var(--acc) 45%,transparent)}
.slide.title .sub{font:600 14px var(--mono);color:var(--acc2);letter-spacing:.2em}
.bul{list-style:none;padding:0;margin:0;display:grid;gap:12px}
.bul li{padding:10px 14px;background:var(--s2);border-left:2px solid var(--line);opacity:.35;transition:opacity .25s,border-color .25s,transform .25s}
.bul li.on{opacity:1;border-color:var(--acc)}
.bul li.now{transform:translateX(4px);box-shadow:inset 0 0 0 1px var(--hot)}
.bul b.head{display:block;font:700 17px var(--disp);letter-spacing:.03em;color:var(--acc)}
.bul .d{color:var(--fg)}
.dots{display:flex;gap:4px;padding:8px 14px;flex-wrap:wrap;border-top:1px solid var(--line)}
.dots button{width:14px;height:6px;border:0;padding:0;background:var(--line);cursor:pointer}
.dots button.on{background:var(--acc);box-shadow:0 0 8px var(--acc)}
.dots button.seen{background:var(--hot)}
.teach{display:grid;grid-template-rows:1fr auto;gap:10px;min-height:0}
.portrait{min-height:220px;position:relative}
.portrait .in{background:linear-gradient(180deg,color-mix(in srgb,var(--acc) 12%,var(--s1)),var(--s1) 70%);position:relative;overflow:hidden}
.portrait .in::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(transparent 70%,var(--s1)),repeating-linear-gradient(0deg,rgb(0 0 0/.12) 0 1px,transparent 1px 3px)}
.portrait .speaking-led{position:absolute;top:10px;right:12px;z-index:2;font:600 10px var(--mono);letter-spacing:.16em;color:var(--dim)}
.portrait.talk .speaking-led{color:var(--acc);text-shadow:0 0 8px var(--acc)}
.dialog .in{padding:12px 14px 14px;min-height:118px}
.dialog .name{display:inline-block;font:700 14px var(--disp);letter-spacing:.18em;color:var(--acc-fg);background:var(--acc);padding:2px 10px;margin-bottom:8px;clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)}
.dialog .lbl{float:right;font:600 10px var(--mono);letter-spacing:.14em;color:var(--dim);margin-top:4px}
.cap{font-size:15px;line-height:1.5;min-height:3em}
.ctrl{grid-column:1/-1;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ctrl .sp{flex:1}
.ctrl select{background:var(--s2);color:var(--fg);border:1px solid var(--line);padding:7px;font:500 12px var(--mono)}
.ctrl .pos{font:600 12px var(--mono);color:var(--dim)}
/* map */
svg.map{width:100%;height:auto;max-height:100%;display:block}
svg.map .node rect{fill:var(--s2);stroke:var(--line)}
svg.map .node text{fill:var(--fg);font:600 12px var(--body)}
svg.map .node.link rect{stroke:var(--acc2)}
svg.map .edge path{fill:none;stroke:var(--hot);stroke-width:1.4}
svg.map .edge text{fill:var(--dim);font:500 10.5px var(--mono)}
svg.map .edge.off{opacity:.12}
svg.map .edge.now path{stroke:var(--acc);stroke-width:2.2;filter:drop-shadow(0 0 4px var(--acc))}
svg.map .edge.now text{fill:var(--acc)}
svg.map .node.lit rect{stroke:var(--acc)}
/* quiz */
.opts{display:grid;gap:8px;margin-top:6px}
.opt{display:flex;gap:10px;align-items:flex-start;text-align:left;width:100%;border:0;cursor:pointer;padding:10px 12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line)}
.opt .k{font:700 14px var(--mono);color:var(--acc)}
.opt:hover:not(:disabled){box-shadow:inset 0 0 0 1px var(--acc)}
.opt.right{box-shadow:inset 0 0 0 1px var(--ok);background:color-mix(in srgb,var(--ok) 14%,var(--s2))}
.opt.wrong{box-shadow:inset 0 0 0 1px var(--bad);background:color-mix(in srgb,var(--bad) 14%,var(--s2))}
.opt:disabled{cursor:default}
.explain{margin-top:12px;padding:10px 12px;border-left:2px solid var(--acc2);background:color-mix(in srgb,var(--acc2) 8%,transparent)}
/* tables, code, read */
table{border-collapse:collapse;width:100%;font-size:14px}
th{font:700 13px var(--disp);letter-spacing:.1em;text-transform:uppercase;color:var(--acc);text-align:left}
th,td{padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}
pre{margin:0;padding:12px 14px;background:var(--code);border:1px solid var(--line);overflow:auto;font:13px/1.5 var(--mono);color:var(--fg)}
code{font-family:var(--mono);font-size:.92em;color:var(--acc)}
pre code{color:inherit}
figure{margin:0;text-align:center}
figure img{max-width:100%;max-height:52vh;background:#fff;padding:8px}
figcaption{color:var(--dim);font-size:13px;margin-top:6px}
.read{max-width:820px;margin:0 auto;display:grid;gap:18px}
.read section h3,.practice h3,.cards h3,.exam h3{font:700 18px var(--disp);letter-spacing:.12em;text-transform:uppercase;color:var(--acc);margin:0 0 8px;display:flex;align-items:center;gap:8px}
.read section h3::before,.cards h3::before,.exam h3::before{content:"";width:8px;height:8px;background:var(--acc);box-shadow:0 0 8px var(--acc)}
.read p{margin:.4em 0}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;margin:0}
dt{font:700 15px var(--disp);color:var(--acc2);letter-spacing:.03em}
dd{margin:0}
.refs a{color:var(--acc)}
.refs li{margin:.3em 0}
.refs small{color:var(--dim)}
.panel{background:var(--s1);box-shadow:inset 0 0 0 1px var(--line);padding:14px 16px}
/* practice */
.practice{display:grid;grid-template-columns:240px 1fr;gap:14px;align-items:start}
.lablist{display:grid;gap:6px}
.lablist button{display:flex;justify-content:space-between;gap:8px;text-align:left;border:0;cursor:pointer;padding:9px 12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line)}
.lablist button[aria-current=true]{box-shadow:inset 3px 0 0 var(--acc),inset 0 0 0 1px var(--hot)}
.lablist .k{font:600 10px var(--mono);color:var(--dim);letter-spacing:.12em}
.lablist .ok{color:var(--ok)}
.lab{display:grid;gap:12px}
.lab-head{display:flex;align-items:baseline;gap:10px}
.lab-head h3{margin:0}
.lab .kind{font:600 10px var(--mono);letter-spacing:.16em;color:var(--acc-fg);background:var(--acc);padding:2px 6px}
.lab .row{display:flex;gap:8px;flex-wrap:wrap}
.lab input,.lab select,.lab textarea,.tin{background:var(--code);color:var(--fg);border:1px solid var(--line);padding:6px 8px;font:14px var(--mono)}
.lab input:focus,.lab select:focus,.lab textarea:focus{outline:1px solid var(--acc);border-color:var(--acc)}
.lab textarea{width:100%;resize:vertical;line-height:1.5}
.lab textarea.prose{font-family:var(--body)}
.fill{line-height:2.4}
.fill input{margin:0 4px}
.order{display:grid;gap:6px;padding-left:1.6em;margin:0}
.order li{padding:6px 8px;background:var(--s2);display:flex;justify-content:space-between;align-items:center;gap:8px}
.order li::marker{color:var(--acc);font-family:var(--mono)}
.match{display:grid;gap:8px}
.match label{display:grid;grid-template-columns:1fr minmax(140px,1fr);gap:10px;align-items:center}
.results{font:13px/1.5 var(--mono);display:grid;gap:2px}
.results .ok{color:var(--ok)}
.results .bad{color:var(--bad)}
.results .out{color:var(--dim)}
.results .verdict{font-weight:700;letter-spacing:.14em}
.term{background:#000;color:#b8ffdf;font:13px/1.45 var(--mono);height:260px;overflow:auto;padding:10px 12px;border:1px solid var(--hot)}
.term .cmd{color:var(--acc)}
.term .err{color:var(--bad)}
.term .warn{color:var(--warn)}
.term .dim{color:var(--dim)}
.term .ok{color:var(--ok)}
.prompt{display:flex;gap:8px;align-items:center;font:13px var(--mono);color:var(--acc)}
.prompt .tin{flex:1}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{border:1px solid var(--line);background:var(--s2);font:12px var(--mono);padding:4px 8px;cursor:pointer}
.tasks{list-style:none;padding:0;margin:0;font:13px var(--mono);color:var(--dim)}
.tasks .ok{color:var(--ok)}
iframe.xdc{width:100%;border:1px solid var(--hot);background:#fff}
/* cards */
.cards{max-width:640px;margin:0 auto;display:grid;gap:12px}
.card{min-height:220px;display:grid;place-items:center;text-align:center;padding:26px;cursor:pointer;font-size:19px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--hot);position:relative}
.card .side{position:absolute;top:10px;left:14px;font:600 11px var(--mono);letter-spacing:.16em;color:var(--acc)}
.card.back{background:color-mix(in srgb,var(--acc) 9%,var(--s1))}
.card.back .side{color:var(--acc2)}
.cards .row{display:flex;justify-content:space-between;align-items:center}
/* exam */
.exam{max-width:820px;margin:0 auto;display:grid;gap:14px}
.exam .q{padding:14px 16px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.exam .q p{margin:0 0 8px}
.score{font:700 40px var(--disp);color:var(--acc);text-shadow:0 0 22px color-mix(in srgb,var(--acc) 45%,transparent)}
.score.fail{color:var(--bad);text-shadow:none}
.empty{color:var(--dim);font-style:italic}
.err{color:var(--bad);font:14px var(--mono);padding:20px;white-space:pre-wrap}
.scrim{display:none}
/* narrow */
@container (max-width:820px){
  .app{grid-template-columns:1fr}
  .icon.menu{display:inline-grid}
  nav.rail{position:absolute;top:0;bottom:0;left:0;width:min(300px,86%);z-index:5;transform:translateX(-102%);transition:transform .2s;background:var(--s1)}
  .app.open nav.rail{transform:none}
  .app.open .scrim{display:block;position:absolute;inset:0;z-index:4;background:rgb(0 0 0/.5)}
  .meter{width:70px}
  header small,header .tag{display:none}
  header h1{font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lecture{grid-template-columns:1fr;grid-template-rows:auto auto auto}
  .stage{min-height:260px}
  .slide{padding:18px}
  .slide h2{font-size:23px}
  .slide.title h2{font-size:32px}
  .teach{grid-template-columns:110px 1fr;grid-template-rows:auto}
  .portrait{min-height:150px}
  .practice{grid-template-columns:1fr}
  .tabs{overflow-x:auto}
  .tabs button{padding:8px 10px}
}
`;
