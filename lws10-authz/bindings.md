## Shared enforcement contract

An authorization binding consumes a verified subject and client, a storage operation, the affected resource identifiers, trusted environmental facts, and a server-selected policy snapshot. It produces Permit, Deny, or Indeterminate. Only Permit authorizes an operation. A failure to load policy, unsupported semantics, or unavailable required evidence MUST NOT become Permit.

The server MUST select one authoritative binding for each configured scope. A `lws:AuthorizationBindingCapability`, linked through `lws:capability` in storage metadata, identifies it with `lws:authorizationBinding` and lists its executable `lws:supportedAction` values. This version defines whole-storage scope; deployments needing finer scopes MUST specify a separate scope-selection contract before advertising it. These values describe configuration; a caller cannot change the evaluator by submitting a policy in a different language.

Identifiers are `lws:OdrlAuthorization`, `lws:WacAuthorization`, and `lws:AcpAuthorization`. ODRL capabilities MUST additionally advertise `dcterms:conformsTo lws:OdrlAccessProfile`. The identifiers are proposed additions in this review draft. Binding selection MUST NOT be taken from writable resource content, unsigned request fields, or an arbitrary policy URL supplied by the requester.

Every protected route MUST use the selected binding, including HEAD, metadata access, query admission, and mutations. One operation MUST use one immutable policy generation and one trusted evaluation time for all its authorization checks. A query is one authorization unit across all graphs; a mutation is one unit across all affected resources. Activation and revocation affect subsequent units; already-authorized in-flight units may finish under their pinned snapshot. Queries MUST see only authorized data, including paths and joins over named/default graphs. A mutation involving several resources MUST pass every required check before any change becomes visible. Policy administration is separate authority, not an implication of write access to ordinary content. The server MUST prevent a resource write from replacing its policy authority. Event delivery and pre-existing subscriptions MUST enforce the selected authority or be disabled for that binding.

The server MUST invalidate or version decision caches on activation, replacement, and revocation. Cache keys MUST include the relevant identity, client, operation, target, representation-sensitive facts, and policy revision. Time-limited permissions MUST NOT outlive their constraint boundary. A denied operation uses the core authorization error behavior without disclosing protected policy contents.

## ODRL binding

The binding uses the [ODRL Access Profile](../lws10-access-odrl/). Active Sets come only from the authorized grant lifecycle or a separately protected administration interface. Requests are not active policies. The profile defines explicit prohibition precedence, exact target matching, required read support, optional mutation actions, and trusted time constraints. Implementations MUST advertise their actual action subset and reject unsupported actions when admitting a policy.

A read-only implementation is a valid bounded ODRL binding if it advertises only `odrl:read`, denies mutations, and implements the required validation and temporal constraints. It MUST NOT claim support for create, modify, delete, duties, purpose, or client restrictions. The SPARQ demonstration report records its implemented subset separately from this specification.

## WAC binding

A WAC implementation MUST evaluate policy according to the [Web Access Control specification](https://solidproject.org/TR/wac), including policy discovery, agents/classes/groups, modes, and default authorization inheritance. Its RDF predicate meanings MUST NOT be redefined by this binding.

| LWS operation | Required WAC authority |
|---|---|
| Read / HEAD / query admission | `acl:Read` on each disclosed resource |
| Replace, remove existing content, or arbitrary patch | `acl:Write` on the affected resource |
| Append-only change | `acl:Append` or `acl:Write`, only after establishing that the change cannot remove/replace existing content |
| POST to create a child | `acl:Append` or `acl:Write` on the parent container |
| PUT to create a new resource | `acl:Write` on the new target, plus `acl:Append` or `acl:Write` on its parent container |
| Policy management | `acl:Control` and the policy's governing WAC rules |

Use authoritative LWS containment to resolve parent/default policy relationships. A path-shaped identifier is not proof of containment. The adapter MUST provide the WAC implementation with the actual parent chain; cycles or missing required context produce Indeterminate. Supporting a subset of WAC matchers is not a full WAC conformance claim.

A grant compiler MAY generate WAC rules only if the resulting authority is no broader than the approved request. This version provides an exact-subject/resource read translation to `acl:agent`, `acl:accessTo`, and `acl:mode acl:Read`. It does not translate temporal constraints or read-plus-purpose into unconstrained Read. A non-representable grant MUST receive 422 or require a separately advertised extension. Revocation removes only rules owned by that grant and preserves independently authorized policy.

## ACP binding

An ACP implementation MUST evaluate [Access Control Policy](https://solidproject.org/TR/acp) rules, controls, matchers, access modes, and inherited member controls according to that specification. It MUST distinguish controls on an access-control resource from controls on the resource it governs. Policy documents and referenced control resources MUST come from trusted policy storage and be protected by the appropriate policy-management authority.

ACP defines extensible modes rather than defining Read/Write/Append IRIs itself. This binding uses the WAC mode vocabulary. LWS read maps to `acl:Read`; mutations require the corresponding `acl:Write` or `acl:Append` permission and all affected-resource checks. An append-only permission MUST NOT authorize deletion or replacement. A server must resolve ACP resource and member relationships against its actual containment model. An absent, inaccessible, or malformed policy MUST NOT trigger WAC fallback.

An exact-resource read grant can be expressed as an ACP control applying a policy that allows `acl:Read`, with a required matcher for the assignee. Inheritance and additional matchers remain ACP concepts, not ODRL defaults. Translation of constraints MUST preserve their meaning; a condition unsupported by ACP and the installed matcher extensions MUST be rejected. Removal of a grant MUST not remove unrelated controls or matcher resources still used by other grants.

## Composition and comparison

This reference configuration selects one language. It does not define a cross-language union, intersection, or deny-overrides rule. A server offering simultaneous languages MUST use a distinct advertised composition extension with its own decision table. In particular, adding ODRL permissions to existing WAC/ACP permissions differs from requiring an ODRL permit in addition to WAC.

| Scenario within selected binding | Expected result |
|---|---|
| No applicable permission | Deny |
| Exact subject/resource read grant | Permit for read |
| Different subject or target | Deny |
| Read grant used for write | Deny |
| Request submitted but not approved | Deny unless another independent grant exists |
| Sole grant revoked before next check | Deny |
| Unsupported constraint during admission | Reject grant; no partial activation |
| Evaluation error | Indeterminate, enforced as denial |
| ODRL permission plus matching prohibition | Deny |
| Policy content claims a different evaluator | Ignore that selection attempt; use configured binding |

## Demonstration and evidence

The [implementation report](../implementation/README.md) links source revisions, runnable tests, and companion PRs. Each demonstration must identify whether it exercises graph validation, a policy evaluator, an authenticated storage route, or the HTTP grant lifecycle. An administration-API activation test must not be presented as an implemented access-request service. WAC/ACP translations and ODRL extensions need their own fixtures rather than an assertion that all three languages are equivalent.
