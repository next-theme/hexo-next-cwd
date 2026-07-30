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
}, (hexo.config.cwd || {}).priority);

