const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../static/app.js'), 'utf8');
const start = source.indexOf('function takeLatestPerFeed(');
const end = source.indexOf('\nfunction renderReleases()', start);
assert.ok(start >= 0 && end > start, 'latest-per-feed function is present');
const takeLatestPerFeed = vm.runInNewContext(source.slice(start, end) + '\ntakeLatestPerFeed');

const releases = [
  { feed_id: 'busy', title: 'b3' },
  { feed_id: 'busy', title: 'b2' },
  { feed_id: 'quiet', title: 'q2' },
  { feed_id: 'busy', title: 'b1' },
  { feed_id: 'quiet', title: 'q1' },
];
assert.deepEqual(Array.from(takeLatestPerFeed(releases, 2), x => x.title), ['b3', 'b2', 'q2', 'q1']);
assert.deepEqual(Array.from(takeLatestPerFeed(releases, 1), x => x.title), ['b3', 'q2']);

const html = fs.readFileSync(path.join(__dirname, '../static/index.html'), 'utf8');
assert.doesNotMatch(html, /href="\/rss\.xml"/);
assert.equal((html.match(/class="[^"]*copy-rss-link/g) || []).length, 3);
assert.match(html, /id="opml-form"/);
assert.match(html, /id="opml-export"/);
assert.match(html, /value="merge"/);
assert.match(html, /value="replace"/);

const urlStart = source.indexOf('function publicFeedUrl()');
const urlEnd = source.indexOf('\nfunction applyTheme()', urlStart);
assert.ok(urlStart >= 0 && urlEnd > urlStart, 'feed URL and copy functions are present');
const copied = [];
const messages = [];
const env = {
  stateLoaded: true,
  snapshot: { public_feed_url: 'https://releases.example.org/rss.xml' },
  window: { location: { href: 'http://192.0.2.1:8765/' }, prompt: (...args) => messages.push(args) },
  navigator: { clipboard: { writeText: async value => copied.push(value) } },
  URL,
  toast: message => messages.push(message),
  t: key => key,
};
const { publicFeedUrl, copyFeedUrl } = vm.runInNewContext(
  source.slice(urlStart, urlEnd) + '\n({ publicFeedUrl, copyFeedUrl })', env
);

(async () => {
  assert.equal(publicFeedUrl(), 'https://releases.example.org/rss.xml');
  await copyFeedUrl();
  assert.deepEqual(copied, ['https://releases.example.org/rss.xml']);
  assert.equal(messages.at(-1), 'feedCopied');

  env.snapshot.public_feed_url = '';
  assert.equal(publicFeedUrl(), 'http://192.0.2.1:8765/rss.xml');
  env.navigator.clipboard = undefined;
  env.document = {
    body: { append() {} },
    createElement: () => ({ style: {}, select() {}, remove() {} }),
    execCommand: command => command === 'copy',
  };
  await copyFeedUrl();
  assert.equal(messages.at(-1), 'feedCopied');
  const exportStart = source.indexOf("$('#opml-export').addEventListener(");
  const importStart = source.indexOf("$('#opml-form').addEventListener(");
  assert.ok(exportStart >= 0 && importStart > exportStart, 'OPML export handler is present');
  let exportHandler;
  let exportAction;
  const download = { clicked: false, removed: false, click() { this.clicked = true; }, remove() { this.removed = true; } };
  const exportCalls = [];
  vm.runInNewContext(source.slice(exportStart, importStart), {
    $: () => ({ addEventListener: (_event, fn) => { exportHandler = fn; } }),
    withAdmin: action => { exportAction = action(); },
    fetch: async (endpoint, options) => {
      exportCalls.push([endpoint, options.headers['X-Admin-Token']]);
      return { ok: true, blob: async () => 'opml-file' };
    },
    token: 'example-admin-token',
    URL: { createObjectURL: () => 'blob:export', revokeObjectURL: () => {} },
    document: { body: { append() {} }, createElement: () => download },
    setTimeout: () => {},
  });
  exportHandler();
  await exportAction;
  assert.deepEqual(exportCalls, [['/api/feeds/export', 'example-admin-token']]);
  assert.equal(download.download, 'rssonar-feeds.opml');
  assert.equal(download.clicked && download.removed, true);
  const importEnd = source.indexOf("\n$('#token-form')", importStart);
  assert.ok(importStart >= 0 && importEnd > importStart, 'OPML form handler is present');
  const calls = [];
  let handler;
  let pending;
  let approved = false;
  const form = { addEventListener: (event, fn) => { handler = fn; }, reset: () => calls.push('reset') };
  const fields = {
    '#opml-form': form,
    '#opml-file': { files: [{ name: 'subscriptions.opml', size: 100, text: async () => '<opml/>' }] },
    '#opml-mode': { value: 'replace' },
  };
  const context = {
    $: selector => fields[selector],
    api: async endpoint => {
      calls.push(endpoint);
      return endpoint.endsWith('/preview')
        ? { found: 2, new: 1, existing: 3, existing_releases: 20, invalid: 0, duplicate_in_file: 0 }
        : { added: 2, skipped: 0, mode: 'replace' };
    },
    withAdmin: action => { pending = action(); },
    confirm: () => { calls.push('confirm'); return approved; },
    toast: () => {},
    t: key => key,
    load: async () => {},
    setTimeout: () => {},
  };
  vm.runInNewContext(source.slice(importStart, importEnd), context);
  await handler({ preventDefault() {} });
  await pending;
  assert.deepEqual(calls, ['/api/feeds/import/preview', 'confirm']);
  approved = true;
  calls.length = 0;
  await handler({ preventDefault() {} });
  await pending;
  assert.deepEqual(calls, ['/api/feeds/import/preview', 'confirm', '/api/feeds/import', 'reset']);
  console.log('Release limits, RSS clipboard, and OPML confirmation pass.');
})().catch(error => { console.error(error); process.exitCode = 1; });
