# Hexo NexT CWD

[CWD](https://cwd.js.org) comments for the [NexT](https://theme-next.js.org) theme.

## Install

```bash
npm install git+https://github.com/next-theme/hexo-next-cwd.git
```

## Configure

The configuration can be placed in either the Hexo or NexT theme `_config.yml`:

```yaml
cwd:
  enable: false
  api_base_url: # Your deployed CWD API endpoint
  site_id: # Recommended for multi-site data isolation
  lang: auto
  # Available values: auto | light | dark
  theme: auto
  page_size: 20
  page_views: false
  custom_css_url:
  js: https://cdn.jsdelivr.net/npm/cwd-widget@0.2.1/dist/cwd.js
```

By default, the comment thread identifier is `CONFIG.page.path`, which normally
does not start with `/`. Set `cwd_post_slug` in a page's front matter to override
it.

## Page Views

Set `cwd.page_views` to `true` to display CWD page views in NexT's post metadata.
The plugin uses the `postMeta` theme injection point, without modifying NexT's
templates. Counts are loaded on post pages and post lists, including PJAX
navigation, independently of lazy-loaded comments.

Counts use each post's canonical permalink and the configured `site_id`. The
plugin only reads `GET /api/analytics/pv`; the CWD widget continues to record
visits, so displaying counts does not add duplicate visits. A failed request
leaves a dash in place of the count.

Disable other page-view integrations, such as `firestore.enable`, to avoid
displaying two counters. Existing counts from other providers are not migrated.

## Custom Widget Builds

The `js` option can point to any browser build exposing `window.CWDComments`.
This makes it possible to use an unreleased fork or a locally hosted build:

```yaml
cwd:
  js: /lib/cwd/cwd.js
```
