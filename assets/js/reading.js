(() => {
  const content = document.querySelector('.post-content');
  const prompt = document.querySelector('[data-reading-resume]');
  const top = document.querySelector('[data-back-to-start]');
  if (!content || !prompt || !top) return;
  const key = 'mer-blog:reading:v1';
  const path = location.pathname;
  const lifetime = 90 * 24 * 60 * 60 * 1000;
  const read = () => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.fromEntries(Object.entries(data).filter(([url, value]) =>
        url.startsWith('/posts/') && value && Number.isFinite(value.ratio) &&
        value.ratio > 0 && value.ratio < 0.98 && Number.isFinite(value.time) &&
        Date.now() - value.time < lifetime));
    } catch { return {}; }
  };
  const saved = read()[path];
  let pending = !!saved && !location.hash;
  let changed = false;
  let timer;
  const range = () => ({
    start: content.getBoundingClientRect().top + scrollY,
    length: Math.max(0, content.offsetHeight - innerHeight * 0.65)
  });
  const store = (remove = false) => {
    if (pending || (!changed && !remove)) return;
    const { start, length } = range();
    const distance = scrollY - start;
    const ratio = length ? Math.min(1, Math.max(0, distance / length)) : 0;
    try {
      const data = read();
      if (remove || distance < 200 || ratio >= 0.98) delete data[path];
      else data[path] = { ratio, time: Date.now() };
      const recent = Object.entries(data).sort((a, b) => b[1].time - a[1].time).slice(0, 50);
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(recent)));
    } catch { /* Storage-disabled/private browsers can still read and navigate. */ }
  };
  if (pending) {
    prompt.querySelector('[data-reading-message]').textContent = `上次读到约 ${Math.round(saved.ratio * 100)}%`;
    prompt.hidden = false;
  }
  prompt.querySelector('[data-reading-continue]').addEventListener('click', () => {
    pending = false;
    prompt.hidden = true;
    const { start, length } = range();
    // Opt-in only; never override incoming heading links or browser restoration.
    window.scrollTo({ top: start + saved.ratio * length, behavior: 'instant' });
    changed = true;
    store();
  });
  prompt.querySelector('[data-reading-reset]').addEventListener('click', () => {
    pending = false;
    prompt.hidden = true;
    store(true);
    const header = document.getElementById('article-start');
    header.focus({ preventScroll: true });
    header.scrollIntoView({ behavior: 'instant' });
  });
  addEventListener('hashchange', () => {
    if (!pending || !location.hash) return;
    pending = false;
    prompt.hidden = true;
    // Removing the prompt changes layout; keep the requested heading aligned.
    try {
      document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' });
    } catch { /* Malformed fragments do not affect reading. */ }
  });
  const updateTop = () => { top.hidden = scrollY < 400; };
  top.addEventListener('click', event => {
    event.preventDefault();
    pending = false;
    prompt.hidden = true;
    clearTimeout(timer);
    store(true);
    const header = document.getElementById('article-start');
    header.focus({ preventScroll: true });
    header.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  addEventListener('scroll', () => {
    updateTop();
    changed = true;
    clearTimeout(timer);
    timer = setTimeout(() => store(), 600);
  }, { passive: true });
  addEventListener('pagehide', () => { clearTimeout(timer); store(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') store();
  });
  addEventListener('pageshow', updateTop);
  updateTop();
})();
