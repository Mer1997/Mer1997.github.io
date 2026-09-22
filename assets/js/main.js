// Article tools also run on pages without the homepage search field.
(() => {
  const content = document.querySelector('.post-content');
  if (!content) return;
  const toc = document.querySelector('[data-toc]');
  if (toc) {
    const headings = [...content.querySelectorAll('h2, h3, h4')];
    if (headings.length) {
      const list = document.createElement('ol');
      for (const [index, heading] of headings.entries()) {
        if (!heading.id) {
          let id = `section-${index + 1}`;
          while (document.getElementById(id)) id += '-';
          heading.id = id;
        }
        const item = document.createElement('li');
        item.className = `toc-${heading.tagName.toLowerCase()}`;
        const link = document.createElement('a');
        link.href = `#${encodeURIComponent(heading.id)}`;
        const label = heading.cloneNode(true);
        label.querySelectorAll('.headerlink').forEach(el => el.remove());
        link.textContent = label.textContent.trim();
        link.addEventListener('click', () => {
          if (!wide.matches) toc.querySelector('details').open = false;
        });
        item.append(link);
        list.append(item);
      }
      toc.querySelector('nav').append(list);
      toc.hidden = false;
      const wide = matchMedia('(min-width: 1280px)');
      const sync = () => { toc.querySelector('details').open = wide.matches; };
      sync();
      wide.addEventListener('change', sync);
      const links = [...list.querySelectorAll('a')];
      let active = -1;
      let scheduled = false;
      const update = () => {
        scheduled = false;
        let next = 0;
        const threshold = Math.min(140, innerHeight * 0.22);
        for (let i = 0; i < headings.length; i++) {
          if (headings[i].getBoundingClientRect().top <= threshold) next = i;
        }
        if (content.getBoundingClientRect().bottom <= innerHeight) next = headings.length - 1;
        if (active === next) return;
        if (active >= 0) links[active].removeAttribute('aria-current');
        links[next].setAttribute('aria-current', 'location');
        active = next;
        if (toc.querySelector('details').open) {
          const nav = toc.querySelector('nav');
          const row = links[next].getBoundingClientRect();
          const box = nav.getBoundingClientRect();
          if (row.top < box.top) nav.scrollTop -= box.top - row.top;
          else if (row.bottom > box.bottom) nav.scrollTop += row.bottom - box.bottom;
        }
      };
      const schedule = () => {
        if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
      };
      addEventListener('scroll', schedule, { passive: true });
      addEventListener('resize', schedule);
      addEventListener('hashchange', schedule);
      addEventListener('load', schedule);
      document.fonts?.ready.then(schedule);
      update();
    }
  }

  for (const block of content.querySelectorAll('.highlight')) {
    const source = block.querySelector('td.code pre') || block.querySelector('pre code') || block.querySelector('pre');
    if (!source) continue;
    const toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar';
    const language = document.createElement('span');
    language.className = 'code-language';
    const token = source.dataset.lang || [...source.classList].find(c => c.startsWith('language-'))?.slice(9)
      || [...block.classList].find(c => !['highlight', 'with-copy'].includes(c)) || 'text';
    language.textContent = ({cpp:'C++', c:'C', bash:'Bash', sh:'Shell', js:'JavaScript', javascript:'JavaScript', python:'Python', plaintext:'Text', text:'Text'})[token] || token;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '复制代码';
    button.setAttribute('aria-label', '复制此代码块');
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    button.addEventListener('click', async () => {
      // Legacy Hexo uses <br> for newlines; never include its gutter column.
      const clone = source.cloneNode(true);
      clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      const text = clone.textContent;
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = '已复制';
      } catch {
        status.textContent = '复制失败，请手动选择代码';
      }
      setTimeout(() => { status.textContent = ''; }, 3000);
    });
    toolbar.append(language, status, button);
    const frame = document.createElement('div');
    frame.className = 'code-frame';
    block.before(frame);
    frame.append(toolbar, block);
    block.classList.add('with-copy');
  }
})();

(() => {
  const root = document.querySelector('[data-search]');
  if (!root) return;

  const input = root.querySelector('input');
  const results = root.querySelector('[data-search-results]');
  let posts = null;

  const load = async () => {
    if (posts) return posts;
    const response = await fetch('/search.json');
    if (!response.ok) throw new Error(`search index: ${response.status}`);
    posts = await response.json();
    return posts;
  };

  const render = (matches) => {
    results.replaceChildren();
    results.hidden = false;
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.textContent = '没有找到内容。';
      results.append(empty);
      return;
    }
    for (const post of matches.slice(0, 8)) {
      const link = document.createElement('a');
      link.href = post.url;
      const title = document.createElement('strong');
      title.textContent = post.title;
      const meta = document.createElement('span');
      meta.textContent = `${post.date} · ${(post.tags || []).join(', ')}`;
      link.append(title, meta);
      results.append(link);
    }
  };

  input.addEventListener('input', async () => {
    const query = input.value.trim().toLocaleLowerCase('zh-CN');
    if (!query) {
      results.hidden = true;
      results.replaceChildren();
      return;
    }
    try {
      const index = await load();
      if (input.value.trim().toLocaleLowerCase('zh-CN') !== query) return;
      render(index.filter((post) =>
        [post.title, post.description, post.content, ...(post.tags || [])]
          .join(' ')
          .toLocaleLowerCase('zh-CN')
          .includes(query)
      ));
    } catch (error) {
      console.error(error);
      render([]);
    }
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') results.hidden = true;
  });
  document.addEventListener('click', (event) => {
    if (!root.contains(event.target)) results.hidden = true;
  });
})();
