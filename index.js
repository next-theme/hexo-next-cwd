/* global hexo */

'use strict';

const Util = require('@next-theme/utils');
const utils = new Util(hexo, __dirname);

hexo.extend.filter.register('theme_inject', injects => {
  const config = utils.defaultConfigFile('cwd', 'default.yaml');
  if (!config.enable) return;

  if (!config.api_base_url) {
    hexo.log.warn('cwd.api_base_url can\'t be null.');
    return;
  }

  injects.comment.raw('cwd', `
  {% if page.comments %}
  <div class="comments cwd-container"></div>
  {% endif %}
  `);

  injects.bodyEnd.raw('cwd', utils.getFileContent('cwd.njk'));

  if (config.page_views) {
    injects.postMeta.raw('cwd-page-views', `
    <span class="post-meta-item" title="{{ __('post.views') }}">
      <span class="post-meta-item-icon"><i class="far fa-eye"></i></span>
      <span class="post-meta-item-text">{{ __('post.views') + __('symbol.colon') }}</span>
      <span class="cwd-visitors-count" data-cwd-post-url="{{ post.permalink | escape }}">-</span>
    </span>
    `);
    injects.bodyEnd.raw('cwd-page-views', utils.getFileContent('page-views.njk'));
  }
}, (hexo.config.cwd || {}).priority);

