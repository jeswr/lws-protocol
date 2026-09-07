import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const bootstrap = process.env.LWS_BOOTSTRAP_FILE;
if (!bootstrap) throw new Error('Set LWS_BOOTSTRAP_FILE to the private native fixture bootstrap file.');
for (const actor of ['owner', 'outsider']) {
  const client = new Client({ name: 'lws-interoperability-test', version: '0.1.0' });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('adapter.mjs', import.meta.url))],
    env: { LWS_BOOTSTRAP_FILE: bootstrap, LWS_FIXTURE_ACTOR: actor }, stderr: 'pipe' });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools[0].name, 'lws_read');
    const result = await client.callTool({ name: 'lws_read', arguments: {} });
    assert.equal(Boolean(result.isError), actor === 'outsider');
    if (actor === 'outsider') assert.match(result.content[0].text, /\(403\)/);
    const injection = await client.callTool({ name: 'lws_read', arguments: { url: 'http://127.0.0.1:1/admin' } });
    assert.equal(injection.isError, true);
    process.stdout.write(`${actor}: official MCP SDK → adapter → token exchange → native storage verified\n`);
  } finally { await client.close(); await transport.close(); }
}
