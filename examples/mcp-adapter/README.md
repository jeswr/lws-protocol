# MCP adapter and native LWS experiment

This example uses the official TypeScript MCP SDK (`@modelcontextprotocol/sdk` 1.30.0) in both client and server roles. A local stdio server exposes one `lws_read` tool for one configured native SPARQ resource. The adapter exchanges its privately provisioned subject credential for an LWS Bearer access token, caches it until shortly before expiry, and refreshes once after a 401. A 403 remains a policy denial. Tool arguments cannot select a URL, actor, audience, or credential. The host may set `LWS_FIXTURE_ACTOR` to `owner` (the default) or `outsider`; any other value is rejected.

This is a loopback experiment. It does not implement remote HTTP MCP authentication, user login, delegated consent, or a production authorization server. The native fixture has synthetic users and in-memory data, a temporary authorization server with signing keys, and a private bootstrap file. It must not be exposed publicly.

## Install and run focused tests

```sh
npm ci
npm test
```

Use Node.js 22 or newer. The tests cover trust-metadata mismatch, resource/client binding, unsupported token type, expiration, concurrent refresh, bounded 401 retry, and 403 behavior.

## Native WAC smoke

Check out the [SPARQ implementation PR](https://github.com/jeswr/sparq-lws-review/pull/1) branch linked in the [implementation report](../../implementation/README.md). In that checkout, choose a new path in a private temporary directory:

```sh
mkdir -m 700 /tmp/lws-mcp-demo
cargo run -p sparq-lws-core --no-default-features --features lws-bearer \
  --example lws_bearer_fixture -- /tmp/lws-mcp-demo/bootstrap.json
```

Keep that process running. In this example directory:

```sh
LWS_BOOTSTRAP_FILE=/tmp/lws-mcp-demo/bootstrap.json node smoke.mjs
```

The official SDK initializes the adapter, lists/calls its tool, verifies an authorized owner read and an authenticated outsider's 403, and rejects a tool argument attempting to change the target. Output contains results, not tokens or private resource contents.

## ODRL request, approval, and revocation

Stop the first fixture. Use a new bootstrap path and enable the ODRL reference mode:

```sh
cargo run -p sparq-lws-core --no-default-features \
  --features lws-bearer,authorization-bindings --example lws_bearer_fixture \
  -- /tmp/lws-mcp-demo/odrl-bootstrap.json --odrl-reference
```

In this example directory:

```sh
LWS_BOOTSTRAP_FILE=/tmp/lws-mcp-demo/odrl-bootstrap.json node grant-smoke.mjs
```

The same live MCP connection reads before submission, after Request creation, after controller approval of a Set, and after DELETE revocation. Expected outcomes are **403 → 403 → 200 → 403**. A direct native request also uses the exact same reader access token throughout, ruling out token expiration as the explanation for revocation. Controller operations are performed by the test harness and are not exposed as model tools.

The reference grant service is intentionally bounded: one active grant, exact targets and assignees, read only, in-memory records, trusted controller configuration, and supported server-clock dateTime constraints. It is not a durable multi-user approval UI or an arbitrary ODRL policy engine. WAC and ACP use their own native policy activation paths; this example does not claim a shared HTTP grant compiler for them.

Stop fixtures with Ctrl-C and remove the private bootstrap files and empty directory when finished. Files contain credentials; keep them out of source control, prompts, and logs. The bootstrap loader requires a private regular file and rejects symlinks. The adapter accepts explicit `http://127.0.0.1:<port>` endpoints only and refuses redirects. A production integration needs HTTPS, its own credential provisioning, and the trust/consent boundary described in the [compatibility report](../../implementation/agent-compatibility.md).
