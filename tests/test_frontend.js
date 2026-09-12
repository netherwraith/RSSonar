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
  console.log('Release limits and RSS clipboard actions pass.');
})().catch(error => { console.error(error); process.exitCode = 1; });
