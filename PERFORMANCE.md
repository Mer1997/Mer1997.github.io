# Reading UI and performance check — 2026-09-22

## Verified changes

- Unified code toolbar with language label, copy button and accessible status.
- Scroll-driven TOC highlighting (`aria-current="location"`), passive scroll
  listener and one update per animation frame; reduced-motion preference respected.
- Balanced, responsive article titles, with wrapping for unbroken strings.
- Font CSS unicode ranges compacted without modifying font binaries. All 23
  font faces have exactly the same code-point sets before and after.

## Resource sizes

| Resource | Before | After |
| --- | ---: | ---: |
| Font CSS, raw bytes | 317,246 | 40,408 |
| Font CSS, local gzip bytes | 99,677 | 13,899 |

This reduces raw font CSS by 87.3%, and local gzip size by 86.1%.
Local gzip sizes are not a promise of identical CDN transfer sizes.
The common WOFF2 subset remains 232,724 bytes; no typography coverage was removed.
The search index (~175 KB raw) is fetched on input, not at initial page load.
Giscus uses an async loader and lazy iframe; its loader itself is not deferred
until the comments enter the viewport.

## Network sample before deployment

Single `curl --compressed` request per resource against the public site, from
the current development network (including its proxy/routing conditions):

| Resource | HTTP | TTFB seconds | Total seconds | Transferred bytes |
| --- | ---: | ---: | ---: | ---: |
| Homepage | 200 | 3.872 | 5.471 | 2,894 |
| Old font CSS | 200 | 0.680 | 3.577 | 99,671 |
| Common WOFF2 subset | 200 | 1.633 | 12.617 | 232,724 |

These are diagnostic samples, not browser cold-load measurements, Core Web
Vitals, or representative mobile-user latency. No before/after speedup is
claimed from these samples. Font delivery remains worth measuring on real
devices and networks before considering a hosting change.

## Validation

- Hugo 0.165.0: `hugo --minify --panicOnWarning` succeeds.
- Migration validator: all 19 legacy article URLs, links, local images, code
  and folding blocks, search, tags, archives, RSS, sitemap and Giscus mapping pass.
- Browser at 1440 × 900: integrated toolbar and sticky TOC inspected;
  clicking a section updates the highlighted entry after smooth scrolling.
- Browser at 390 × 844: long mixed-language title fits; document width is
  390 px (no page-wide horizontal overflow). Code is 13.12 px versus 16.32 px
  prose. A 518 px code block scrolls inside a 356 px container.
- Copy button returns code with newlines, without language label or toolbar text.
- Mobile TOC expands and closes after selecting a section.

The mobile check uses a narrow desktop browser viewport, not physical iOS Safari.
