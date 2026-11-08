'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const pluginDir = path.resolve(__dirname, '..');
const client = fs.readFileSync(path.join(pluginDir, 'page-views.njk'), 'utf8').replace(/<\/?script>/g, '');
const flush = () => new Promise(resolve => setImmediate(resolve));
const counter = url => ({ dataset: { cwdPostUrl: url }, textContent: '-', isConnected: true });

function createClient(counters, fetcher, config = {}) {
  const events = new Map();
  const requests = [];
  const document = {
    counters,
    addEventListener(name, handler) { events.set(name, handler); },
    querySelectorAll() { return this.counters; }
  };
  vm.runInNewContext(client, {
    document,
    CONFIG: { cwd: { api_base_url: 'https://comment.example.com/', site_id: 'blog', ...config }, page: { comments: false } },
    AbortController,
    URL,
    fetch: (url, options) => {
      requests.push({ url, options });
      return fetcher(url, options);
    }
  });
  return { document, requests, fire: name => events.get(name)() };
}

test('loads multiple canonical post URLs without comments and does not report visits', async () => {
  const counters = [counter('https://blog.example.com/first/'), counter('https://blog.example.com/second/')];
  const client = createClient(counters, async url => ({ ok: true, json: async () => ({ pv: url.searchParams.get('post_slug').includes('first') ? 42 : 7 }) }));
  client.fire('page:loaded');
  await flush();

  assert.deepEqual(counters.map(item => item.textContent), ['42', '7']);
  assert.deepEqual(counters.map(item => item.dataset.cwdPv), ['42', '7']);
  assert.equal(client.requests.length, 2);
  for (const { url, options } of client.requests) {
    assert.equal(url.pathname, '/api/analytics/pv');
    assert.equal(url.searchParams.get('siteId'), 'blog');
    assert.equal(options.method, undefined);
  }
});

test('deduplicates requests for the same post within one page', async () => {
  const counters = [counter('https://blog.example.com/post/'), counter('https://blog.example.com/post/')];
  const client = createClient(counters, async () => ({ ok: true, json: async () => ({ pv: 12 }) }));
  client.fire('page:loaded');
  await flush();

  assert.equal(client.requests.length, 1);
  assert.deepEqual(counters.map(item => item.textContent), ['12', '12']);
});

test('omits siteId for the default site and accepts zero views', async () => {
  const counters = [counter('https://blog.example.com/post/')];
  const client = createClient(counters, async () => ({ ok: true, json: async () => ({ pv: 0 }) }), { site_id: '' });
  client.fire('page:loaded');
  await flush();

  assert.equal(client.requests[0].url.searchParams.has('siteId'), false);
  assert.equal(counters[0].textContent, '0');
});

test('refreshes a previously displayed post after PJAX navigation', async () => {
  const counters = [counter('https://blog.example.com/post/')];
  let pv = 10;
  const client = createClient(counters, async () => ({ ok: true, json: async () => ({ pv: pv++ }) }));
  client.fire('page:loaded');
  await flush();
  client.fire('pjax:send');
  client.fire('page:loaded');
  await flush();

  assert.equal(client.requests.length, 2);
  assert.equal(counters[0].textContent, '11');
  assert.equal(client.requests[0].options.signal.aborted, true);
});

test('does not apply stale responses after navigation', async () => {
  let resolveFirst;
  const first = counter('https://blog.example.com/first/');
  const second = counter('https://blog.example.com/second/');
  const client = createClient([first], url => url.searchParams.get('post_slug').includes('first')
    ? new Promise(resolve => { resolveFirst = resolve; })
    : Promise.resolve({ ok: true, json: async () => ({ pv: 8 }) }));
  client.fire('page:loaded');
  client.fire('pjax:send');
  client.document.counters = [second];
  client.fire('page:loaded');
  resolveFirst({ ok: true, json: async () => ({ pv: 99 }) });
  await flush();

  assert.equal(first.textContent, '-');
  assert.equal(second.textContent, '8');
});

test('does not mutate a detached counter', async () => {
  const counters = [counter('https://blog.example.com/post/')];
  const client = createClient(counters, async () => ({ ok: true, json: async () => ({ pv: 9 }) }));
  client.fire('page:loaded');
  counters[0].isConnected = false;
  await flush();
  assert.equal(counters[0].textContent, '-');
});

for (const [name, fetcher] of [
  ['HTTP failure', async () => ({ ok: false })],
  ['network failure', async () => { throw new Error('offline'); }],
  ['invalid count', async () => ({ ok: true, json: async () => ({ pv: '<img onerror=alert(1)>' }) })],
  ['negative count', async () => ({ ok: true, json: async () => ({ pv: -1 }) })]
]) {
  test(`keeps the placeholder on ${name}`, async () => {
    const counters = [counter('https://blog.example.com/post/')];
    const client = createClient(counters, fetcher);
    client.fire('page:loaded');
    await flush();
    assert.equal(counters[0].textContent, '-');
  });
}

test('does not request counts when no post metadata exists', async () => {
  const client = createClient([], async () => { throw new Error('unexpected request'); });
  client.fire('page:loaded');
  await flush();
  assert.equal(client.requests.length, 0);
});

function inject(config) {
  let filter;
  const injections = [];
  const warnings = [];
  class Util {
    defaultConfigFile() { return config; }
    getFileContent(file) { return fs.readFileSync(path.join(pluginDir, file), 'utf8'); }
  }
  const hexo = {
    config: {},
    extend: { filter: { register(name, handler) { assert.equal(name, 'theme_inject'); filter = handler; } } },
    log: { warn(message) { warnings.push(message); } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(pluginDir, 'index.js'), 'utf8'), { hexo, __dirname: pluginDir, require: () => Util });
  const points = Object.fromEntries(['comment', 'postMeta', 'bodyEnd'].map(point => [point, { raw(name, html) { injections.push({ point, name, html }); } }]));
  filter(points);
  return { injections, warnings };
}

test('adds page views through postMeta only when opted in', () => {
  const { injections } = inject({ enable: true, api_base_url: 'https://comment.example.com', page_views: true });
  const meta = injections.find(item => item.point === 'postMeta');
  assert.match(meta.html, /post\.permalink \| escape/);
  assert.match(meta.html, /cwd-visitors-count/);
  assert.equal(injections.filter(item => item.point === 'bodyEnd').length, 2);
});

test('keeps comment integration unchanged when page views are disabled', () => {
  const { injections } = inject({ enable: true, api_base_url: 'https://comment.example.com', page_views: false });
  assert.deepEqual(injections.map(item => item.point), ['comment', 'bodyEnd']);
});

test('does not inject disabled or unconfigured integrations', () => {
  assert.equal(inject({ enable: false, page_views: true }).injections.length, 0);
  const missing = inject({ enable: true, page_views: true });
  assert.equal(missing.injections.length, 0);
  assert.equal(missing.warnings.length, 1);
});
