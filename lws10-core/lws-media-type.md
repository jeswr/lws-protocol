### Representation Capabilities

Storage descriptions, container listings, access requests, and access grants have RDF data models. Their JSON examples use compact property names; those names and a particular nesting or array layout are required only by the fixed JSON representations below. Other representations MUST preserve the required RDF statements and constraints for the same authorized view and page. A server MUST NOT omit a policy constraint during serialization or treat a lost or unsupported constraint as satisfied.

A server MUST advertise its supported representations in its storage description using one or more `lws:RepresentationCapability` nodes linked by `lws:capability`. Each node MUST have:

| RDF property | Value |
|---|---|
| `lws:appliesTo` | One object class: `lws:Storage`, `lws:Container`, `lws:AccessRequest`, `lws:AccessGrant`, `lws:Notification`, or `lws:WebhookSubscription` |
| `lws:produces` | One or more concrete response media types, as strings including any required parameters |
| `lws:accepts` | Zero or more concrete request media types; required if the scoped endpoint accepts object representations |
| `lws:representationScope` | Zero or one endpoint IRI; absence means every object of that class in this storage; presence means the named service endpoint and objects managed by that service |
| `lws:representationProfile` | Zero or one IRI identifying an additional layout contract, when such a guarantee is offered |

Each capability describes a supported combination, not independent lists whose cross-product may be assumed. Scope follows storage/service membership, never string-prefix matching. For an object, the applicable records are those scoped to its service if present, otherwise the unscoped records for its class. Contradictory records MUST NOT be published. Capabilities MUST reflect the current configuration; advertising a layout commits the server to producing it when its media type is selected.

For each implemented storage, container, access-request, and access-grant object class, a server MUST offer at least one of `text/turtle` [[!TURTLE]] and `application/ld+json` [[!JSON-LD11]], for responses and for accepted object payloads where applicable. A server MAY offer only Turtle. An RDF-capable <a>LWS Client</a> MUST support both formats for these objects, so it can retrieve discovery metadata before reading the capability list. A client supporting only the fixed JSON layout is a profile-specific client and MUST report lack of support when that profile is unavailable.

These requirements concern protocol-defined structured objects. They do not constrain ordinary stored payloads such as images. Linksets retain their [[!RFC9264]] representations; OAuth messages retain their OAuth formats. Optional notification suites retain their suite-defined delivery formats. The current Webhook suite requires fixed JSON notifications and subscriptions; a Turtle-only configuration therefore does not advertise that suite. Its subscription endpoint capabilities describe accepted subscription payloads, and its notification capabilities describe delivery formats rather than GET representations.

#### Fixed JSON Representations

The optional layout profile `https://www.w3.org/ns/lws#FixedJsonRepresentation` defines the following representations:

- `application/lws+cid` is a storage description conforming to [[!CID-1.0]], with the LWS extensions and context sequence defined in <a href="#storage-description-representation"></a>.
- `application/lws+json` is a container, access request, access grant, notification, or webhook subscription using the compact JSON structure defined for that object in this specification. Context terms MUST resolve to the specified vocabulary IRIs. Containers use the `items` array even when empty; access documents use the arrays and property names shown in their serialization requirements.

Servers offering these media types MUST advertise the fixed JSON profile for the corresponding object classes. Servers MAY offer generic JSON-LD without this profile. The profile constrains observable structure; it does not require executing a JSON-LD framing algorithm, canonicalize JSON bytes, or define signature input.

`application/ld+json` does not imply the fixed layout. `application/json` is not an alias for every RDF representation. If offered for a fixed-layout object, it MUST contain the same fixed-layout JSON-LD information and be advertised explicitly. A context URL is not implicitly a representation profile identifier. No custom parameter is added to the JSON-LD media-type registration by this specification.

#### HTTP Negotiation

Clients select an advertised representation using `Accept`; the fixed layout is selected by requesting its dedicated media type. Servers MUST apply [[!RFC9110]] Section 12.5.1, including media-range precedence, parameters, wildcards, and quality values. A representation excluded by its most specific matching range with `q=0` MUST NOT be selected. Among acceptable representations, servers select one of the highest-quality alternatives; ties are server-selected. With no `Accept`, any supported representation may be selected. Servers MUST return 406 when none is acceptable, and MUST return the actual selected `Content-Type`. An unsupported request representation MUST receive 415.

Responses selected using `Accept` MUST include `Vary: Accept`, including applicable 304 responses. Other selection fields, such as `Accept-Encoding`, MUST also be included in `Vary` when used. Strong validators MUST NOT be shared by byte-different representations. A client using `If-Match` MUST use a strong validator for the representation to which that precondition applies; it MUST NOT assume graph equivalence makes validators interchangeable. If a transformed PUT cannot return a validator under HTTP rules, the client obtains one with a subsequent GET or HEAD before its next conditional write.


#### Pagination

Certain composite resources, like <a>containers</a>, may hold a large number of resources. 
To allow clients to retrieve listings incrementally, servers SHOULD support
pagination for <a>containers</a> whose membership exceeds a server-determined threshold.

##### Pagination Model

Pagination is link-based: the server provides pagination URIs via HTTP `Link` headers [[!RFC8288]],
allowing clients to navigate the full listing without relying on numeric offsets.

When a listing is paginated, the response body contains only the current page of items. The
composite resource's `id`, `type`, and `totalItems` properties reflect the full membership, while `items`
contains only the resources on the current page.

##### Pagination Link Relations

Pagination URIs are conveyed in `Link` headers using the following standard link relations:

- **`rel="first"`**: The URI of the first page of results. MUST be present on paginated responses.
- **`rel="last"`**: The URI of the last page of results. MAY be present on paginated responses.
- **`rel="next"`**: The URI of the next page of results. MUST be present when there are subsequent
pages. MUST be omitted on the last page.
- **`rel="prev"`**: The URI of the previous page of results. MAY be present when there are preceding
pages. MUST be omitted on the first page.

All pagination URIs are opaque to the client. Clients SHOULD NOT construct or modify pagination
URIs; they SHOULD use the URIs provided by the server.

##### Requesting Pages

A client requests the composite resource's URI to obtain the first page. The response includes pagination
Link headers that the client follows to retrieve subsequent pages. Servers MAY also support
direct access to specific pages via the pagination URIs obtained during a previous scan.

For a successful full GET of a page, the server responds with 200 OK; conditional requests remain subject to HTTP preconditions. The `totalItems`
property in the response body SHOULD reflect the total number of items across all pages, not just the current page.

##### Example: Paginated Container

Request:
```
GET /alice/photos/ HTTP/1.1
Authorization: Bearer <token>
Accept: application/lws+json
```

Response (first page):
```
HTTP/1.1 200 OK
Content-Type: application/lws+json
ETag: "photos-page1-etag"
Link: </alice/photos/.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/>; rel="up"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
Link: </alice/photos/?page=1>; rel="first"
Link: </alice/photos/?page=3>; rel="last"
Link: </alice/photos/?page=2>; rel="next"

{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/photos/",
  "type": "Container",
  "totalItems": 150,
  "items": [
    {
      "type": "DataResource",
      "id": "/alice/photos/vacation.jpg",
      "format": "image/jpeg",
      "size": 248392,
      "modified": "2025-11-20T10:30:00Z"
    },
    {
      "type": "DataResource",
      "id": "/alice/photos/portrait.png",
      "format": "image/png",
      "size": 102400,
      "modified": "2025-11-21T14:15:00Z"
    }
  ]
}
```

Request (next page):
```
GET /alice/photos/?page=2 HTTP/1.1
Authorization: Bearer <token>
Accept: application/lws+json
```

Response (middle page):
```
HTTP/1.1 200 OK
Content-Type: application/lws+json
ETag: "photos-page2-etag"
Link: </alice/photos/.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/>; rel="up"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
Link: </alice/photos/?page=1>; rel="first"
Link: </alice/photos/?page=1>; rel="prev"
Link: </alice/photos/?page=3>; rel="next"
Link: </alice/photos/?page=3>; rel="last"

{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/photos/",
  "type": "Container",
  "totalItems": 150,
  "items": [
    {
      "type": "DataResource",
      "id": "/alice/photos/sunset.jpg",
      "format": "image/jpeg",
      "size": 315000,
      "modified": "2025-11-22T09:00:00Z"
    }
  ]
}
```
