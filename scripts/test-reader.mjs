import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const reading = readFileSync(new URL('../assets/js/reading.js', import.meta.url), 'utf8');
const stats = readFileSync(new URL('../assets/js/stats.js', import.meta.url), 'utf8');
function element(hidden = false) {
  return { hidden, textContent: '', events: {}, dataset: {},
    addEventListener(name, fn) { this.events[name] = fn; },
    focus() {}, scrollIntoView() {}, remove() {} };
}
function reader(value = '{}', hash = '', denied = false) {
  const nodes = Object.fromEntries(['.post-content', '[data-reading-resume]', '[data-back-to-start]', '[data-reading-message]', '[data-reading-continue]', '[data-reading-reset]'].map(s => [s, element()]));
  nodes['[data-reading-resume]'].hidden = true;
  nodes['[data-reading-resume]'].querySelector = s => nodes[s];
  const events = {}, timers = new Map(); let n = 0;
  const ctx = { JSON, Object, Number, Math, Date, scrollY: 0, innerHeight: 800,
    location: { pathname: '/posts/test/', hash },
    localStorage: { getItem() { if (denied) throw Error(); return value; }, setItem(k,v) { if (denied) throw Error(); value = v; } },
    document: { querySelector: s => nodes[s], getElementById: () => element(), addEventListener: (n,f) => events[n] = f },
    addEventListener: (n,f) => events[n] = f,
    setTimeout: f => { timers.set(++n,f); return n; }, clearTimeout: id => timers.delete(id),
    matchMedia: () => ({ matches: true }) };
  ctx.window = ctx;
  ctx.scrollTo = ({top}) => { ctx.scrollY = top; };
  nodes['.post-content'].offsetHeight = 5000;
  nodes['.post-content'].getBoundingClientRect = () => ({ top: 300 - ctx.scrollY });
  vm.runInNewContext(reading, ctx);
  return { nodes, ctx, data: () => JSON.parse(value), fire: name => events[name]?.(),
    click: selector => nodes[selector].events.click({preventDefault(){}}) };
}
const saved = JSON.stringify({'/posts/test/': {ratio: .4, time: Date.now()}});
let r = reader(saved);
assert.equal(r.nodes['[data-reading-resume]'].hidden, false);
r.fire('pagehide'); assert.equal(r.data()['/posts/test/'].ratio, .4);
r.click('[data-reading-continue]'); assert.equal(r.ctx.scrollY, 2092);
r.ctx.scrollY = 5500; r.fire('scroll'); r.fire('pagehide'); assert.equal(r.data()['/posts/test/'], undefined);
r = reader(saved, '#section'); assert.equal(r.nodes['[data-reading-resume]'].hidden, true);
r = reader(saved); r.ctx.location.hash = '#section'; r.fire('hashchange'); assert.equal(r.nodes['[data-reading-resume]'].hidden, true);
r = reader(saved); r.click('[data-reading-reset]'); assert.equal(r.data()['/posts/test/'], undefined);
r = reader(saved); r.click('[data-back-to-start]'); assert.equal(r.data()['/posts/test/'], undefined);
for (const value of ['broken', 'null', '{"/posts/test/":{"ratio":9,"time":0}}']) {
  r = reader(value); assert.equal(r.nodes['[data-reading-resume]'].hidden, true);
}
r = reader(saved, '', true); r.ctx.scrollY = 1200; r.fire('scroll'); r.fire('pagehide');
const many = Object.fromEntries(Array.from({length: 65}, (_,i) => [`/posts/${i}/`,{ratio:.5,time:Date.now()-i}]));
r = reader(JSON.stringify(many)); r.ctx.scrollY = 1200; r.fire('scroll'); r.fire('pagehide'); assert.equal(Object.keys(r.data()).length,50);
r = reader(JSON.stringify({'/posts/test/':{ratio:.5,time:Date.now()-91*86400000}})); assert.equal(r.nodes['[data-reading-resume]'].hidden,true);

function counter(host = 'merisky.top') {
  const nodes = Object.fromEntries(['[data-stats-status]','[data-stats-values]','[data-site-pv]','[data-site-uv]'].map(s => [s,element()]));
  nodes['[data-stats-values]'].hidden = true;
  const root = element(); root.dataset.siteHost = 'merisky.top'; root.querySelector = s => nodes[s];
  let script, timeout;
  const ctx = { Number, Math, location:{hostname:host}, setTimeout: f => {timeout=f;return 1;}, clearTimeout(){}, requestIdleCallback:f=>f(),
    document:{querySelector:()=>root,createElement:()=>element(),head:{append:s=>script=s}} };
  ctx.window=ctx; vm.runInNewContext(stats,ctx);
  return {root,nodes,get script(){return script;},timeout:()=>timeout(),reply:data=>ctx[new URL(script.src).searchParams.get('jsonpCallback')](data)};
}
let c=counter('localhost'); assert.equal(c.root.hidden,true); assert.equal(c.script,undefined);
c=counter(); assert.equal(c.script.referrerPolicy,'origin'); c.reply({site_pv:1234,site_uv:12}); assert.equal(c.nodes['[data-site-pv]'].textContent,'1,234'); assert.equal(c.nodes['[data-stats-values]'].hidden,false);
c=counter(); c.reply({site_pv:'<script>',site_uv:12}); assert.equal(c.nodes['[data-stats-values]'].hidden,true);
c=counter(); c.timeout(); c.reply({site_pv:99,site_uv:2}); assert.equal(c.nodes['[data-stats-values]'].hidden,true);
c=counter(); c.script.events.error(); assert.equal(c.nodes['[data-stats-status]'].textContent,'访问统计暂不可用');
console.log('Reader and counter tests passed: resume/reset/completion/anchors/storage failures/expiry/cap; stats host guard/success/malformed/timeout/network error.');
