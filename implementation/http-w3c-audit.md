# HTTP and W3C specification audit

Audit baseline: `w3c/lws-protocol` revision `602ca1917b45450163400a43edaf961cec20873e`. This report records proposed corrections in the personal fork. It is not a Working Group resolution or a publication-conformance certificate. Correction classes below are suggested using the repository's W3C correction-class convention; editors determine the final classification.

## Corrections implemented

| Finding and affected clause | Controlling source | Disposition and verification | Suggested class |
|---|---|---|---|
| REST binding only “tries” to follow HTTP; obsolete 723x references | [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110), [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111) | Explicit HTTP and cache conformance; current core references updated; snapshots preserved; reference regression check | 3 |
| Failed If-Match alternatively described as 409 | RFC 9110 §§13.1.1, 13.2 | Update clause uses 412; preconditions evaluated after normal authorization checks; coordinate upstream [PR228](https://github.com/w3c/lws-protocol/pull/228) | 3 |
| Shopping-list response says 34 bytes | RFC 9110 §8.6 | 58 UTF-8 bytes with explicit LF framing; assertion derives length from the example body | 2 |
| GET 200 wording obscures conditional responses; HEAD body/length unspecified | RFC 9110 §§9.3.2, 15.4.5 | Conditional GET/HEAD, bodyless 304, HEAD corresponding-GET length, precondition precedence clarified | 3 |
| “Set requested media type” ambiguous for real Accept lists | RFC 9110 §12.5.1 | Range specificity, q=0 exclusion, alternatives, parameters, absent Accept, 406 and 415 defined; proposal deliberately requires highest acceptable quality | 4 |
| One logical RDF resource mistaken for one byte representation | RFC 9110 §§8.8, 9.3.4 | Strong validators differ for byte-different representations; transformed PUT cannot return prohibited validators; subsequent read obtains a write validator | 3 |
| Cache selection and protected representations underspecified | RFC 9110 §12.5.5; RFC 9111 §§3.2, 4.1 | Vary for selected representations, relevant 304 fields, authorized caching/privacy requirements | 3 |
| 401 versus policy-denied 403 and challenge handling | [RFC 6750 §3](https://www.rfc-editor.org/rfc/rfc6750#section-3), [RFC 9068 §4](https://www.rfc-editor.org/rfc/rfc9068#section-4) | Required challenge, strict token validation, separate authentication/policy errors; native positive and negative token tests in companion implementation | 3 |
| Method and patch-format discovery | [RFC 5789](https://www.rfc-editor.org/rfc/rfc5789); [RFC 7396](https://www.rfc-editor.org/rfc/rfc7396) | 405/Allow versus 501 clarified; patch media types advertised; JSON Merge Patch retained for JSON linksets, not imposed on arbitrary RDF objects | 3 |
| Undefined metadata Prefer behavior | [RFC 7240](https://www.rfc-editor.org/rfc/rfc7240) | Removed undefined include/omit behavior; set-linkset explicitly identified as an LWS extension, unknown preferences ignored, applied preference acknowledged | 3 |
| Direct updates to up/items contradict containment integrity | [Core containment model](../lws10-core/logicalresourceorganization.md) and [metadata](../lws10-core/Operations/metadata.md) | Server-managed classification and atomic rejection of direct containment/membership changes; resource operations govern membership | 3 |
| Recursive Depth resembles WebDAV without its semantics | RFC 9110 §9.3.5; [RFC 4918](https://www.rfc-editor.org/rfc/rfc4918) | Explicitly an LWS extension; every affected resource authorized before atomic deletion; no blanket WebDAV conformance claim | 3 |
| Browser clients cannot necessarily read required response fields | [Fetch CORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol) | Preflight does not grant resource access; expose required fields, vary on Origin, credentialed wildcard restriction | 3 |
| Subject/client and exchange metadata inconsistent | [RFC 8693](https://www.rfc-editor.org/rfc/rfc8693), [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414) | Client URI preserved; registered `id_token` spelling; required issued_token_type; discovery path construction and issuer/resource/client trust specified | 3 |
| IANA text implies registrations already exist and has incomplete templates | [RFC 6838 §5.6](https://www.rfc-editor.org/rfc/rfc6838#section-5.6), [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615), [RFC 6839](https://www.rfc-editor.org/rfc/rfc6839) | Registration requests, complete template fields, fragment behavior, stable section anchors; still subject to registration review | 2/3 |
| Optional fixed JSON has no discovery/conformance contract | [W3C Specification Guidelines](https://www.w3.org/TR/qaframe-spec/), [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) | Server/client classes, optional-feature claims, abstract RDF models and capability-scoped fixed layout; explicit Turtle-only case; graph and strict-context regressions | 4 |
| ODRL and ActivityStreams target collide in protected context | JSON-LD 1.1 scoped/protected contexts | ODRL target scoped under access/AccessPolicy; notification target expands correctly with original ActivityStreams context; strict processor regression | 3 |

## Specification-quality checks

Core and both new companion documents were rendered with ReSpec in a browser. The new companions identify themselves as unofficial personal proposals. Core `specStatus` configuration is corrected; generated headings, references and included Markdown are checked. The core retains pre-existing warnings about unreferenced definitions. The front-matter cleanup remains the separate [personal PR1](https://github.com/jeswr/lws-protocol/pull/1).

The RDF fixtures check model/serialization consistency; the generated context uses correct CID service IRIs and HTTPS schema.org terms. The vocabulary build propagates conversion errors and CI regenerates its context before testing. Notifications/subscriptions retain their existing fixed-JSON suite contract and are explicitly outside the Turtle-only configuration when that suite is enabled. WAC/ACP bindings retain their source specifications' semantics and do not redefine external access modes.

The [W3C transition guidance](https://www.w3.org/guide/transitions/) remains the publication process authority. Source validity and test results cannot substitute for Working Group consensus, formal horizontal review, implementation reports, or registry approvals.

## Tracked follow-up and limits

| Item | Current disposition |
|---|---|
| CID-specialization media-type registration | The proposed `application/lws+cid` and any required structured-suffix treatment need explicit IANA coordination; no registered status is assumed. |
| Full security/privacy, internationalization and accessibility review | Core still contains broader editorial placeholders; companions add policy/credential threats. Formal horizontal reviews and questionnaires remain required before the relevant publication transition. |
| Core introduction, status and editorial scaffolding | Separate PR1 and future editorial review; this behavioral PR does not silently merge that PR. |
| Ranges, content codings, all conditional combinations | Normative HTTP dependencies govern them; no complete server wire-level matrix or formal HTTP compliance result is claimed by these document fixtures. |
| Linkset representation and combined-update design | Preserve RFC9264 format; coordinate [issue189](https://github.com/w3c/lws-protocol/issues/189), [issue188](https://github.com/w3c/lws-protocol/issues/188), and [PR180](https://github.com/w3c/lws-protocol/pull/180). This change does not invent RDF linksets. |
| ODRL profile and access-model alignment | Coordinate [issue143](https://github.com/w3c/lws-protocol/issues/143) and [issue196](https://github.com/w3c/lws-protocol/issues/196). Draft namespace/profile identifiers require WG approval and context publication. |
| WAC policy generation across one operation | Existing live ACL-store semantics are preserved; the new whole-request generation requirement is implemented for ACP/ODRL only. WAC evidence is a semantic/native-route demonstration, not full binding conformance. |
| WAC/ACP HTTP access-grant compilers | Native authorization bindings are demonstrated; shared request→grant service compilation is only implemented for the bounded ODRL reference service. Independent-policy ownership and non-broadening translation need dedicated implementations. |
| Turtle-only native LWS wire conformance | Proposal, metadata model, RDF examples and graph equivalence are implemented here. The SPARQ companion is an authentication/authorization reference; it does not claim every new core serialization/negotiation clause. |
| Remote MCP registration and consent | Standards comparison and stdio adapter-to-LWS experiment complete; remote HTTP client-to-adapter OAuth needs a separate integration, as recorded in the compatibility report. |
| Historical Solid review mentioned by Jesse | [solid/specification issue587](https://github.com/solid/specification/issues/587) verifies CG report status/style/copyright concerns. Its CG-specific rules do not replace WG requirements. The particular historical HTTP critique is still unidentified; no finding is attributed to it. |

The [implementation report](README.md) separates document assertions, native route tests, and end-to-end SDK evidence. Each remaining item above is an explicit limitation rather than an assertion that the whole standards process has completed.
