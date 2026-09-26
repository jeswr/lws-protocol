The **create resource** operation adds a new [served resource](#dfn-served-resource) to an existing <a>container</a>. This operation handles both the creation of <a>data resources</a> and sub-containers.

**Inputs:**

* **Target container:** The identifier of the <a>container</a> where the new resource will be created.
* **Identity hint:** An optional suggestion for the new resource's identifier. The server may use this hint but is not required to.
* **Content:** The initial content and type for the new resource.

**Behavior:**

* **Identity generation:** The server determines the final identifier (URI) for the new resource. If an identity hint was provided, the server attempts to incorporate it while ensuring uniqueness and validity within the <a>container</a>. If no hint is provided, the server generates a unique identifier.
* **Container membership update:** The server atomically adds the new resource to the membership listing of the target <a>container</a>.
* **Metadata initialization:** The server initializes system metadata for the new resource. If the resource has an associated <a>metadata resource</a> it is also initialized.

**Possible Responses:**

* <strong id="dfn-created">Created:</strong> The operation succeeded. The server returns the final identifier of the newly created resource.
* **Target Not Found:** The specified target <a>container</a> does not exist.
* **Not Permitted:** The client's identity is known, but they do not have permission to create resources in this <a>container</a>.
* **Unknown Requester:** The server does not recognize the client's identity and requires authentication.
* **Conflict:** A resource with the generated identifier already exists, or there is another state conflict.
* **Unknown Error:** An unexpected internal error occurred.

New resources are created using POST to a target <a>container</a> URI, with the server assigning the final identifier. Clients MAY provide initial user-managed metadata for the new resource by including one or more `Link` headers in the POST request, following the syntax of Web Linking in [[RFC8288]]. Server-managed metadata MUST be generated automatically by the server upon creation and MUST NOT be overridden by client-provided links.

On success, the server MUST return the 201 status code with the new URI in the `Location` header. The server MUST include `Link` headers for key server-managed metadata, including a link to the parent <a>container</a> (`rel="up"`), and a link to the created resource's dedicated <a>linkset resource</a> (`rel="linkset"; type="application/linkset+json"`). Additional links SHOULD include `rel="type"` (indicating `https://www.w3.org/ns/lws#Container` or `https://www.w3.org/ns/lws#DataResource`). The body MAY be empty or include a minimal representation of the resource. All metadata creation and linking MUST be atomic with the resource creation to maintain consistency.

**POST (to a container URI)** – *Create with server-assigned name:*
Use POST to add a new resource inside an existing <a>container</a>. The server assigns the identifier for the resource. Clients indicate the type of resource to create as follows:

- To create a **<a>Container</a>**, the client MUST include a `Link` header with `rel="type"` pointing to the Container type: `Link: <https://www.w3.org/ns/lws#Container>; rel="type"`.
- To create a **<a>Data resource</a>**, the client includes the resource content in the request body with the appropriate `Content-Type` header.

**Example (POST to create a new data resource):**
```
POST /o031yq HTTP/1.1
Host: alice.example.com
Authorization: Bearer <token>
Content-Type: text/plain
Content-Length: 43

milk
eggs
bread
butter
apples
orange juice
```
In this example, the client is posting a grocery list to the <a>container</a> `/o031yq`. If the container exists and the client is authorized, the server creates a new <a>data resource</a> and adds it to the container's membership. The client does not choose the new resource's URI.

**Example (Response to POST — Data Resource):**
```
HTTP/1.1 201 Created
Location: /xqq298
Content-Type: text/plain; charset=UTF-8
Link: </em6fpx>; rel="linkset"; type="application/linkset+json"; anchor="/xqq298"
Link: </o031yq>; rel="up"; anchor="/xqq298"
Link: <https://www.w3.org/ns/lws#DataResource>; rel="type"; anchor="/xqq298"
Content-Length: 0
```
On success, return 201 Created with the new URI in the `Location` header. The body may be empty or a minimal representation. The server-assigned resource URI `/xqq298` and linkset URI `/em6fpx` are opaque; their paths do not encode the container URI or a metadata suffix.

In this response, each `anchor` parameter identifies the newly created resource as the link context, following [[RFC8288]]. The `Location` header alone does not set the context of these links.

If the target <a>container</a> `/o031yq` does not exist, the server MUST return a 404 error status unless another status code is more appropriate.

**Creating <a>Containers</a>:** To create a new <a>container</a>, a client uses POST to an existing parent <a>container</a> with a `Link` header indicating the Container type. For example:
```
POST / HTTP/1.1
Host: alice.example.com
Authorization: Bearer <token>
Content-Length: 0
Link: <https://www.w3.org/ns/lws#Container>; rel="type"
```

**Example (Response to POST — container):**
```
HTTP/1.1 201 Created
Location: /o031yq
Link: </fljkzl>; rel="linkset"; type="application/linkset+json"; anchor="/o031yq"
Link: </>; rel="up"; anchor="/o031yq"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"; anchor="/o031yq"
Content-Length: 0
```
This creates a new <a>container</a> at `/o031yq` under the storage root `/`, with server-generated metadata including `rel="type"` as `https://www.w3.org/ns/lws#Container`. The container and its linkset have independently assigned URIs.

**Additional notes on Create (HTTP binding):**
* POST is not idempotent. Repeating it may create duplicates; clients SHOULD avoid unintentional retries or use unique identifiers/checks to prevent this.
* Metadata updates are atomic; servers MUST ensure the <a>linkset resource</a> is created and populated with mandatory server-managed fields before returning success.
* For discoverability, servers SHOULD include a `Link` header with `rel="https://www.w3.org/ns/lws#storage"` on 401 responses to guide clients without hardcoded URIs.

**Managing and Retrieving Metadata (Related to Creation):**
While metadata is primarily retrieved via read operations, it is generated during creation. Clients can immediately retrieve it post-creation using GET or HEAD on the new resource URI. Clients can use the `Prefer` header to request inclusion of specific metadata links (via relation types) and attributes.
