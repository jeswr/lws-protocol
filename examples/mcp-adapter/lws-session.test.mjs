import test from 'node:test';
import assert from 'node:assert/strict';
import { LwsSession } from './lws-session.mjs';

const config = { issuer: 'http://127.0.0.1:8001/', metadata_url: 'http://127.0.0.1:8001/metadata',
  token_endpoint: 'http://127.0.0.1:8001/token', realm: 'http://127.0.0.1:8002/',
  native_base_url: 'http://127.0.0.1:8002/', resource_url: 'http://127.0.0.1:8002/private/note',
  subject_token_type: 'urn:ietf:params:oauth:token-type:jwt', subject_token: 'private-subject',
  client_id: 'https://client.example/id', client_secret: 'private-client-secret' };
const metadata = { issuer: config.issuer, token_endpoint: config.token_endpoint,
  grant_types_supported: ['urn:ietf:params:oauth:grant-type:token-exchange'],
  subject_token_types_supported: [config.subject_token_type] };
const tokens = { access_token: 'storage-token', token_type: 'Bearer', expires_in: 300,
  issued_token_type: 'urn:ietf:params:oauth:token-type:access_token' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });

function fixture({ meta = metadata, token = tokens, statuses = [200], now = Date.now } = {}) {
  const calls = [];
  const session = new LwsSession(config, { now, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.redirect, 'error');
    if (url === config.metadata_url) return json(meta);
    if (url === config.token_endpoint) return json(token);
    assert.equal(url, config.resource_url);
    assert.equal(options.headers.Authorization, 'Bearer storage-token');
    return new Response('sample data', { status: statuses.shift() ?? 200 });
  } });
  return { session, calls };
}

test('exchange binds resource/client and keeps credentials away from storage', async () => {
  const { session, calls } = fixture();
  assert.equal((await session.read()).text, 'sample data');
  const form = calls.find(x => x.url === config.token_endpoint).options.body;
  assert.equal(form.get('resource'), config.realm);
  assert.equal(form.get('client_id'), config.client_id);
  assert.equal(form.get('subject_token'), config.subject_token);
  const storage = calls.find(x => x.url === config.resource_url);
  assert.equal(storage.options.body, undefined);
  assert.ok(!JSON.stringify(storage).includes(config.client_secret));
});

test('mismatched metadata never receives a subject credential', async () => {
  const { session, calls } = fixture({ meta: { ...metadata, token_endpoint: 'http://127.0.0.1:8003/token' } });
  await assert.rejects(session.read(), /trust and suite/);
  assert.equal(calls.length, 1);
});

test('unsupported token type fails before storage access', async () => {
  const { session, calls } = fixture({ token: { ...tokens, token_type: 'DPoP' } });
  await assert.rejects(session.read(), /Unsupported token/);
  assert.equal(calls.length, 2);
});

test('a policy denial does not trigger a new identity or token loop', async () => {
  const { session, calls } = fixture({ statuses: [403] });
  await assert.rejects(session.read(), /\(403\)/);
  assert.equal(calls.length, 3);
});

test('401 gets at most one fresh exchange', async () => {
  const { session, calls } = fixture({ statuses: [401, 401] });
  await assert.rejects(session.read(), /\(401\)/);
  assert.equal(calls.filter(x => x.url === config.token_endpoint).length, 2);
});

test('cached tokens expire and concurrent callers share an exchange', async () => {
  let time = 0;
  const { session, calls } = fixture({ now: () => time });
  await Promise.all([session.read(), session.read()]);
  assert.equal(calls.filter(x => x.url === config.token_endpoint).length, 1);
  time = 301000;
  await session.read();
  assert.equal(calls.filter(x => x.url === config.token_endpoint).length, 2);
});

test('the example rejects nonloopback and userinfo-bearing endpoints', () => {
  for (const issuer of ['https://example.com/', 'http://user@127.0.0.1:8001/']) {
    assert.throws(() => new LwsSession({ ...config, issuer }), /loopback/);
  }
});
