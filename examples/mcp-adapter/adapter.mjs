import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadBootstrap, LwsError, LwsSession } from './lws-session.mjs';
import { selectActor } from './fixture-config.mjs';

try {
  const bootstrap = selectActor(await loadBootstrap(process.env.LWS_BOOTSTRAP_FILE), process.env.LWS_FIXTURE_ACTOR);
  const session = new LwsSession(bootstrap);
  const server = new Server({ name: 'lws-adapter-experiment', version: '0.1.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [{
    name: 'lws_read', description: 'Read the single resource configured for this local LWS experiment.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }] }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    if (params.name !== 'lws_read' || Object.keys(params.arguments ?? {}).length) {
      return { isError: true, content: [{ type: 'text', text: 'Unknown tool or unsupported arguments.' }] };
    }
    try {
      const result = await session.read();
      return { content: [{ type: 'text', text: result.text }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof LwsError ? error.message : 'LWS operation failed.' }] };
    }
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void server.close(); });
  await server.connect(new StdioServerTransport());
} catch {
  // Do not print a configuration parse error or server response that could contain credentials.
  process.stderr.write('Unable to start the LWS adapter experiment.\n');
  process.exitCode = 1;
}
