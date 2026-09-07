import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectActor, grantResource } from './fixture-config.mjs';

test('fixture actor selection rejects unknown values without choosing owner credentials', () => {
  const c = { subject_token: 'owner', outsider_subject_token: 'outsider' };
  assert.equal(selectActor(c).subject_token, 'owner');
  assert.equal(selectActor(c, 'outsider').subject_token, 'outsider');
  for (const actor of ['', 'OUTSIDER', 'outisder', null]) assert.throws(() => selectActor(c, actor));
  assert.equal(c.subject_token, 'owner');
});

test('grant cleanup accepts only a named child of its configured collection', () => {
  const base = 'http://127.0.0.1:8000/lws-grants';
  assert.equal(grantResource('/lws-grants/123', base), `${base}/123`);
  for (const location of [null, '', ' ', '/lws-grants', '/other/123', '/lws-grants/a/b',
    '/lws-grants/%2e%2e', '/lws-grants/a%2fb', '/lws-grants/123?q=x',
    'http://user@127.0.0.1:8000/lws-grants/123', 'http://127.0.0.1:8001/lws-grants/123']) {
    assert.throws(() => grantResource(location, base));
  }
});
