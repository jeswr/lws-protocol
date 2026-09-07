# Agentic-system authentication compatibility

Reviewed 7 September 2026 against [MCP authorization, revision 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) and the [official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), pinned to package version 1.30.0 in the runnable example.

An MCP adapter can act as an LWS client without asking the model to handle credentials. The implemented stdio experiment demonstrates the adapter-to-LWS path using credential exchange and native storage enforcement. This is useful evidence of feasibility; remote HTTP MCP deployments have an additional authorization boundary.

| Boundary | Required behavior | Evidence in this change |
|---|---|---|
| Local agent host → stdio adapter | Host provisions credentials privately; model calls constrained tools | Official SDK client/server initialization, tool discovery and invocation; argument-injection rejection |
| Adapter → LWS authorization server | Trusted issuer and endpoint configuration; RFC 8693 exchange with resource and client binding | Runnable signed-credential fixture; metadata mismatch and unsupported token tests |
| Adapter → native LWS storage | Appropriate audience; strict access-token validation; independent policy enforcement | Native SPARQ Bearer integration, authorized read and authenticated denial |
| Active grant → revoked grant | New checks must deny even while access token is still valid | ODRL HTTP request/approval/revocation smoke using cached credentials |
| Remote HTTP MCP client → adapter | MCP resource metadata, compatible OAuth server, client registration, consent and audience checks | Standards analysis only; not implemented by the stdio example |

MCP's HTTP authorization model uses OAuth Protected Resource Metadata and authorization-server discovery. Its authorization requirements do not apply identically to stdio, where credentials are supplied by the environment. The core proposal therefore adds an optional [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728) discovery bridge while retaining LWS's `as_uri`/`realm` challenge and `lws-configuration` endpoint. Standard OAuth authorization-server metadata is additionally recommended. A remote adapter should publish its own MCP resource identity and metadata; simply placing LWS's token-exchange endpoint behind an MCP transport does not supply MCP's initial login/consent flow.

The client and subject are distinct. The subject may be a person or software principal; the LWS client identifier is the adapter application. An access token issued for the MCP adapter is not automatically an acceptable LWS subject credential. A production bridge needs an explicitly trusted authentication suite and authorization server that validate issuer, intended recipient, client identity and any delegated authority. The [RFC 8693 exchange protocol](https://www.rfc-editor.org/rfc/rfc8693) specifies token exchange, not a universal trust or consent policy. No token passthrough is implemented here.

The fixture supports its synthetic signed JWT subject credentials and `client_secret_post`; it is not evidence that every OpenID, SAML, CID, or did:key suite works in every agent runtime. Interactive, unattended, and delegated agents need separate provisioning choices. Key rotation and revocation are distinct: rotating token-verification keys changes credential validity, whereas revoking an authorization grant changes the policy result for an otherwise valid token.

The experiment pins targets and credentials outside the tool schema, refuses redirects and arbitrary remote endpoints, bounds responses, and avoids returning token bodies on failures. Those controls constrain credential forwarding; they do not make retrieved content trustworthy instructions. An agent consuming resource text must continue to treat it as untrusted content.

## Production follow-through

A remote HTTP demonstration should add an MCP-facing OAuth authorization-code/PKCE and registration flow compatible with the chosen clients, a documented delegated-credential bridge to LWS, HTTPS and secure secret storage, token refresh/revocation policy, and tests with named agent products. That is separate from the local official-SDK interoperability result. A2A or other agent protocols require their own review; no result for them is implied here.

See the [runnable instructions](../examples/mcp-adapter/README.md) and [evidence ledger](README.md) for the exact implemented scope and commands.
