## Identity and scope

The profile identifier is `https://www.w3.org/ns/lws#OdrlAccessProfile`. Every policy MUST carry this identifier in `odrl:profile`. Discovery uses `dcterms:conformsTo` on the relevant LWS service; it does not replace the policy declaration. This draft defines a deliberately bounded access-decision profile of [[!ODRL-MODEL]], not every ODRL usage-control feature.

An implementation MUST document and advertise its supported actions through `lws:supportedAction` on its authorization-binding capability. Read support is required; other actions below are optional. A profile-aware request service MUST reject an unimplemented action or constraint with 422, rather than silently weakening it. Malformed RDF receives 400; unsupported media types receive 415. A valid request that its submitter has no authority to submit receives 403.

## Policy expression

A policy MUST be an IRI-identified `odrl:Request` in an access-request envelope, or an IRI-identified `odrl:Set` in an access-grant envelope. It MUST have exactly one profile identifier and an explicit `odrl:conflict odrl:prohibit`. It MUST have at least one permission or prohibition. Each rule MUST contain exactly one IRI-valued assignee, target, and action. Targets name resources exactly; no prefix, wildcard, implicit descendant, or collection matching is defined by this version.

The available actions are:

| Action | Storage operation and target |
|---|---|
| `odrl:read` | GET/HEAD of the target, or admission of its data into an authorized query |
| `odrl:modify` | Replacement or patch of an existing target's content |
| `lws:create` | Creation in the target container; it does not authorize overwriting an existing child |
| `odrl:delete` | Deletion of the target; it does not imply recursive permission |

Mutation authorization MUST include every affected resource required by the binding, including containment changes. These actions do not grant policy-administration authority. The meanings are profile mappings to LWS operations; an implementation MUST NOT treat ODRL's broader `use` action as a synonym for all of them.

A rule MAY have conjunctive `odrl:constraint` values. This version supports only `odrl:dateTime` with `odrl:gteq`, `odrl:lt`, or `odrl:lteq` and a single timezone-qualified `xsd:dateTime` right operand. The enforcement time MUST come from the server's trusted clock, never request-supplied session data. Implementations MUST compare instants, not lexical strings.

Unknown properties on a policy, rule, or constraint MUST be rejected by this profile's processor. Duties, remedies, consequences, inheritance, imports, refinements, and party/asset collections are outside this version. Purpose claims and client restrictions require a separately identified extension with trusted evidence and execution rules; they MUST NOT be accepted and then ignored. Additional application metadata belongs in the LWS envelope and MUST NOT be interpreted as a permission.

The structural [SHACL shapes](../conformance/shapes/odrl.ttl) define cardinalities, node kinds, and the closed vocabulary. Shape conformance alone does not establish authority or evaluate policy. Implementations MUST additionally check action support and temporal values, and enforce the protocol below.

## Request and grant protocol

The existing LWS request/grant service discovery and envelope are retained. `lws:storage` identifies the storage; `lws:access` links one or more policies; `ldp:inbox` is optional routing metadata. The envelope MUST contain the correct `lws:AccessRequest` or `lws:AccessGrant` type. Each contained policy MUST use the corresponding ODRL policy type. An arbitrary ODRL Request is not an LWS envelope until that routing and scope information is supplied.

1. An authenticated requester POSTs an AccessRequest containing an ODRL Request to the advertised request endpoint. The server validates scope, supported terms, and the requester's right to act for the assignee. Success creates a request record and returns 201 with Location. No storage permission changes.
2. A storage controller separately approves all or a subset of the requested authority and POSTs an AccessGrant containing a new ODRL Set to the grant endpoint. The server MUST verify the approver's authority over every target and validate the entire proposed grant before activation. A submitted `assigner` label, signature from an arbitrary key, or policy type alone is not proof of that authority.
3. Grant activation and publication of its record MUST be atomic from the perspective of subsequent authorization checks. The server returns 201 only after activation; failure MUST leave no active partial grant. This profile does not infer a contractual agreement, so the active policy is a Set rather than an Agreement.
4. This profile requires DELETE on grant resources for revocation. Only an authorized controller may revoke. A 204 response acknowledges that subsequent authorization checks exclude that grant, including cached decisions. In-flight operations already authorized may finish; this boundary MUST be documented. Revocation cannot retract data already disclosed or cancel an independent legitimate grant.
5. Deleting a pending request cancels that request only. It MUST NOT silently revoke a separately activated grant. A grant record is never presented as a bearer credential.

A processor MUST NOT install an `odrl:Request` as an active authorization policy. An implementation that only installs trusted policies through an administration API can demonstrate policy enforcement, but MUST NOT claim the HTTP request/grant lifecycle until that protocol is implemented.

## Decision semantics

Only active, server-authorized policy snapshots participate. A rule matches an authenticated assignee, exact target, supported action, and satisfied constraints. A matching prohibition overrides permissions. Otherwise at least one matching permission permits; absence of a matching permission denies. An invalid policy, unavailable evidence needed for a relevant decision, or evaluation failure yields an indeterminate result that the storage enforcement point treats as denial. It MUST NOT fall back to another language or to an older policy version.

A server MAY install multiple policies within the selected ODRL binding; prohibition precedence applies across that active set. Languages are selected by server policy as described in the [reference bindings](../lws10-authz/), never by a requester's preferred policy serialization.

## Example request

This informative envelope requests one read. It grants nothing.

```turtle
@prefix lws: <https://www.w3.org/ns/lws#> .
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .

<https://requests.example/123> a lws:AccessRequest ;
    lws:storage <https://storage.example/> ;
    lws:access <https://requests.example/123#policy> .
<https://requests.example/123#policy> a odrl:Request ;
    odrl:profile lws:OdrlAccessProfile ;
    odrl:conflict odrl:prohibit ;
    odrl:permission [ odrl:assignee <https://agent.example/id> ;
        odrl:target <https://storage.example/root/report> ;
        odrl:action odrl:read ] .
```

## Security and privacy

Request submission and notification endpoints need abuse limits and protection against disclosure of requested targets and purposes. An inbox URI MUST NOT cause an unchecked server-side fetch to an internal service. Remote JSON-LD contexts MUST be resolved using an implementation's trusted context policy; the test fixtures use local contexts. Authorization MUST depend on authenticated identity and controlled policy state, not graph provenance asserted by the graph itself. Record grant identity and policy revision for audit without logging credentials or private content.
