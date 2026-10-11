# Errors

Every error that leaves the API has the same shape, whatever caused it:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "requestId": "5c397446-0c18-4cfe-99be-d08c78419bec",
    "details": { "price": "Must be a number", "role": "Unknown field" }
  }
}
```

| Key | Always | Meaning |
|---|---|---|
| `code` | yes | Stable, machine readable. Switch on this in clients. |
| `message` | yes | Human readable and safe to show |
| `requestId` | yes | Same as the `X-Request-Id` response header. Search logs and devtools by it. |
| `details` | sometimes | One message per field or query parameter |

## Codes

| Status | Code | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Invalid list query, or `badRequest()` from your code |
| 400 | `INVALID_JSON` | The body is not valid JSON |
| 400 | `INVALID_TOKEN` | Password reset token unknown, expired or used |
| 401 | `UNAUTHORIZED` | No valid session where one is needed, or wrong login |
| 403 | `FORBIDDEN` | Signed in but not allowed |
| 404 | `NOT_FOUND` | Unknown route, malformed id, missing record, or a record the user may not see |
| 409 | `CONFLICT` | Duplicate value on a `.unique()` field |
| 413 | `PAYLOAD_TOO_LARGE` | Body larger than `bodyLimit` (1 MB) |
| 422 | `VALIDATION_ERROR` | Body failed validation; see `details` |
| 429 | `RATE_LIMITED` | Too many requests; see `Retry-After` |
| 500 | `INTERNAL_ERROR` | Anything unexpected |

## Throwing errors

Import the helpers from `#calm` and throw. Express 5 forwards errors from async handlers, so there is no `try/catch` or `next(err)`:

```js
import { badRequest, unauthorized, forbidden, notFound, conflict, validationError, tooManyRequests, CalmError } from '#calm';

throw badRequest('items must be an array');                          // 400 BAD_REQUEST
throw badRequest('Invalid date range', { to: 'Must be after from' }); // with details
throw unauthorized();                                                 // 401 "Authentication required"
throw forbidden('Only the organizer can cancel this event');          // 403
throw notFound('Invoice not found');                                  // 404
throw conflict('This product has orders', { product: 'In use' });     // 409
throw validationError({ email: 'Already invited' });                  // 422 "Validation failed"
throw tooManyRequests();                                              // 429
throw new CalmError(402, 'PAYMENT_REQUIRED', 'Upgrade your plan to add more projects');
```

| Helper | Signature | Default message |
|---|---|---|
| `badRequest` | `(message?, details?)` | `Bad request` |
| `unauthorized` | `(message?)` | `Authentication required` |
| `forbidden` | `(message?)` | `You do not have permission to do this` |
| `notFound` | `(message?)` | `Resource not found` |
| `conflict` | `(message?, details?)` | `Resource already exists` |
| `validationError` | `(details, message?)` | `Validation failed` |
| `tooManyRequests` | `(message?)` | `Too many requests, slow down` |
| `new CalmError` | `(status, code, message, details?)` | |

Messages of `CalmError`s are sent to clients as they are, so write them for your users.

## What other errors become

Errors that are not `CalmError`s are translated in `calm/errors.js`:

| Thrown | Response |
|---|---|
| Malformed JSON body | `400 INVALID_JSON` |
| Body over `bodyLimit` | `413 PAYLOAD_TOO_LARGE` |
| Other `400` errors from Express middleware | `400 BAD_REQUEST` with their message |
| Mongoose `CastError` on `_id` | `404 NOT_FOUND` |
| Mongoose `CastError` on another path | `422 VALIDATION_ERROR` with `{ <path>: "Invalid value for <path>" }` |
| Mongoose `ValidationError` | `422 VALIDATION_ERROR` with one message per path |
| MongoDB duplicate key (`E11000`) | `409 CONFLICT`, `"email already exists"`, details `{ email: "Already taken" }` |
| Anything else | `500 INTERNAL_ERROR`, `"Something went wrong"` |

## Nothing internal leaks

For a `500`, the client only ever gets `Something went wrong`. The real message and stack trace go to the log (with the request id) and to devtools:

```js
r.get('/boom', { policy: 'public' }, () => {
  throw new Error('db password is hunter2');
});
```

```json
{ "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong", "requestId": "0b7e6f3c-5f8e-4d7b-9a43-2c1f8d7e6a10" } }
```

In **development** mode only, `500` responses also include the original error, which saves a trip to the terminal:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong",
    "requestId": "0b7e6f3c-5f8e-4d7b-9a43-2c1f8d7e6a10",
    "debug": { "message": "db password is hunter2", "stack": "Error: db password is hunter2\n    at ..." }
  }
}
```

The devtools **Requests** panel shows the same error with a clickable stack trace.

## Request ids

Every response has an `X-Request-Id` header. A client can send its own (letters, digits, `.`, `_`, `-`, up to 128 characters) to correlate logs across services; otherwise a UUID is generated. Every log line written during the request carries it, including your own `ctx.log.info(...)` calls.

## Handling errors in clients

```js
const res = await fetch('/api/posts', { method: 'POST', headers, body: JSON.stringify(post) });
if (!res.ok) {
  const { error } = await res.json();
  if (error.code === 'VALIDATION_ERROR') showFieldErrors(error.details);
  else if (error.code === 'UNAUTHORIZED') redirectToLogin();
  else toast(`${error.message} (ref ${error.requestId})`);
}
```

`204` responses have no body; do not call `res.json()` on them.
