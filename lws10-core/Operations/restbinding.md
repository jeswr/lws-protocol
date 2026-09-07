The HTTP binding defines creation, retrieval, modification, and deletion of LWS resources. Servers and clients MUST conform to HTTP Semantics [[!RFC9110]] and HTTP Caching [[!RFC9111]], and to the HTTP version they use. HTTP/1.1 examples do not mandate that version. PATCH uses [[!RFC5789]], links use [[!RFC8288]], and linksets use [[!RFC9264]].

All HTTP examples are non-normative. Protocol-version framing fields may be omitted for readability. An explicit Content-Length counts the body octets, not characters or the displayed header block.

The following requirements apply across operations:

- Servers MUST perform normal request checks, including authentication and authorization, before evaluating preconditions, following [[!RFC9110]] Section 13.2. Preconditions MUST NOT be used to disclose an otherwise unauthorized representation.
- A method not allowed on an existing resource MUST receive 405 with Allow; 501 is reserved for unimplemented functionality as defined by HTTP. OPTIONS responses SHOULD advertise Allow and applicable Accept-Patch values.
- Successful HEAD, 204, and 304 responses MUST comply with HTTP's content and Content-Length restrictions. ETag is not prohibited on 204; successful PUT validators remain subject to Section 9.3.4.
- Content negotiation, cache variation, and representation validators MUST follow <a href="#lws-media-type"></a>. An RDF data model is not itself a byte representation or a strong validator.
- Authentication failures MUST carry the challenge defined in <a href="#authorization-server-discovery"></a>. A valid identity alone does not authorize a storage operation.

Browser-facing servers SHOULD implement CORS as defined by [[FETCH]]. Preflight handling MUST NOT grant access to the protected operation. When an origin is allowed, servers SHOULD expose the response fields required by clients, including Link, ETag, WWW-Authenticate, Allow, Accept-Patch, Location, and Preference-Applied. Origin-dependent responses MUST vary on Origin. A wildcard origin cannot be combined with credentialed CORS access. Server policy may restrict origins independently of resource authorization.

The optional `set-linkset` preference is an LWS extension using the preference framework of [[!RFC7240]]; RFC 7240 does not itself define that preference's semantics. Clients requiring combined content/linkset updates MUST establish server support before using it. The metadata rules below protect server-managed links regardless of requested update format.
