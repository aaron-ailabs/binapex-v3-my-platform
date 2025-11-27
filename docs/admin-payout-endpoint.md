# Admin: Set User Payout Percentage

Endpoint: `POST /api/admin/users/payout`

Auth:
- Requires `Authorization: Bearer <token>`
- User role must be `Admin`

Rate Limiting:
- Key: `admin-users-payout`
- Limit: 10 requests per 60s per admin

Request Body:
```
{ "userId": "<string>", "payoutPct": <int 0-100>, "reason": "<optional string>" }
```

Validation:
- `userId`: required string, 3–64 chars
- `payoutPct`: integer, 0–100 inclusive
- `reason`: optional, 3–300 chars

Response:
```
{ "ok": true, "userId": "...", "payoutPct": 72 }
```

Behavior:
- Updates the user’s `payout_pct` in DB
- Inserts audit record into `payout_audits` with admin, user, old/new values, reason, timestamp
- Returns the applied `payoutPct`

Errors:
- 400 `Invalid user payout data`
- 401 `Unauthorized`
- 403 `Forbidden`
- 404 `User not found`

Notes:
- Trades use `payoutPct` captured at placement time and persist it on the trade record
- Existing trades without `payoutPct` use fallback 85 during settlement
