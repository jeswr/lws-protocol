# LWS conformance and interoperability programme

Personal proposal for review by Jesse Wright, 6 September 2026. This document records proposed work and initial findings; it does not change the normative specification or represent a Working Group decision. LWS review PRs target `jeswr/lws-protocol:main`; implementation PRs target the relevant personal fork. Jesse reviews and handles upstream submission.

## Intended outcome

An HTTP-conformant LWS specification with clear W3C conformance requirements, an optional predictable JSON-LD layout for metadata, and reference authorization specifications for ODRL, WAC, and ACP. SPARQ should demonstrate these mechanisms on an authenticated storage interface. The agent compatibility work should establish which existing clients work directly and which require an adapter or specification change.

ODRL is the preferred direction for the reference implementation, examples, and guidance. WAC and ACP remain explicit, supported alternatives with accurately documented semantics.

## Workstreams and completion evidence

| ID | Workstream | Deliverable | Completion evidence |
|---|---|---|---|
| H | HTTP and W3C conformance | Clause-level audit, small correction PRs, specification-quality checklist | Every finding has a source, disposition, and relevant test or editorial check; known failures are resolved or explicitly tracked |
| R | Optional JSON-LD representation profiles | Data-model/serialization separation, capability advertisement, negotiation rules, compatibility assessment | A generic RDF client and a profile-aware JSON client exercise the advertised combinations; unsupported profiles fail predictably |
| A | Reference authorization specifications | ODRL enforcement specification plus WAC and ACP bindings | Each binding defines policy authority, decisions, lifecycle, and unsupported cases; the SPARQ storage demo exercises all three |
| P | Access requests as an ODRL profile | Explicit ODRL policy model and profile, plus request/grant protocol binding | Graph validation and positive/negative policy vectors; request, approval, enforcement, and revocation agree |
| G | Agent authentication compatibility | Versioned matrix for selected agent systems and LWS suites | Real discovery, authentication, scoped access, delegation where supported, expiry, and revocation transcripts |

These are separate review units. Editorial repairs can proceed independently. R, A, and P can change interoperability or normative behavior and need substantive review.

## H. HTTP and W3C conformance

Use [HTTP Semantics, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) and [HTTP Caching, RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html) as the audit baseline, adding the method, media-type, and extension specifications each clause invokes. Audit actual behavior rather than simply replacing old RFC numbers.

Record each finding as: LWS revision and clause; controlling source section; counterexample; proposed wording; correction class; overlapping issue/PR; verification; disposition. Distinguish a contradiction of HTTP from an allowed LWS restriction, an ambiguous requirement, and a non-normative example error.

Initial findings against LWS `602ca1917b45450163400a43edaf961cec20873e`:

| Finding | Evidence | Treatment |
|---|---|---|
| Stale HTTP references and weak conformance language | [REST binding](../lws10-core/Operations/restbinding.md) references RFC 7231/7233 and says the binding “tries to adhere” | Map each dependency to its current specification and define explicit conformance classes |
| Failed conditional update is described as either 412 or 409 | [Update resource](../lws10-core/Operations/update-resource.md), PUT error prose | Reconcile with HTTP precondition processing and review alongside [PR #228](https://github.com/w3c/lws-protocol/pull/228); avoid duplicating it |
| Literal response length is inconsistent | [Read resource](../lws10-core/Operations/read-resource.md) advertises 34 bytes for the shopping-list body | The checked-in body is 58 UTF-8 bytes with its final LF, or 57 without it; define exact example octets and correct the header and explanation |
| Content-negotiation requirements need precision | [LWS Media Type](../lws10-core/lws-media-type.md) requires three media types with identical bodies and says to set the requested type | Cover multiple Accept alternatives, quality values including zero, wildcards, parameters, absence of Accept, and failure behavior |
| Validators must be considered per representation | Current examples and [ETag discussion #62](https://github.com/w3c/lws-protocol/issues/62) | Do not assume an ETag on a 204 response is invalid. RFC 9110 permits it; PUT validators are subject to its rules about transformations |

Broaden the audit to HEAD and 304 responses, precondition precedence, strong/weak validators, ranges and content codings, resource versus representation metadata, PUT/PATCH semantics, DELETE outcomes, caching of authorized responses, Link relations, discovery, CORS/preflight behavior, and IANA registration text. Browser interoperability is a separate acceptance dimension from basic HTTP conformance.

For specification quality, use the [W3C Specification Guidelines](https://www.w3.org/TR/qaframe-spec/) to make conformance targets, normative dependencies, optional features, and testable assertions explicit. Use the [W3C transition guidance](https://www.w3.org/guide/transitions/) for the applicable publication stage and required review evidence. Include security/privacy, internationalization, accessibility, examples, vocabulary/context consistency, stable references, and rendered ReSpec checks.

One earlier Solid review is verified: [solid/specification #587](https://github.com/solid/specification/issues/587) raised Community Group report status, style, and copyright requirements. Its [CG report rules](https://www.w3.org/community/reports/reqs/) apply to CG publications; LWS needs the corresponding WG publication treatment. The specific historical HTTP review Jesse recalled has not yet been identified, so no findings are attributed to it here.

## R. Optional JSON-LD representation profiles

### Current starting point

[Containers](../lws10-core/container-representation.md) and [media-type equivalence](../lws10-core/lws-media-type.md) currently impose a JSON structure. The reviewed sections do not explicitly require running a JSON-LD framing processor. [Access-request serialization](../lws10-core/lws-access-requests.html#access-serialization) already describes the data model as serialization-independent.

[JSON-LD framing](https://www.w3.org/TR/json-ld11-framing/) provides a graph-to-tree layout mechanism. The proposal should specify the required observable representation when a profile is selected; an implementation can generate that representation directly without executing a particular algorithm.

### Proposed contract

1. Define each metadata object's abstract RDF model independently of JSON property aliases, nesting, and array/singleton choices. Specify required statements and constraints for the authorized view of that object.
2. List supported content types in the server's metadata, scoped to object classes and endpoints and to response production or request acceptance. Separately define a versioned representation profile for the predictable JSON layout and advertise it when supported.
3. A server advertising a profile must honor that profile when selected through the defined HTTP negotiation mechanism. Advertising it is optional. Absence of an advertisement means the client cannot rely on that guarantee.
4. A client can request a generic RDF representation without requesting the fixed layout. RDF-aware clients process the data model; clients that depend on particular JSON keys discover and request the layout they support.
5. Preserve the meaning of `application/lws+json` whenever it is served. Relax whether an implementation must offer that representation, rather than allowing the same advertised media type to silently acquire a different structure. Rework the current three-media-type equivalence requirement accordingly.
6. Permit a Turtle-only configuration. Jesse explicitly requested that supported content types be listed in server metadata and that one valid configuration offer only Turtle. Neither framed nor unframed JSON-LD is therefore a universal server requirement in this proposal. Define client conformance requirements and behavior when the client and server have no shared format.

Candidate capability information, with vocabulary names and identifiers still to be agreed:

| Field | Meaning |
|---|---|
| Profile identifier | Versioned contract for the representation; not an arbitrary frame supplied by a client |
| Applies to | Container listings, access requests, access grants, or another explicitly named object class |
| Endpoint scope | The resources/services for which the guarantee holds |
| Produces / accepts | Supported response and request content types are declared separately, including a configuration listing only `text/turtle` for the covered objects |
| Media type and parameters | A concrete negotiable representation, with parameters defined consistently with its media-type registration |

The [storage description](../lws10-core/Discovery.html) already permits negotiated alternatives, but still requires serializability as an `application/lws+cid` CID specialization. A Turtle-only deployment requires an explicit change here as well: define the abstract discovery information and its RDF mapping, then relax the mandatory CID serialization while preserving a negotiable storage-description document. Do not assume existing CID JSON can simply be relabeled as Turtle. Retain a representation-independent discovery path, such as the existing storage Link relation, so a client can locate the metadata URI and send an initial Accept request before reading the content-type list. For example, a client supporting both Turtle and JSON-LD can advertise both on that first request. Specify minimum client format support and clear failure when no format overlaps; the metadata list alone cannot solve that initial mismatch.

The Turtle-only requirement here concerns protocol-defined structured objects: storage descriptions, container listings, access requests, and access grants. It does not require converting ordinary stored payloads such as images or documents to Turtle; accepted payload types can be configured separately. Separately specified protocols, such as OAuth token responses, retain their own format requirements. Linksets also need a separate treatment rather than being silently converted.

Linksets are `application/linkset+json` documents governed by RFC 9264, not automatically JSON-LD objects. Their representation work must be coordinated with [#189](https://github.com/w3c/lws-protocol/issues/189), [#188](https://github.com/w3c/lws-protocol/issues/188), and [PR #180](https://github.com/w3c/lws-protocol/pull/180).

### Negotiation and compatibility

Use HTTP Accept negotiation and return the actual selected Content-Type. Specify 406 when the client requires a representation/profile that is unavailable, and 415 for unsupported request representations. Do not introduce `Prefer` as a shortcut for representation negotiation without resolving the existing discussion. Cache variation must account for every request field used to select a representation.

Representation validators must distinguish byte-different representations when required by HTTP. Decide how clients obtain a validator suitable for a conditional write after reading a different serialization; graph equivalence alone does not make byte-level validators interchangeable.

The profile defines layout, not JSON canonicalization, byte ordering, or a universal signature input. For the same authorized, paginated view, serialization variants must preserve the required RDF information, including correct relative-IRI resolution. Specify treatment of additional terms and embedding so framing does not discard policy constraints or alter their meaning.

Dropping mandatory fixed JSON support affects existing JSON-only clients. Explain the compatibility change, discovery behavior, and profile-aware migration. Avoid implying that optional layouts preserve universal JSON-only client compatibility.

Acceptance examples:

- Profile advertised and selected: the documented JSON layout is returned.
- Turtle-only configuration: initial discovery, container reads, and access-request/grant exchange succeed using Turtle, and metadata accurately lists supported content types.
- Generic RDF requested: the required object model is preserved without assuming that layout.
- Required profile unavailable: the client receives the specified negotiation failure.
- Multiple media types and quality values: selection and cache behavior remain correct.
- The same access request encoded with different JSON-LD aliases/nesting, or supported RDF formats, leads to the same decision.
- An unknown or dropped policy constraint cannot turn a denial into a permit.

## P. Access requests as an ODRL profile

This is a plausible direction, with existing WG discussion in [#143](https://github.com/w3c/lws-protocol/issues/143) and [#196](https://github.com/w3c/lws-protocol/issues/196). The current specification borrows ODRL concepts but uses LWS `AccessPolicy` objects with direct action/assignee/target fields; their RDF mapping and policy structure need an explicit conformance audit.

The ODRL Common Vocabulary already defines [odrl:Request](https://www.w3.org/TR/odrl-vocab/#term-Request), which proposes rules from an assignee and grants no privileges. An [ODRL profile](https://www.w3.org/TR/odrl-model/#profile) can define the additional vocabulary and required semantics; its identifier is carried using `odrl:profile`. Service discovery's `conformsTo` advertisement does not replace that policy-level declaration.

Proposed division:

- **ODRL expression profile:** permitted policy types, Permission/Prohibition structure, actions, parties, targets, constraints, conflict behavior, and extension processing.
- **LWS protocol binding:** where requests are submitted, who may approve them, how a grant is recorded and activated, how clients observe it, and how cancellation/revocation propagates.
- **Enforcement binding:** how an active grant changes the server's authorization decisions and how those decisions remain synchronized with grant state.

An illustrative request, using an unregistered example profile identifier:

```turtle
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .

<https://request.example/123> a odrl:Request ;
    odrl:profile <https://example.org/lws-proposal/access-request-v1> ;
    odrl:permission [
        odrl:assignee <https://agent.example/id> ;
        odrl:target <https://storage.example/resource/456> ;
        odrl:action odrl:read
    ] .
```

Submitting this document alone grants nothing. Routing metadata can remain in a distinct LWS envelope. Choose grant policy types deliberately: an ODRL Agreement should only be used if the defined workflow establishes the agreement it represents. Specify the authority of the approving party independently of the type name.

The profile must define resource/collection matching using LWS containment, not unadvertised URI-prefix assumptions. It must address the requester/client/assignee distinction, time and purpose evidence, unsupported terms, and malformed constraints. Specify which forms are rejected at admission and how unavailable evidence affects a decision. Purpose stated by a caller is not proof of actual purpose.

Deliver graph constraints, serialization examples, and behavior vectors separately. Graph validation can establish document structure; it cannot prove that a request is authorized, a duty was fulfilled, or a revocation reached an enforcement cache.

## A. ODRL, WAC, and ACP reference authorization specifications

Develop optional companion specifications with a shared interface: authenticated subject and client, action, target, relevant environment/evidence, selected policy authority, and a well-defined authorization result. Each binding defines discovery, protected policy management, decision semantics, activation, revocation, and errors.

The ODRL binding should specify a bounded executable subset, including behavior for no applicable permission, prohibitions, conflicts, indeterminate results, and unsupported features. Begin with resource access decisions that can be demonstrated; distinguish server-enforced conditions from obligations whose fulfillment requires external evidence or later auditing.

Use the [WAC specification](https://solidproject.org/TR/wac) and [ACP specification](https://solidproject.org/TR/acp) as the sources for their respective bindings. Preserve their access-mode, inheritance, matcher, and policy-management semantics. Relate them to the actual LWS containment model; do not silently assume Solid path semantics. Grants that cannot be represented without broadening access must be rejected or require an explicitly supported extension.

Supporting three languages does not define how they combine. Proposed initial deployment model: select the authoritative binding per configured storage/policy scope, advertise it, and prevent requesters from selecting a weaker evaluator to bypass a denial. If simultaneous policies are supported, specify their composition as a separate, tested contract. The preferred ODRL examples must not conceal differences from WAC or ACP.

### SPARQ baseline and gaps

The initial read-only inventory uses SPARQ `f2e8aadd485190a8e82cdc8cd1c0fd0020130cee` (remote `main` verified on 6 September). No new runtime tests were executed for this inventory.

| Surface | Implemented behavior seen in source | Limit for the reference demo |
|---|---|---|
| Native `sparq-lws-core` | WAC plus an optional ODRL read/query gate; an ODRL permit can extend WAC and an ODRL deny suppresses it | This is not three interchangeable native storage authorization providers |
| `sparq-server` `/authz/*` | WAC/ACP evaluation with an ODRL bridge | It trusts a supplied session rather than authenticating that session; it is an evaluator interface |
| ODRL composition | Native targeted policies with no matching permission can deny; the server bridge materializes matched allows/denies, so an unmet permission does not itself retract a static WAC/ACP allow | Publish a truth table before treating either behavior as the reference contract |
| Decision inputs | Native ODRL gate supplies agent, recipient, read action, and target; the server bridge also has an optional time input | Do not claim native expiry, client, purpose, duty, or write enforcement from these seams |
| Policy source and decision reporting | The server ODRL lane only accepts caller-supplied datasets; server-backed ODRL evaluation is refused. Its documented `/authz/decide` and `/authz/query` results can differ for a pure ODRL grant | Wire authoritative policy storage and align permission discovery with actual enforcement before claiming a complete storage binding |
| Storage authentication | Native storage uses Solid-OIDC/DPoP integration | That does not establish conformance to the W3C LWS credential/token-exchange/Bearer flow |

Source entry points: [native ODRL gate](https://github.com/sparq-org/sparq/blob/f2e8aadd485190a8e82cdc8cd1c0fd0020130cee/crates/sparq-lws-core/src/authz/odrl.rs), [authorization evaluator](https://github.com/sparq-org/sparq/blob/f2e8aadd485190a8e82cdc8cd1c0fd0020130cee/crates/sparq-server/src/solid_authz.rs), [documented decision/query discrepancy](https://github.com/sparq-org/sparq/blob/f2e8aadd485190a8e82cdc8cd1c0fd0020130cee/skills/http-server/SKILL.md#L1399), and [native authentication](https://github.com/sparq-org/sparq/blob/f2e8aadd485190a8e82cdc8cd1c0fd0020130cee/crates/sparq-lws-core/src/auth.rs).

The ODRL library has further subset limits: `assigner` is informational, duty constraints are not enforced, and its default conflict strategy differs from ODRL's default. The reference profile must resolve or explicitly constrain these differences; library support is not evidence of complete ODRL conformance. See the pinned [usage-control implementation notes](https://github.com/sparq-org/sparq/blob/f2e8aadd485190a8e82cdc8cd1c0fd0020130cee/skills/usage-control-policy/SKILL.md#L56).

### Required demonstration

1. Establish a shared set of read/write/create/delete scenarios and policy-management boundaries. For each scenario, mark equivalent WAC/ACP/ODRL cases and explicitly unsupported cases.
2. Exercise the evaluator decision tables, including no matching rule, explicit denial, missing evidence, and composition differences. Report these as evaluator results.
3. Integrate all three bindings with the same authenticated storage surface and grant lifecycle; demonstrate denial before authorization, admission after authorized grant activation, and denial after revocation, including cache behavior.
4. Demonstrate a constrained ODRL case beyond the common subset, such as a time/client restriction, only after the necessary trusted decision inputs are wired in. Show a meaningful negative case.
5. Run an actual agent client through discovery, credential acquisition, storage access, and revocation. Keep static validation, evaluator tests, and this end-to-end evidence visibly distinct.

Changes needed in SPARQ are to be developed in a personal fork with review PRs, following the established workflow.

## G. Authentication and agent compatibility

Jesse clarified that the target is agentic systems, especially whether MCP adapters can authenticate easily. Start with an MCP adapter to LWS; the existing agentic-Solid stack is a useful comparison and A2A is a secondary candidate. Select concrete implementations and versions before making interoperability claims.

The [accountable-agent-runtime README](https://github.com/jeswr/accountable-agent-runtime/blob/main/README.md) describes a live Solid/DPoP/WAC demonstration. That is useful prior work, but it is not evidence that the W3C LWS exchange flow already works with it. The [LWS Keycloak prototype](https://github.com/jeswr/lws-keycloak) is a second integration candidate to inspect.

Initial protocol comparison:

| Dimension | LWS starting point | Compatibility work |
|---|---|---|
| Discovery | `as_uri`, `realm`, and `/.well-known/lws-configuration` | [MCP's 2025-11-25 authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) uses RFC 9728 resource metadata and authorization-server/OIDC discovery. Evaluate coexistence or a bridge; do not claim automatic compatibility |
| Credential acquisition | Credential suites plus RFC 8693 token exchange | Check interactive principals, unattended agents, machine clients, and delegated actors separately; determine which token types and grants the selected implementations actually produce |
| A2A | No direct A2A binding established in this inventory | The [A2A specification](https://a2a-protocol.org/latest/specification/) advertises security schemes, including OAuth2 and OIDC. Select and pin an implementation/version and test its supported flow |
| Token presentation | LWS uses audience-restricted Bearer access tokens | Compare against the agent stack's token presentation and proof-of-possession requirements; do not silently strip or bypass those protections |
| Acting for someone else | Subject and client claims plus access-request parties | Define principal, client, requester, assignee, and any delegation chain distinctly; carry authority through each hop without widening it |
| Lifetime and revocation | Credential/token validity and grant state are separate | Test expiry, key rotation, grant revocation, and cached decisions; a short-lived token alone does not prove immediate revocation |

For each selected system, record specification version, implementation version, credential type, issuer discovery, registration, grant flow, audience binding, token presentation, consent, delegation, and revocation. Classify outcomes as direct interoperability, adapter required, specification change required, or unsupported, and attach the evidence.

### First MCP adapter experiment

Evaluate two distinct connections: the agent's MCP client authenticates to the adapter, and the adapter acts as a client of the LWS server. Successful MCP authentication does not itself supply an acceptable LWS credential or a storage grant. MCP's [token-passthrough guidance](https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices#token-passthrough) rules out using a foreign-audience token as a transparent shortcut.

Proposed experiment:

1. Connect a selected MCP client to a remote HTTP adapter using its supported authorization flow. Record registration and consent steps.
2. Have the adapter discover LWS metadata, credential suites, authorization service, and supported content types, including the Turtle-only configuration.
3. Acquire a credential accepted by the selected LWS suite under an explicit user delegation or separately authorized service identity. Determine whether the existing identity provider can issue it; do not assume an MCP access token is an acceptable exchange input.
4. Use the defined LWS token exchange to obtain a token for the storage audience. Obtain any required resource grant through the access-request lifecycle; authentication alone does not provide it.
5. Execute a scoped read through the MCP tool, then test a denied operation, expiry/re-authentication, and grant revocation. Verify subject/client attribution at the storage boundary.

Measure ease of integration by manual registration steps, bespoke credential code, user interactions, configuration fields, and recovery behavior. The desired demonstration lets a user connect the adapter and approve bounded access without copying tokens manually. Evaluate an unattended service separately, with its authority provisioned explicitly. A local stdio adapter has a different credential-delivery path and does not inherit the remote HTTP authorization flow.

Initial assessment: an adapter boundary is plausible, but direct compatibility is unproven. The main questions are accepted credential types and issuer trust, delegation, discovery alignment, and the lifecycle linking a grant to a usable storage token. Shared use of OAuth terminology or Bearer headers is insufficient evidence of easy integration.

## Sequence and pending decisions

Start H immediately and coordinate its ETag work with PR #228. Draft R and P together because serialization choices affect policy validation. Use P to define A's ODRL semantics, then build the shared provider interface and three-language demonstration. G can inventory client requirements in parallel and supplies the authentication cases for the final demo.

Confirmed direction: server metadata lists supported content types, a Turtle-only configuration is allowed, and MCP adapter authentication is the first agentic-system target.

Decisions still needed:

- The minimum client format support and the exact discovery bootstrap for Turtle-only deployments.
- Which MCP client/adapter and identity-provider versions to use for the first experiment, followed by any additional agent systems.
- The profile identifiers, exact capability vocabulary, and negotiation syntax.
- Whether multiple authorization languages coexist per scope and, if so, their exact composition.
- The grant policy type and the approval/activation/revocation semantics it represents.

Current completion status: initial source inventory and proposal outline complete; full conformance audit, normative companion specifications, representation fixtures, and integrated demonstration remain to be developed and reviewed.
