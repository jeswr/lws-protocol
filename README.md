# Specification 'lws-protocol'

This is the repository for lws-protocol. You're welcome to contribute! Let's make the Web rock our socks
off!
To see the most recent HTML rendered version of the specification from this repository can be found at the following:
 * [LWS Protocol](https://w3c.github.io/lws-protocol/lws10-core/)


## (1.0) Specs:

- [`core`](lws10-core/): Core protocol
- [`vocab`](lws10-vocab/): Vocabulary
- [`authn-openid`](lws10-authn-openid/): OpenID Connect Authentication Suite
- [`authn-saml`](lws10-authn-saml/): SAML 2.0 Authentication Suite
- [`authn-ssi-cid`](lws10-authn-ssi-cid): Self-signed Controlled Identifier Authentication Suite
- [`authn-ssi-did-key`](lws10-authn-ssi-did-key): Self-signed `did:key` Authentication Suite
- [`notifications-webhook`](lws10-notifications-webhook/): Notification Suite: Webhooks
- [`searchindex`](lws10-searchindex/): Search and Type Index Services


## Personal implementation proposals

These additions are review proposals, not Working Group decisions:

- [`access-odrl`](lws10-access-odrl/): ODRL profile for requests and active grants, with an explicit read subset.
- [`authz`](lws10-authz/): Reference authorization bindings for ODRL, WAC, and ACP.
- [Implementation and evidence](implementation/README.md): companion SPARQ implementation, HTTP/W3C audit, limitations, and review PRs.
- [Conformance fixtures](conformance/README.md): reproducible graph, context, and rejection checks.
- [MCP adapter](examples/mcp-adapter/README.md): runnable official-SDK adapter and native grant/revocation experiment.

## Contribution Guidelines:

The following etiquette is followed for managing PRs submitted to this repository. In the below table we refer to the official [W3C Correction Classes](https://www.w3.org/policies/process/#correction-classes).

| Class | No. Editor Approval | Time PR must be open | Requires WG Call Discussion     |
| ----- | ------------------- | -------------------- | ---------------------------     |
| 1     | 1                   | 0 business days      | No                              |
| 2     | 2                   | 3 business days      | No                              |
| 3     | 2                   | 5 business days      | Yes - formal vote not required  |
| 4     | 2                   | 5 business days      | Yes - formal vote required[^1]     |   

[^1]: Vote will be a resolution of the group made during the meeting. The vote will be announced in the agenda.
