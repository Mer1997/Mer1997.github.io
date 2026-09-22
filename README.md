# Mer's Blog

Hugo source for `https://merisky.top/`.

See [`DOMAIN-MIGRATION.md`](DOMAIN-MIGRATION.md) for the verified DNS and
GitHub Pages cutover sequence.

## Local development

```bash
hugo server --buildDrafts
```

## Create a post

```bash
hugo new content posts/my-post.md
```

Edit the generated Markdown file, set `draft = false`, then verify:

```bash
hugo --gc --minify
```

GitHub Actions builds pull requests and deploys the `master` branch.

After a substantive article edit, add or update `lastmod` in the front matter,
for example `lastmod = "2026-09-22T16:00:00+08:00"`. The page displays it only
when it is later than `date`. Historical recovered timestamps are labeled as
archive updates because they come from the old site's Git history.

Use `##`, `###`, and `####` headings for the article directory. Code blocks
receive copy buttons automatically. Edit `content/about.md` for the about page.
