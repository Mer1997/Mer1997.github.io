# Migration status

This Hugo source tree was recovered from the published output of
`Mer1997/Mer1997.github.io` at commit
`d67767b6c8948a29167c21c61d10732d71fcce64`.

## Preserved contract

- 19 published article URLs under `/posts/<id>/`
- 31 legacy image files, with no missing local image references
- publication dates, descriptions, tags, RSS, sitemap, search, and archives
- `merisky.top` in `static/CNAME`
- retired-domain links rewritten to root-relative URLs
- legacy lazy-loaded images rewritten to native `loading="lazy"` images
- the existing Giscus repository and `pathname` mapping
- 129 generated syntax-highlighted code blocks
- 8 Stellar folding blocks, preserved as native `<details>` elements

Recovered posts contain trusted raw HTML inside Markdown files.  This avoids a
lossy conversion of generated syntax highlighting and folding blocks.  New
posts should be authored as normal Markdown.

## Verification

From the parent recovery directory:

```bash
python3 scripts/migrate_legacy.py
cd site
hugo --gc --minify --cleanDestinationDir
cd ..
python3 scripts/validate_build.py
```

The live repository, Pages source, and custom domain have not been modified.
