# Credit Score Synchronization

## Data Flow

- Admin sets config via `POST /api/admin/credit-score/config` with `{ decimals, rounding }`.
- Admin can set per-user scores via `POST /api/admin/credit-score/set`.
- Trader dashboard fetches `GET /api/credit-score` and subscribes to `GET /api/credit-score/stream?token=...`.

## Client Handling

- Initial GET loads `{ score, lastUpdated, config }`.
- SSE stream emits `{ type: 'update'|'snapshot', data: { score, lastUpdated }, config?: { decimals, rounding } }`.
- Display formats with `decimals` and `rounding` exactly; statuses: `ok`, `updating`, `error`.

## Validation

- Client compares stream events, updates `syncStatus` and refreshes UI. Timestamp shows last update.
- Tests verify admin config persistence and endpoint consistency in `tests/api.spec.ts`.

## Error Handling

- On SSE error, exponential backoff reconnect and `syncStatus='error'` until reconnected.

