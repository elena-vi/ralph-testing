# Ralph Testing CRM API Reference

## Base URL

```
http://localhost:5000/api/v1
```

## Response Envelope

All API responses use a consistent envelope structure:

```json
{
  "success": true,
  "data": {},
  "message": "Optional success or error message",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

- **success**: Boolean indicating whether the request succeeded
- **data**: Response payload (varies by endpoint)
- **message**: Human-readable message (optional)
- **timestamp**: ISO 8601 timestamp of the response

## Contacts Endpoints

### GET /contact/list

Retrieve a paginated list of contacts.

#### Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| page | integer | 1 | N/A | Page number (1-based). Must be a positive integer. |
| pageSize | integer | 20 | 100 | Items per page. Cannot exceed 100; values above 100 are clamped. |

#### Response

Returns 200 OK with pagination data:

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      {
        "id": 2,
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com"
      }
    ],
    "total": 150
  },
  "message": "Success",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

#### Response Fields

- **data**: Array of contact objects
- **total**: Total number of contacts in the database (not the count on the current page)

#### Examples

**Example 1: Fetch first page with 20 results**

```bash
GET /contact/list?page=1&pageSize=20
```

Response:

```json
{
  "success": true,
  "data": {
    "data": [
      { "id": 1, "firstName": "Alice", "lastName": "Johnson", "email": "alice@example.com" },
      { "id": 2, "firstName": "Bob", "lastName": "Williams", "email": "bob@example.com" },
      ...
    ],
    "total": 150
  },
  "message": "Success",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

**Example 2: Fetch second page with 20 results**

```bash
GET /contact/list?page=2&pageSize=20
```

Response:

```json
{
  "success": true,
  "data": {
    "data": [
      { "id": 21, "firstName": "Charlie", "lastName": "Brown", "email": "charlie@example.com" },
      { "id": 22, "firstName": "Diana", "lastName": "Davis", "email": "diana@example.com" },
      ...
    ],
    "total": 150
  },
  "message": "Success",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

**Example 3: Fetch with custom page size**

```bash
GET /contact/list?page=1&pageSize=50
```

Returns the first 50 contacts out of the total.

**Example 4: Using defaults (page=1, pageSize=20)**

```bash
GET /contact/list
```

Returns the first 20 contacts.

#### Error Cases

**400 Bad Request - Invalid page parameter**

When `page` is not a positive integer:

```json
{
  "success": false,
  "data": null,
  "message": "page must be a positive number",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

**400 Bad Request - Invalid pageSize parameter**

When `pageSize` is not a valid positive integer:

```json
{
  "success": false,
  "data": null,
  "message": "pageSize must be a positive number",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

**400 Bad Request - Unknown query parameters**

When unknown query parameters are provided that are not `page` or `pageSize`:

```json
{
  "success": false,
  "data": null,
  "message": "\"foo\" is not allowed",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

**500 Internal Server Error**

When the server encounters an error retrieving contacts:

```json
{
  "success": false,
  "data": null,
  "message": "Failed to retrieve contacts",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

#### Pagination Logic

- **Skip calculation**: `skip = (page - 1) * pageSize`
- **Page 1** with pageSize=20: skip=0, returns records 1-20
- **Page 2** with pageSize=20: skip=20, returns records 21-40
- **Page 3** with pageSize=20: skip=40, returns records 41-60

#### Notes

- The `total` field in the response represents the **total number of contacts** in the database, not the count of records on the current page.
- When requesting a page beyond the available data (e.g., page 10 when only 50 contacts exist), the endpoint returns 200 OK with an empty `data` array and the correct `total`.
- The `pageSize` parameter is clamped to a maximum of 100 in the service layer. Requesting pageSize=150 will silently retrieve only 100 records (not an error).

---

### GET /contact/:id

Retrieve a single contact by ID.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | The contact's ID |

#### Response

Returns 200 OK with the contact object:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "message": "Success",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

#### Error Cases

**404 Not Found**

When the contact does not exist:

```json
{
  "success": false,
  "data": null,
  "message": "Contact not found",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

---

### POST /contact

Create a new contact.

#### Request Body

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string"
}
```

#### Response

Returns 201 Created with the created contact:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "message": "Success",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

---

### PUT /contact/:id

Update an existing contact.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | The contact's ID |

#### Request Body

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string"
}
```

#### Response

Returns 200 OK with the updated contact:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "message": "Success",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

---

### DELETE /contact/:id

Delete a contact.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | The contact's ID |

#### Response

Returns 200 OK with the deleted contact:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "message": "Success",
  "timestamp": "2026-08-25T10:30:00.000Z"
}
```

---

## Pagination Guidelines

When building a client that consumes the `/contact/list` endpoint:

1. **Initial load**: Request page=1 (or omit it, as it's the default)
2. **Calculate total pages**: `totalPages = Math.ceil(total / pageSize)`
3. **Navigation**: Increment or decrement the `page` parameter and re-request
4. **Preservation**: Store the current page in the URL query string or local state to preserve pagination state across page refreshes
5. **Validation**: Validate page is >= 1 before requesting; clamp to available pages
6. **Error handling**: If a 400 error is received, reset to page=1

## Rate Limiting

Requests may be subject to rate limiting. Check response headers for rate limit information.

## CORS

The API is configured to serve cross-origin requests from the frontend.
