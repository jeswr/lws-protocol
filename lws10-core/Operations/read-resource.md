Retrieves the representation of an existing resource or the listing of a <a>container</a>.

* **Inputs**: Target identifier and optional parameters.
* **Behavior**:
    * For non-container resources, the server returns the resource content.
    * For <a>containers</a>, the server returns a listing of member resources which MAY be filtered based on <a href="#container-membership-and-authorization">authorization</a>. Listings must include core metadata for each member.
* **Outcome**: The requested representation or a notification of failure.

The read resource operation requests a resource representation with HTTP GET requests (and HEAD for header-only requests). The behavior differs depending on whether the target URL is a <a>container</a> or a non-container resource (<a>data resource</a>). Servers MUST distinguish resource types via metadata. All responses MUST integrate with metadata as defined in Section 8.1, including Link headers for key relations such as `rel="linkset"`, `rel="up"`, and `rel="type"`. Servers MUST ensure atomicity between the resource state and its metadata during reads.

**GET (non-container resource)** – *Retrieve a resource's content:*
Send GET to the resource URI for full content (if authorized). Respond with 200 OK, body containing the data, and Content-Type identifying the selected representation. Servers MUST support range requests per [[!RFC9110]] for partial retrieval. Responses MUST include an ETag header for concurrency control and caching.

**Example (GET a file):**
```
GET /alice/notes/shoppinglist.txt HTTP/1.1
Authorization: Bearer <token>
Accept: text/plain
```
This requests the content of `/alice/notes/shoppinglist.txt`, indicating that the client wants it in text form. Assuming the resource exists, is text, and the client has access:
```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=UTF-8
Content-Length: 58
ETag: "abc123456"
Link: </alice/notes/shoppinglist.txt.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/notes/>; rel="up"
Link: <https://www.w3.org/ns/lws#DataResource>; rel="type"

milk
cheese
bread
guacamole
soda
chocolate bars
hash
eggs
```
The server returned the text content (58 UTF-8 bytes, with one LF after each displayed body line, including the final line). The content is exactly the stored data in the file. The `ETag: "abc123456"` is a version identifier for caching or concurrency purposes. The response includes Link headers for metadata discoverability, with mandatory fields such as `up` and `type`.

**GET (<a>container</a> resource)** – *List a <a>container</a>'s contents:*
When the target URI corresponds to a <a>container</a> (determined via metadata type), a GET request returns a listing of the <a>container</a>'s members. The response body is a <a>container representation</a> as defined in the [Container Representation](#container-representation) section, using a supported representation selected as defined in <a href="#lws-media-type"></a>. The listing includes metadata for each member: resource identifiers (MUST), types (MUST), media types (MUST for DataResources), sizes (SHOULD), and modification timestamps (SHOULD).

**Example (GET a container):**
```
GET /alice/notes/ HTTP/1.1
Authorization: Bearer <token>
Accept: application/lws+json
```
Assuming the container exists and the client has access:
```
HTTP/1.1 200 OK
Content-Type: application/lws+json
ETag: "container-etag-789"
Link: </alice/notes/.meta>; rel="linkset"; type="application/linkset+json"
Link: </alice/>; rel="up"
Link: <https://www.w3.org/ns/lws#Container>; rel="type"

{
  "@context": "https://www.w3.org/ns/lws/v1",
  "id": "/alice/notes/",
  "type": "Container",
  "totalItems": 2,
  "items": [
    {
      "type": "DataResource",
      "id": "/alice/notes/shoppinglist.txt",
      "format": "text/plain",
      "size": 47,
      "modified": "2025-11-24T12:00:00Z"
    },
    {
      "type": ["DataResource", "http://example.org/customType"],
      "id": "/alice/notes/todo.json",
      "format": "application/json",
      "size": 2048,
      "modified": "2025-11-24T13:00:00Z"
    }
  ]
}
```
In this example, `/alice/notes/` is a <a>container</a>. The response uses JSON-LD with the LWS context, listing members with required metadata. Each item includes its `type`, `id`, `format`, `size`, and `modified` timestamp as flat properties.

In successful container GET/HEAD responses, the server MUST include the following metadata in the response headers: an ETag (representing the listing version, which changes on membership modifications), and Link headers with `rel="type"` indicating it is a <a>container</a>, `rel="linkset"` and `rel="up"` for a non-root container.

**HEAD (any resource or <a>container</a>)** – *Headers/metadata only:*
The LWS server MUST support HEAD for containers and data resources, conforming to [[!RFC9110]] Section 9.3.2. It MUST NOT send response content. The selected representation's ETag, Content-Type, and required discovery links MUST be supplied; a Content-Length, if supplied, describes the corresponding GET content, not the empty HEAD response.

**Caching and Conditional Requests:** Servers MUST evaluate preconditions in the order defined by [[!RFC9110]] Section 13, after normal request checks including authorization. If-None-Match takes precedence over If-Modified-Since. A failed GET/HEAD cache precondition produces 304 as specified there, with no content and the required validator/cache fields. Successful GET/HEAD responses MUST carry the selected representation's ETag; this requirement does not add ETags to error responses. Authorized representations MUST NOT be reused across principals without authorization and cache controls that permit it, following [[!RFC9111]] Section 3.2. Servers SHOULD use `Cache-Control: private` for user-specific listings and grants unless a stricter policy is required.

**Discoverability and Authorization:** For enhanced discoverability, servers MUST include WWW-Authenticate headers on 401 Unauthorized responses with parameters to guide clients without hardcoded URIs. Metadata links SHOULD be included where applicable.
