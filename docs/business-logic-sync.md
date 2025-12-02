# Business Logic Synchronization

## Overview

- Frontend API client now sends `Accept: application/json` and no longer uses cookies. Use `apiRequest(method, url, data, headers)` with `Authorization: Bearer <token>` when required.
- Backend responses remain unchanged for compatibility; error middleware consistently returns JSON `{ message }` with proper status codes.

## Frontend Changes

- `client/src/lib/queryClient.ts`: standardized headers and removed `credentials: include`. Query functions now request JSON explicitly.
- Profile form continues to submit only allowed fields: `{ name, phone, preferences }` to match backend `zod` schema.

## Backend Validation

- Existing `zod` schemas enforce request shapes (e.g., profile/avatars, trades, admin overrides). Unauthorized access requires `Authorization` header or `token` query for SSE.

## Tests

- `tests/api.spec.ts` extended to cover:
  - Unauthorized profile access returns `401`.
  - Profile update validates phone length and returns `400` on failure.
  - Avatar upload validates `dataUrl` and returns `400` on failure.
  - Notifications SSE requires token; missing token returns `401`.

## Backward Compatibility

- Endpoints maintain response shapes. Clients using cookies continue to work only if server-side auth is explicitly supported; recommended path is `Authorization: Bearer`.

