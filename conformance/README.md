# Reproducible specification fixtures

From a clean checkout, use Node.js 22 or newer and Python 3.12 or newer:

```sh
npm ci --prefix lws10-vocab
npm run build --prefix lws10-vocab
npm test --prefix lws10-vocab
python3 -m venv .venv
.venv/bin/python -m pip install -r conformance/requirements.txt
.venv/bin/python -m unittest discover -s conformance -v
npm ci --prefix examples/mcp-adapter
npm test --prefix examples/mcp-adapter
```

`programme-conformance.yml` runs these stages on pull requests. Vocabulary generation must precede RDF tests: the draft context is generated from this branch, not downloaded from the W3C publication URL. The build uses the generator's throwing API so a failed conversion cannot pass with stale output.

The tests compare Turtle and JSON-LD graphs, exercise alternate JSON layouts, validate Turtle-only discovery and required class coverage, distinguish pending Requests from active Sets, and reject unsupported constraints, actions, duties, literal assignees, and invalid temporal values. A strict JSON-LD processor separately tests the real core notification example alongside the ActivityStreams context. ODRL `target` is scoped to access objects; ActivityStreams `target` retains its own meaning.

The CID fixture is the context from <https://www.w3.org/ns/cid/v1>, verified against the CID Recommendation's SHA-256 digest `ea216ecc1cb02cd39b693dba2250141e270ba0bf95890be107dd9a9e8e43de85`. Storage fixtures exercise the fixed CID and Turtle models together.

The ActivityStreams fixture is the W3C context retrieved from <https://www.w3.org/ns/activitystreams> on 7 September 2026. Its original W3C terms apply. Context loaders accept only local fixtures; unexpected network context resolution fails tests.

The representation shapes check structural requirements, including unscoped Storage/Container coverage. A caller validating a particular container listing must explicitly target its subject using `shape:Container`; a nested description of a contained container does not recursively need its own count/listing. Shapes do not establish storage membership, validate every registered media-type parameter, infer whether an optional service exists, check all service-specific coverage, or implement HTTP negotiation. Those require protocol tests against an implementation.

Passing these fixtures is evidence for the stated assertions, not complete LWS, WAC, ACP, ODRL, HTTP, or W3C publication conformance. Native authenticated route and grant-lifecycle evidence belongs to the [SPARQ companion](../implementation/README.md); the [MCP instructions](../examples/mcp-adapter/README.md) connect the two repositories.
