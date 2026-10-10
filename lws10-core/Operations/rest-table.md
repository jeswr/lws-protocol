### Summary of HTTP Status Mappings
This table maps generic LWS [responses](#dfn-responses) (from Section 8) to HTTP status codes and payloads for consistency, incorporating specific scenarios such as pagination, conditional requests, quota constraints, and metadata integration:
| LWS response | HTTP status code | HTTP payload |
| ----- | ----- | ----- |
| [Success](#dfn-success) (read or update, returning data) | `200 OK` | [Resource representation](#dfn-resource-representation) in the response body (for GET or if PUT/PATCH returns content), along with relevant headers (`Content-Type`, `Link` for metadata such as `rel="linkset"` or `rel="up"`). For container listings, include JSON-LD with normative context and member metadata (IDs, types, sizes, timestamps, etc.). |
| [Created](#dfn-created) (new resource) | `201 Created` | Typically no response body (or a minimal representation of the new resource). The `Location` header is set to the new resource's URI. `Link` headers for server-managed metadata. |
| Deleted (no content to return) | `204 No Content` | No response body. Indicates the resource was deleted or the request succeeded and there's nothing else to say. Servers MAY respond to later requests for a permanently deleted resource with `410 Gone`. |
| Bad Request (invalid input or constraints) | `400 Bad Request` | Error details explaining what was wrong. Servers SHOULD use the standard format defined in [[RFC9457]] for structured error responses, such as a JSON object with fields like `"type"`, `"title"`, `"status"`, `"detail"`, and `"instance"`. |
| [Unknown requester](#dfn-unknown-requester) | `401 Unauthorized` | `WWW-Authenticate` header as defined in [[RFC9110]]. |
| [Not permitted](#dfn-not-permitted) | `403 Forbidden` | Servers MAY use `404 Not Found` instead where revealing the existence of the resource is a security risk. |
| Target not found | `404 Not Found` | |
| Conflict (state conflict, e.g. deleting a non-empty container) | `409 Conflict` | A failed precondition (`If-Match`) uses `412 Precondition Failed`. |
| [Unknown error](#dfn-unknown-error) | `500 Internal Server Error` | |
| Method not supported on the target (e.g. `PUT` on a <a>linkset resource</a> that does not advertise it) | `405 Method Not Allowed` | `Allow` header listing the supported methods. |
| Unsupported request or patch media type | `415 Unsupported Media Type` | For `PATCH`, an `Accept-Patch` header listing the supported patch formats. |
| Requested optional feature not implemented (e.g. `Prefer: set-linkset`) | `501 Not Implemented` | |
| Quota exceeded | `507 Insufficient Storage` | As defined in [[RFC4918]]. |
