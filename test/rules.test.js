'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { globToRegex, matchPath } = require('../src/glob');
const { labelsForFiles, labelsForTitle, welcomeComment, staleActions, triage } = require('../src/rules');

test('globToRegex handles *, ** and literals', () => {
  assert.ok(globToRegex('src/**').test('src/deep/nested/file.js'));
  assert.ok(!globToRegex('src/**').test('web/src/app.js'));
  assert.ok(globToRegex('*.md').test('README.md'));
  assert.ok(!globToRegex('*.md').test('docs/README.md'));
  assert.ok(globToRegex('file?.js').test('file1.js'));
  assert.ok(!globToRegex('file?.js').test('file10.js'));
  assert.ok(globToRegex('a.b+c.js').test('a.b+c.js'));
});

test('matchPath normalizes backslashes', () => {
  assert.ok(matchPath('src\\app.js', ['src/**']));
});

test('labelsForFiles applies path rules once per label', () => {
  const rules = [
    { glob: 'src/**', label: 'backend' },
    { glob: '**/*.test.*', label: 'tests' },
    { glob: '', label: 'ignored' },
  ];
  const labels = labelsForFiles(['src/app.js', 'src/app.test.js', 'src/app.test.js'], rules);
  assert.deepEqual(labels.sort(), ['backend', 'tests']);
});

test('labelsForTitle skips broken regexes without throwing', () => {
  const rules = [
    { pattern: '^\\[bug\\]', flags: 'i', label: 'bug' },
    { pattern: '([unclosed', label: 'never' },
  ];
  assert.deepEqual(labelsForTitle('[BUG] crash on save', rules), ['bug']);
  assert.deepEqual(labelsForTitle('plain title', rules), []);
});

test('welcomeComment fires only for first-time contributors', () => {
  const cfg = { comment: 'welcome!' };
  assert.equal(welcomeComment({ author_association: 'FIRST_TIME_CONTRIBUTOR' }, cfg), 'welcome!');
  assert.equal(welcomeComment({ author_association: 'CONTRIBUTOR' }, cfg), null);
  assert.equal(welcomeComment({ author_association: 'FIRST_TIME_CONTRIBUTOR' }, undefined), null);
});

test('staleActions labels and closes at the right ages', () => {
  const now = new Date('2026-09-10T12:00:00Z');
  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
  const items = [
    { number: 1, updated_at: daysAgo(40), labels: [] },
    { number: 2, updated_at: daysAgo(10), labels: [] },
    { number: 3, updated_at: daysAgo(60), labels: [] },
    { number: 4, updated_at: daysAgo(40), labels: [{ name: 'stale' }] },
  ];
  const actions = staleActions(items, { days: 30, label: 'stale', closeAfterDays: 50 }, now);
  assert.deepEqual(actions, [
    { number: 1, action: 'label', label: 'stale' },
    { number: 3, action: 'close' },
  ]);
  assert.deepEqual(staleActions(items, undefined, now), []);
});

test('triage combines path labels, title labels and welcome comment', () => {
  const config = {
    labelByPath: [{ glob: 'src/**', label: 'backend' }],
    labelByTitle: [{ pattern: '^\\[bug\\]', flags: 'i', label: 'bug' }],
    welcome: { comment: 'first! 🎉' },
  };
  const decision = triage(
    { title: '[bug] login broken', author_association: 'FIRST_TIME_CONTRIBUTOR', files: ['src/auth.js'] },
    config,
  );
  assert.deepEqual(decision.labels.sort(), ['backend', 'bug']);
  assert.deepEqual(decision.comments, ['first! 🎉']);
});
