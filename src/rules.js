'use strict';

const { matchPath } = require('./glob');

/**
 * Pure triage engine: decide what autopilot should do with an item.
 * All rules come from .autopilot.json — nothing here touches the network.
 *
 * Config schema:
 * {
 *   "labelByPath":  [{ "glob": "src/**", "label": "backend" }],
 *   "labelByTitle": [{ "pattern": "^\\[bug\\]", "flags": "i", "label": "bug" }],
 *   "welcome":      { "comment": "Thanks for your first contribution!" },
 *   "stale":        { "days": 30, "label": "stale",
 *                     "closeAfterDays": 45,
 *                     "comment": "This thread looks quiet…" }
 * }
 */

/**
 * Labels for a PR based on its changed files.
 * @param {string[]} filePaths
 * @param {Array<{glob: string, label: string}>} rules
 * @returns {string[]}
 */
function labelsForFiles(filePaths, rules) {
  const labels = new Set();
  for (const rule of rules || []) {
    if (!rule || !rule.glob || !rule.label) continue;
    if (filePaths.some((p) => matchPath(p, [rule.glob]))) labels.add(rule.label);
  }
  return [...labels];
}

/**
 * Labels for an issue/PR title based on regex rules.
 * Invalid regexes are skipped, never thrown — a bad rule must not break triage.
 */
function labelsForTitle(title, rules) {
  const labels = new Set();
  for (const rule of rules || []) {
    if (!rule || !rule.pattern || !rule.label) continue;
    try {
      if (new RegExp(rule.pattern, rule.flags || '').test(String(title || ''))) labels.add(rule.label);
    } catch {
      // invalid user regex — ignore this rule
    }
  }
  return [...labels];
}

/**
 * Comment for first-time contributors.
 * @param {{ author_association?: string }} item
 * @param {{ comment?: string } | undefined} welcome
 * @returns {string | null}
 */
function welcomeComment(item, welcome) {
  if (!welcome || !welcome.comment) return null;
  return item && item.author_association === 'FIRST_TIME_CONTRIBUTOR' ? welcome.comment : null;
}

/** Milliseconds per day. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Decide label/close actions for stale items.
 * @param {Array<{number: number, updated_at: string, labels?: Array<{name: string}>}>} items
 * @param {{ days: number, label: string, closeAfterDays?: number }} stale
 * @param {Date} [now]
 * @returns {Array<{number: number, action: 'label'|'close', label?: string}>}
 */
function staleActions(items, stale, now = new Date()) {
  if (!stale || !stale.days || !stale.label) return [];
  const out = [];
  const hasLabel = (item) => (item.labels || []).some((l) => l && l.name === stale.label);
  for (const item of items || []) {
    const ageDays = (now.getTime() - new Date(item.updated_at).getTime()) / DAY_MS;
    if (!Number.isFinite(ageDays) || ageDays < stale.days || hasLabel(item)) continue;
    if (stale.closeAfterDays && ageDays >= stale.closeAfterDays) {
      out.push({ number: item.number, action: 'close' });
    } else {
      out.push({ number: item.number, action: 'label', label: stale.label });
    }
  }
  return out;
}

/**
 * Full triage decision for one freshly opened/updated item.
 * @param {{ title?: string, author_association?: string, files?: string[] }} item
 * @param {object} config
 * @returns {{ labels: string[], comments: string[] }}
 */
function triage(item, config) {
  const labels = [
    ...labelsForFiles(item.files || [], config.labelByPath),
    ...labelsForTitle(item.title, config.labelByTitle),
  ];
  const comments = [];
  const wc = welcomeComment(item, config.welcome);
  if (wc) comments.push(wc);
  return { labels, comments };
}

module.exports = { labelsForFiles, labelsForTitle, welcomeComment, staleActions, triage, DAY_MS };
