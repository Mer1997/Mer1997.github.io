(() => {
  const root = document.querySelector('[data-visitor-stats]');
  // Local previews and alternate preview domains must never pollute live counts.
  if (!root) return;
  if (location.hostname !== root.dataset.siteHost) { root.hidden = true; return; }
  const run = () => {
    const status = root.querySelector('[data-stats-status]');
    const callback = `merBlogStats_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    let finished = false;
    const finish = data => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      script.remove();
      // A late JSONP response after timeout should be harmless.
      window[callback] = () => {};
      if (data && Number.isSafeInteger(data.site_pv) && data.site_pv >= 0 &&
          Number.isSafeInteger(data.site_uv) && data.site_uv >= 0) {
        root.querySelector('[data-site-pv]').textContent = data.site_pv.toLocaleString('zh-CN');
        root.querySelector('[data-site-uv]').textContent = data.site_uv.toLocaleString('zh-CN');
        root.querySelector('[data-stats-values]').hidden = false;
        status.hidden = true;
      } else status.textContent = '访问统计暂不可用';
    };
    const timeout = setTimeout(() => finish(null), 8000);
    window[callback] = finish;
    script.async = true;
    // Only site-level totals are needed. Do not send article paths or URL queries.
    script.referrerPolicy = 'origin';
    script.src = `https://busuanzi.ibruce.info/busuanzi?jsonpCallback=${callback}`;
    script.addEventListener('error', () => finish(null));
    document.head.append(script);
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 0);
})();
