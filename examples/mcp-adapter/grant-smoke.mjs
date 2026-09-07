import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { loadBootstrap } from './lws-session.mjs';
import { grantResource } from './fixture-config.mjs';
import { randomUUID } from 'node:crypto';

const path = process.env.LWS_BOOTSTRAP_FILE;
if (!path) throw new Error('Set LWS_BOOTSTRAP_FILE to the private ODRL reference fixture bootstrap.');
const c = await loadBootstrap(path);
assert.equal(c.binding, 'odrl');
for (const key of ['lws_request_endpoint', 'lws_grant_endpoint', 'token_endpoint', 'resource_url']) {
  const url = new URL(c[key]);
  assert.equal(url.protocol, 'http:');
  assert.equal(url.hostname, '127.0.0.1');
  assert.ok(url.port && !url.username && !url.password);
}
const request = (url, init) => fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(5000) });
async function exchange(subject) {
  const response = await request(c.token_endpoint, { method: 'POST', body: new URLSearchParams({
    grant_type: c.grant_type, subject_token_type: c.subject_token_type, subject_token: subject,
    resource: c.realm, client_id: c.client_id, client_secret: c.client_secret,
  }) });
  assert.equal(response.status, 200);
  const token = await response.json();
  assert.equal(token.token_type.toLowerCase(), 'bearer');
  return token.access_token;
}
// Administration is test harness code; no policy-writing tool is exposed to the model.
const readerToken = await exchange(c.outsider_subject_token);
const controllerToken = await exchange(c.subject_token);
const iri = value => {
  assert.ok(!/[<>"{}|^`\\\x00-\x20]/.test(value));
  return `<${value}>`;
};
const runId = randomUUID();
function envelope(granted) {
  const kind = granted ? 'AccessGrant' : 'AccessRequest';
  const policy = granted ? 'Set' : 'Request';
  return `@prefix lws: <https://www.w3.org/ns/lws#> .
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
<urn:lws:mcp:${runId}:${kind}> a lws:${kind}; lws:storage ${iri(c.realm.replace(/\/$/, '') + '/')}; lws:access <urn:lws:mcp:${runId}:${policy}> .
<urn:lws:mcp:${runId}:${policy}> a odrl:${policy}; odrl:profile lws:OdrlAccessProfile; odrl:conflict odrl:prohibit;
  odrl:permission [ odrl:assignee ${iri(c.outsider)}; odrl:target ${iri(c.resource_url)}; odrl:action odrl:read ] .`;
}
const client = new Client({ name: 'lws-grant-lifecycle-test', version: '0.1.0' });
const transport = new StdioClientTransport({ command: process.execPath,
  args: [fileURLToPath(new URL('adapter.mjs', import.meta.url))],
  env: { LWS_BOOTSTRAP_FILE: path, LWS_FIXTURE_ACTOR: 'outsider' }, stderr: 'pipe' });
async function read(expected) {
  const result = await client.callTool({ name: 'lws_read', arguments: {} });
  assert.equal(Boolean(result.isError), expected === 403);
  if (expected === 403) assert.match(result.content[0].text, /\(403\)/);
  // Reuse this exact access token through activation/revocation as an additional check.
  const direct = await request(c.resource_url, { headers: { Authorization: `Bearer ${readerToken}` } });
  assert.equal(direct.status, expected);
  await direct.body?.cancel();
}
let grantLocation;
const failures = [];
try {
  await client.connect(transport);
  await read(403);
  const submitted = await request(c.lws_request_endpoint, { method: 'POST',
    headers: { Authorization: `Bearer ${readerToken}`, 'Content-Type': 'text/turtle' }, body: envelope(false) });
  assert.equal(submitted.status, 201); await submitted.body?.cancel();
  await read(403);
  const approved = await request(c.lws_grant_endpoint, { method: 'POST',
    headers: { Authorization: `Bearer ${controllerToken}`, 'Content-Type': 'text/turtle' }, body: envelope(true) });
  assert.equal(approved.status, 201);
  grantLocation = grantResource(approved.headers.get('location'), c.lws_grant_endpoint);
  await approved.body?.cancel();
  await read(200);
  const revoked = await request(grantLocation, { method: 'DELETE', headers: { Authorization: `Bearer ${controllerToken}` } });
  assert.equal(revoked.status, 204); grantLocation = undefined;
  await read(403);
  process.stdout.write('Official MCP SDK + native SPARQ: denied → Request remains denied → approved Set permits → revoked Set denies; cached credentials verified\n');
} catch (error) { failures.push(error); }
finally {
  if (grantLocation) {
    try {
      const cleanup = await request(grantLocation, { method: 'DELETE', headers: { Authorization: `Bearer ${controllerToken}` } });
      await cleanup.body?.cancel();
      assert.equal(cleanup.status, 204, 'Grant cleanup failed; stop the fixture before rerunning.');
    } catch (error) { failures.push(error); }
  }
  for (const result of await Promise.allSettled([client.close(), transport.close()])) {
    if (result.status === 'rejected') failures.push(result.reason);
  }
}
if (failures.length) throw new AggregateError(failures, 'Grant lifecycle failed; stop the fixture before rerunning.');
