'use strict';

const API_BASE = 'https://api.github.com';

/**
 * Thin GitHub REST client for the few calls autopilot needs.
 * The host is a hardcoded literal — the token never leaves the
 * Authorization header, and no user-supplied URL is ever fetched.
 */
function createClient(token, { owner, repo } = {}) {
  const base = owner && repo ? `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` : API_BASE;

  async function call(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': 'repo-autopilot',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`GitHub API ${method} ${path} → ${res.status} ${res.statusText}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    addLabels: (number, labels) => call(`/issues/${number}/labels`, { method: 'POST', body: { labels } }),
    addComment: (number, body) => call(`/issues/${number}/comments`, { method: 'POST', body: { body } }),
    closeIssue: (number) => call(`/issues/${number}`, { method: 'PATCH', body: { state: 'closed' } }),
    getIssue: (number) => call(`/issues/${number}`),
    getPull: (number) => call(`/pulls/${number}`),
    listFiles: (number) => call(`/pulls/${number}/files?per_page=100`),
    listOpenIssues: () => call('/issues?state=open&per_page=100'),
  };
}

module.exports = { createClient, API_BASE };
