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
})();
