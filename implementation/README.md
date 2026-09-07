# Programme implementation and review evidence

This change implements normative proposals, executable fixtures, and a bounded native reference implementation for review. It follows the programme in [personal PR2](https://github.com/jeswr/lws-protocol/pull/2), based on LWS `602ca1917b45450163400a43edaf961cec20873e` and SPARQ `f2e8aadd485190a8e82cdc8cd1c0fd0020130cee`. Pull requests target Jesse's personal forks; upstream submission remains his decision.

| Workstream | Concrete result | Practical boundary |
|---|---|---|
| HTTP/W3C | [Clause audit](http-w3c-audit.md), core corrections, conformance classes, registration templates, ReSpec checks | Formal review/publication and complete server conformance are not claimed |
| Representations | RDF model, metadata capability vocabulary, optional fixed JSON layout, Turtle-only configuration, negotiation rules | Existing webhook suite keeps its JSON requirement; ordinary payloads, OAuth and linksets have their own formats |
| ODRL access requests | [Profile](../lws10-access-odrl/), Request/Set distinction, explicit prohibit precedence, exact targets, temporal constraints, admission/revocation rules | Read required; other actions and extended constraints need advertised implementation support |
| Authorization bindings | [Reference specification](../lws10-authz/) and native WAC/ACP/ODRL binding selection in SPARQ | One authoritative binding per configured storage; no implicit cross-language fallback or composition |
| Agent authentication | [Compatibility report](agent-compatibility.md), strict native Bearer verifier, official-SDK [MCP adapter](../examples/mcp-adapter/README.md) | Synthetic fixture AS and local stdio transport; remote MCP-facing OAuth/consent not implemented |

## SPARQ companion

The implementation is [SPARQ review PR1](https://github.com/jeswr/sparq-lws-review/pull/1), branch `codex/lws-authorization-bindings`, commit [`64947e05a783d5b7c7a0ab8a19ce5cfeba68bba8`](https://github.com/jeswr/sparq-lws-review/commit/64947e05a783d5b7c7a0ab8a19ce5cfeba68bba8), based on the revision above.

The `authorization-bindings` and `lws-bearer` features are default-off. Native policy selection is authoritative for storage and query checks. WAC uses the existing native authority; ACP uses a trusted policy snapshot with the ACP evaluator; ODRL admits a closed read profile with a trusted clock. Missing policy, unsupported terms, and evaluation failure deny rather than selecting a weaker binding. Non-WAC notification routes are disabled where they cannot enforce the selected authority.

The ODRL reference service stores pending requests without activating them, accepts controller-approved Sets, and revokes before acknowledging DELETE. It is a loopback demonstration with one active grant, in-memory state and exact resource/subject matching. The implementation documents its representable dateTime subset and rejects unsupported precision instead of silently rounding it. No duty, purpose, client restriction, mutation, contractual Agreement, arbitrary collection, or full ODRL conformance claim is implied.

WAC and ACP are exercised through authenticated native routes and their own activation/revocation paths. ACP and ODRL pin one immutable policy generation and trusted time for each HTTP/query authorization unit. The WAC adapter retains the existing live ACL-store semantics; it does not yet guarantee one ACL generation across every check of a request. That clause of the new binding contract remains incomplete for WAC, so its evidence is a semantic/native-route demonstration, not full binding conformance. Their binding specification explains non-broadening grant translation, but the shared HTTP request/grant compiler is only implemented for ODRL. The existing legacy ODRL gate remains separate and is not used as a weaker fallback when a binding is selected.

LWS authentication uses explicitly provisioned trusted issuers/keys and a resource-bound RFC9068 Bearer profile. Solid issuer routing remains distinct so existing DPoP and certificate-bound Bearer paths coexist. Candidate keys are validated before atomic replacement. The test authorization server provides the required LWS metadata location and a synthetic signed-subject credential exchange; it is not a production identity provider.

## Validation ledger

- Vocabulary regenerates successfully; **3 strict JSON-LD context tests** pass.
- **18 Python RDF/SHACL and editorial assertions** pass.
- **9 MCP adapter unit tests** pass, including trust/refresh/denial, actor-selection and grant-cleanup target checks.
- Core and both companion ReSpec renderings are checked; known core editorial warnings are tracked in the audit.
- Combined native tests pass: **612 library, 16 authorization-binding, 13 Bearer, 4 token-exchange, 4 legacy ODRL, 9 authentication middleware, 4 authentication-cache, 19 DPoP-SK and 16 mTLS tests**. Scoped Clippy with `-D warnings`, feature-off compilation, and the minimal feature-on lib/bin/example check pass.
- Actual official-SDK WAC smoke passes: owner read succeeds, authenticated outsider receives 403, arbitrary tool target rejected.
- Actual official-SDK ODRL lifecycle smoke passes: **403 → Request 201 / still 403 → Grant 201 / read 200 → DELETE 204 / read 403**, with cached adapter credentials and an unchanged direct reader token. Both fixtures were stopped and private bootstrap files removed. Adversarial native tests also exercise policy replacement between target/parent checks, replacement during SPARQL graph assembly, one ODRL clock across an expiry boundary, omitted ACP targets and pre-existing notification subscribers.
- Both npm dependency audits report zero known vulnerabilities after compatible vocabulary-build dependency updates.

Reproduce document and adapter checks using [conformance instructions](../conformance/README.md). The SPARQ crate README and `skills/solid-lws-server/scripts/` contain native validation commands; [MCP instructions](../examples/mcp-adapter/README.md) describe both WAC and ODRL fixture modes. No test output or checked-in artifact contains bearer tokens, subject tokens, client secrets or private bootstrap files.

These are reviewable implementations of the programme's proposed directions. The [audit follow-up table](http-w3c-audit.md#tracked-follow-up-and-limits) records the remaining broader conformance and integration work rather than treating fixture success as proof of everything in the programme.
