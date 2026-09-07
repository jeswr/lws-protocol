const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const jsonld = require('jsonld');
const fixtures = join(__dirname, '../conformance/fixtures');
const context = JSON.parse(readFileSync(join(__dirname, 'vocabulary.context.jsonld')));
const activitystreams = JSON.parse(readFileSync(join(fixtures, 'activitystreams.context.jsonld')));
const documents = {
  'https://www.w3.org/ns/lws/v1': context,
  'https://www.w3.org/ns/activitystreams': activitystreams,
  'https://www.w3.org/ns/cid/v1': JSON.parse(readFileSync(join(fixtures, 'cid.context.jsonld'))),
};
const options = { documentLoader: async url => {
  assert.ok(documents[url], `Unexpected remote context: ${url}`);
  return { document: documents[url], documentUrl: url, contextUrl: null };
} };

test('core notifications expand with the protected LWS and ActivityStreams contexts', async () => {
  const source = readFileSync(join(__dirname, '../lws10-core/Notifications.html'), 'utf8');
  const example = JSON.parse(source.match(/title="Batched notification">([\s\S]*?)<\/pre>/)[1]);
  const quads = await jsonld.toRDF(example, { ...options, format: 'application/n-quads', base: 'https://notifications.example/' });
  assert.match(quads, /<https:\/\/www.w3.org\/ns\/activitystreams#target> <https:\/\/storage.example\/alice\/notes\/>/);
  assert.doesNotMatch(quads, /<http:\/\/www.w3.org\/ns\/odrl\/2\/target>/);
});

test('ODRL target remains scoped to access objects', async () => {
  const example = JSON.parse(readFileSync(join(fixtures, 'request.jsonld')));
  const quads = await jsonld.toRDF(example, { ...options, format: 'application/n-quads' });
  assert.match(quads, /<http:\/\/www.w3.org\/ns\/odrl\/2\/target> <https:\/\/storage.example\/root\/report>/);
  assert.doesNotMatch(quads, /activitystreams#target/);
});

test('CID storage descriptions preserve the DID service mapping with the LWS context', async () => {
  const example = JSON.parse(readFileSync(join(fixtures, 'storage.jsonld')));
  const quads = await jsonld.toRDF(example, { ...options, format: 'application/n-quads' });
  assert.match(quads, /<https:\/\/www.w3.org\/ns\/did#serviceEndpoint> <https:\/\/storage.example\/root\/>/);
  assert.match(quads, /<https:\/\/www.w3.org\/ns\/lws#representationProfile> <https:\/\/www.w3.org\/ns\/lws#FixedJsonRepresentation>/);
});
