# Hexo NexT CWD

[CWD](https://cwd.js.org) comments for the [NexT](https://theme-next.js.org) theme.

## Install

```bash
npm install git+https://github.com/stevenjoezhang/hexo-next-cwd.git
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
  custom_css_url:
  js: https://unpkg.com/cwd-widget@0.1.13/dist/cwd.js
```

By default, the comment thread identifier is `CONFIG.page.path`, which normally
does not start with `/`. Set `cwd_post_slug` in a page's front matter to override
it.

## Custom Widget Builds

The `js` option can point to any browser build exposing `window.CWDComments`.
This makes it possible to use an unreleased fork or a locally hosted build:

```yaml
cwd:
  js: /lib/cwd/cwd.js
```
