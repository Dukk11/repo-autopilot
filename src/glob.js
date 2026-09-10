'use strict';

/**
 * Minimal glob → RegExp converter (supports `**`, `*`, `?`).
 * Pure and unit-tested; no dependency, no ReDoS-prone constructs.
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegex(glob) {
  const g = String(glob || '');
  let re = '^';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        re += '.*';
        i++;
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`${re}$`);
}

/** Cache so repeated workflow runs don't recompile the same globs. */
const cache = new Map();

function globMatcher(glob) {
  if (!cache.has(glob)) cache.set(glob, globToRegex(glob));
  return cache.get(glob);
}

/**
 * Match a path against a list of glob patterns.
 * @param {string} path
 * @param {string[]} globs
 * @returns {boolean}
 */
function matchPath(path, globs) {
  const p = String(path).replace(/\\/g, '/');
  return (globs || []).some((g) => globMatcher(g).test(p));
}

module.exports = { globToRegex, globMatcher, matchPath };
