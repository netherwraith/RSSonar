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
console.log('Latest releases are limited per feed.');
