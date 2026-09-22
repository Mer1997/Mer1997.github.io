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

GitHub Actions is configured to build and deploy the `master` branch.  The
legacy site remains untouched until the migration is explicitly approved.
