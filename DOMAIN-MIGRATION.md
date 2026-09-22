# Domain migration plan: merisky.top

Canonical production URL: `https://merisky.top/`

`www.merisky.top` will be configured as a secondary hostname and redirected by
GitHub Pages to the apex domain.

## Current state (2026-08-18)

- Authoritative DNS: `dns31.hichina.com`, `dns32.hichina.com`
- Apex A record: `100.85.217.46`
- Apex AAAA record: none
- `www` CNAME: none
- HTTP and HTTPS on `merisky.top`: unreachable
- GitHub Pages still uses the retired `mer.popstack.site` custom domain
- GitHub Pages still publishes the legacy `master` branch root

## Safe cutover order

1. In GitHub account settings, open **Settings > Pages > Add a domain** and add
   `merisky.top`.
2. Add the exact `_github-pages-challenge-Mer1997` TXT record supplied by
   GitHub in Alibaba Cloud DNS, then complete domain verification. Keep this TXT
   record permanently and do not create wildcard DNS records.
3. Create a backup tag for the currently published static commit and push the
   Hugo source on a review branch.
4. Review the GitHub Actions build, then change the repository Pages source to
   **GitHub Actions** and set its custom domain to `merisky.top`.
5. In Alibaba Cloud DNS, delete the current apex A record `100.85.217.46` and
   add all four GitHub Pages A records:

   ```text
   @  A  185.199.108.153
   @  A  185.199.109.153
   @  A  185.199.110.153
   @  A  185.199.111.153
   ```

6. Add the recommended IPv6 records:

   ```text
   @  AAAA  2606:50c0:8000::153
   @  AAAA  2606:50c0:8001::153
   @  AAAA  2606:50c0:8002::153
   @  AAAA  2606:50c0:8003::153
   ```

7. Add the `www` record:

   ```text
   www  CNAME  Mer1997.github.io.
   ```

8. Wait for DNS propagation, verify A/AAAA/CNAME records, then enable
   **Enforce HTTPS** in GitHub Pages when certificate provisioning finishes.
9. Verify the apex-to-`www` behavior, all 19 legacy post paths, images, search,
   RSS, sitemap, and Giscus.
10. Register `merisky.top` as a new Google/Bing webmaster property and submit
    `https://merisky.top/sitemap.xml`. The retired domain cannot provide a 301
    redirect because it is no longer controlled.

## Content and comments

- All recovered links to the retired domain are root-relative.
- All 27 referenced article images are served from `/images/` on the new domain.
- Giscus uses `pathname`, so keeping `/posts/<id>/` preserves discussion
  mapping across the domain change.
- The Giscus GitHub App must be authorized for
  `Mer1997/Mer1997.github.io.comment` before launch.

## Rollback

- The old generated site remains available in Git history and in the proposed
  pre-migration tag.
- If the Hugo build fails, restore the Pages publishing source or deploy the
  tagged static commit.
- DNS changes are independent of content deployment; do not remove the GitHub
  verification TXT record during rollback.
