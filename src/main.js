'use strict';

const fs = require('node:fs');

const { createClient } = require('./api');
const { triage, staleActions } = require('./rules');

const CONFIG_FILE = '.autopilot.json';

function repoParts() {
  const full = process.env.GITHUB_REPOSITORY || '';
  const [owner, repo] = full.split('/');
  if (!owner || !repo) throw new Error(`GITHUB_REPOSITORY has an unexpected shape: ${full}`);
  return { owner, repo };
}

/** Config is a workspace-local file with a fixed literal name. */
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Which item should we triage?
 * - pull_request runs: the number from GITHUB_REF (refs/pull/<n>/merge)
 * - issue runs: the issue-number workflow input (digits only)
 */
function targetNumber() {
  const ref = process.env.GITHUB_REF || '';
  const m = ref.match(/^refs\/pull\/(\d+)\/(merge|head)$/);
  if (m) return { number: Number(m[1]), kind: 'pull_request' };
  const input = process.env.INPUT_ISSUE_NUMBER;
  if (input && /^\d+$/.test(String(input))) return { number: Number(input), kind: 'issue' };
  return null;
}

/** Apply one triage decision, tolerating individual API failures. */
async function apply(api, number, decision) {
  const done = [];
  if (decision.labels.length > 0) {
    await api.addLabels(number, decision.labels).catch((e) => done.push(`labels failed: ${e.message}`));
    done.push(`labeled ${decision.labels.join(', ')}`);
  }
  for (const body of decision.comments) {
    await api.addComment(number, body).catch((e) => done.push(`comment failed: ${e.message}`));
    done.push('commented');
  }
  return done;
}

async function main() {
  const token = process.env.INPUT_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Missing token (input "github-token" or GITHUB_TOKEN)');

  const config = loadConfig();
  const api = createClient(token, repoParts());
  const eventName = process.env.GITHUB_EVENT_NAME;

  if (eventName === 'schedule' || eventName === 'workflow_dispatch') {
    const items = (await api.listOpenIssues().catch(() => [])) || [];
    const prs = items.filter((i) => i.pull_request);
    const stale = staleActions(items, config.stale);
    for (const action of stale) {
      if (action.action === 'close') await api.closeIssue(action.number).catch(() => {});
      else await api.addLabels(action.number, [action.label]).catch(() => {});
    }
    console.log(`autopilot: stale sweep → ${stale.length} action(s) on ${items.length - prs.length} issues (+${prs.length} PRs scanned)`);
    return;
  }

  const target = targetNumber();
  if (!target) {
    throw new Error('No triage target: run this on pull_request events (GITHUB_REF) or pass issue-number');
  }

  const item = target.kind === 'pull_request'
    ? await api.getPull(target.number)
    : await api.getIssue(target.number);
  const files = target.kind === 'pull_request'
    ? ((await api.listFiles(target.number).catch(() => [])) || []).map((f) => f.filename)
    : [];

  const decision = triage(
    { title: item.title, author_association: item.author_association, files },
    config,
  );
  const done = await apply(api, target.number, decision);
  console.log(`autopilot: #${target.number} → ${done.join('; ') || 'no rules matched'}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`✖ autopilot: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { repoParts, loadConfig, targetNumber, apply };
