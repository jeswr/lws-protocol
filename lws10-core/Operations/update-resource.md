Modifies the state of an existing [served resource] via full replacement or a partial patch.

* **Inputs**: Target identifier, new content, and optional concurrency constraints.
* **Behavior**: The server applies the changes atomically. If concurrency constraints are provided, the update is rejected if the resource has been modified since it was last read by the requester.
* **Outcome**: Confirmation of the update or a notification of conflict.

The [update resource](#dfn-update-resource) modifies the contents of an existing [served resource](#dfn-served-resource) by a PUT request (to replace the entire resource) or a PATCH request (to apply a partial modification). The client must have write access to the resource’s URL to perform these operations.
Note: This section describes updating a resource's primary content. To update its metadata, see Section 9.3.2.
LWS servers MUST handle PUT and PATCH requests on resource URIs as modifications to the resource content only, with no default impact on the associated <a>linkset resource</a>. To optionally update both content and metadata in a single atomic operation, clients MAY include Link headers in the PUT/PATCH request to the resource URI and specify the preference 'Prefer: set-linkset' (an LWS extension using [[!RFC7240]]). In this case, the server MUST interpret the provided Link headers as a replacement (for PUT) or partial update (for PATCH) to the linkset, in addition to applying the content changes. This behavior is OPTIONAL for servers but, if supported, MUST be invoked explicitly via the Prefer header to prevent unintentional metadata overwrites. Servers that do not support combined updates MUST ignore the preference as required by [[!RFC7240]]. A server applying it MUST report `Preference-Applied: set-linkset`; clients requiring atomic content/linkset changes MUST verify that acknowledgement. This preference does not change the meaning of the negotiated representation.

**PUT (replace full resource)** – Send PUT to the resource URI with new full content in the body and matching Content-Type (generally consistent with existing type). PUT is idempotent for existing resources. For safety, include If-Match with current ETag (per Section 7.3 concurrency); a failed If-Match precondition yields 412 Precondition Failed under [[!RFC9110]] Section 13. Without checks, updates are unconditional but risk overwriting concurrent changes. If a server supports `ETags` for a resource, it MUST reject unconditional PUT requests that lack an If-Match header with a 428 Precondition Required response.

**Example (PUT to update a resource):**
```
PUT /alice/personalinfo.json HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json
If-Match: "abc123456"
{
"name": "Alice",
"age": 30,
"city": "New London",
"state": "Connecticut"
}
```
In this example, the client is updating an existing JSON resource at /alice/personalinfo.json. It includes an If-Match header with the ETag "abc123456" that it got from an earlier GET or HEAD request. The server will compare that to the current ETag; if they match, it proceeds to replace the content with the JSON provided. If they don’t match, the server rejects the update (because the resource was changed by someone else in the meantime).
Successful response: If the update succeeds, the server can respond with 200 OK and possibly include the updated representation or some confirmation (like the new content or a part of it). Alternatively, the server may respond with 204 No Content to indicate success with no body (especially common if no further info needs to be conveyed). A PUT success response MUST comply with the validator restrictions in [[!RFC9110]] Section 9.3.4. When permitted, the server SHOULD provide the new ETag. A response carrying a representation MUST identify its Content-Type. The following response assumes the submitted representation was stored without transformation. For example:
```
HTTP/1.1 204 No Content
ETag: "def789012"
```
This tells the client the update went through and provides the new `ETag`. If the server chose to return the updated content, it might use `200 OK` and include the JSON in the body, along with headers.
* **Error responses:** A false If-Match precondition MUST be handled according to [[!RFC9110]] Sections 13.1.1 and 13.2; 409 is not an alternative for failed preconditions. Use 409 for an independent state conflict. A server permitting creation by PUT follows the creation semantics of Section 9.3.4; `If-Match: *` requires an existing representation. Invalid credentials produce 401 with a challenge; insufficient permission produces 403, subject to the specification's permitted concealment of resource existence. Malformed content produces 400 and an unsupported request representation produces 415.

**PATCH (partial update)** – The HTTP PATCH method [[RFC5789]] allows a client to specify partial modifications to a resource, rather than sending the whole new content. This is useful for large resources where sending the entire content would be inefficient if only a small part changed, or for concurrent editing where you want to apply specific changes. Servers MUST advertise applicable patch formats using Accept-Patch [[!RFC5789]]. A format MUST NOT be advertised for a resource to which its semantics cannot be applied. JSON Merge Patch [[!RFC7396]] is required for JSON linksets; it is not a requirement to convert Turtle-only structured objects to JSON. Other resource formats MAY use separately specified patches, or whole-representation PUT where supported.

**Update Resource Metadata (HTTP PUT / PATCH on Linkset)**
A resource's metadata is updated by modifying its corresponding <a>linkset resource</a>, discovered via the Link header with rel="linkset".
Full Replacement (PUT): A PUT request to the <a>linkset resource</a> URI with a complete linkset document in the body replaces all metadata for the resource.
Partial Update (PATCH): A PATCH request to the <a>linkset resource</a> URI adds, removes, or modifies specific links.

**Concurrency Control for Metadata**
Because a resource's metadata can be modified by multiple actors, preventing concurrent overwrites is critical. To ensure data integrity, LWS servers and clients MUST implement optimistic concurrency control using conditional requests [[RFC9110]] for all PUT and PATCH operations on a <a>linkset resource</a>.
Server Responsibilities:
A server MUST include an ETag header in its responses to GET and HEAD requests for a <a>linkset resource</a>.
After a linkset changes, its validators MUST reflect the selected representation. A successful PUT MUST NOT include an ETag if prohibited by [[!RFC9110]] Section 9.3.4; clients then retrieve the new validator before another conditional update. A PATCH success SHOULD return the resulting representation validator when available.
Client Responsibilities:
When modifying a <a>linkset resource</a>, a client MUST include an If-Match header containing the most recent ETag it received for that resource.
Processing Rules:
If the If-Match header value does not match the linkset's current ETag, the server MUST reject the request with a 412 Precondition Failed status code.
If the If-Match header is missing from a PUT or PATCH request to a linkset URI, the server MUST reject the request with a 428 Precondition Required status code [[RFC6585]].
Example (PUT to replace a linkset):
A client first fetches the linkset and receives its ETag.
```
GET /alice/personalinfo.json.meta HTTP/1.1
Authorization: Bearer <token>
Accept: application/linkset+json
HTTP/1.1 200 OK
Content-Type: application/linkset+json
ETag: "meta-v1"
{
  "linkset": [
    {
      "anchor": "/alice/personalinfo.json",
      "describedby": [ { "href": "/schemas/personal-info.json" } ]
    }
  ]
}
```
The client now wants to add a license. It constructs a new, complete linkset document and sends a PUT request with the If-Match header.
```
PUT /alice/personalinfo.json.meta HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/linkset+json
If-Match: "meta-v1"
{
  "linkset": [
    {
      "anchor": "/alice/personalinfo.json",
      "describedby": [ { "href": "/schemas/personal-info.json" } ],
      "license": [ { "href": "https://creativecommons.org/licenses/by/4.0/" } ]
    }
  ]
}
```
If successful, the server responds with success and the new ETag.
```
HTTP/1.1 204 No Content
ETag: "meta-v2"
```

**Summary of Update Rules**
If you want to change only the content of a resource → PUT/PATCH the resource itself.
If you want to change only the links (metadata) of a resource → PUT/PATCH the resource’s associated <a>linkset resource</a>.
If you want to change both content and links → PUT/PATCH the resource itself, including the appropriate Link headers AND 'Prefer: set-linkset'. Setting both is off by default.