# Task Service Test Specification

This specification drives the Vitest coverage for the task service. Every workflow scenario enumerates the request payload, required mocks, and expected output/data mutations. **All** Postgres (`TaskDb`) calls and on-chain helpers (`fetchDepositInfo`, `signWithdrawAuthorization`) MUST be mocked within the test suite so each case runs deterministically.

## Shared Data Models

- **TaskRecord**
  - Fields: `id`, `title`, `content`, `owner`, `created_at`, `status` (`draft|active|finished|closed`), `price`, `token|null`, `withdraw_signature|null`.
  - Defaults after creation: `status='draft'`, `price='0'`, `token=null`, `withdraw_signature=null`.
- **ResponseRecord**
  - Fields: `id`, `task_id`, `payload`, `worker`, `status` (`pending|approved|rejected`), `created_at`, `settlement|null`, `settlement_signature|null`.
  - Defaults after submission: `status='pending'`, settlement fields `null`.

Unless stated otherwise, assume signatures are detached and must be verified through `verifyDetachedSignature`.

---

## 1. Create Task

**Request shape:** `{ id, title, content, ownerAddress, signature }`

| Case              | Input detail                                                   | Mocks                                                                      | Expected result                                                                          |
| ----------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Valid signature   | Payload with matching `ownerAddress` and signature             | `verifyDetachedSignature` → `true`; `db.createTask` returns `TaskRecord`   | Task returned with the default values listed above.                                      |
| Invalid signature | Same payload                                                   | `verifyDetachedSignature` → `false`                                        | Throws `ServiceError(401, 'unauthorized')`; `db.createTask` must not be called.           |

---

## 2. Fund Task

**Request shape:** `{ taskId, ownerAddress, price, token, signature }`  
**Contract read:** `fetchDepositInfo(taskId)` → `{ owner, token, amountLocked, released }`

| Case                   | Input detail                                                                                       | Mocks                                                                                                                                                          | Expected result                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Happy path             | Draft task owned by caller, payload carries price/token                                            | `verifyDetachedSignature` → `true`; `db.getTaskById` → draft task; `fetchDepositInfo` owner/token/amount match; `db.markTaskFunded` returns updated record      | Task marked `active` with stored `price/token`; response mirrors DB return.                      |
| Owner mismatch         | Task exists but `owner !== ownerAddress`                                                           | `verifyDetachedSignature` → `true`; `db.getTaskById` owner differs                                                                                            | Throws `ServiceError(403, 'forbidden')`.                                                         |
| Deposit mismatch       | On-chain `owner` or `amountLocked` differs from payload                                            | `fetchDepositInfo` returns mismatched owner or amount                                                                   | Throws `ServiceError(400, 'invalid_request')`; `db.markTaskFunded` must not run.                 |
| Invalid signature      | Signature check fails                                                                              | `verifyDetachedSignature` → `false`                                                                                      | Throws `ServiceError(401, 'unauthorized')`; no DB/on-chain calls occur after verification fails. |

---

## 3. Submit Response

**Request shape:** `{ taskId, payload, workerAddress, signature }`

| Case                     | Input detail                                                           | Mocks                                                                            | Expected result                                                       |
| ------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Active task              | Task status `active`, signature valid                                  | `verifyDetachedSignature` → `true`; `db.getTaskById` → active; `db.createResponse` returns `ResponseRecord` | Response inserted with `status='pending'` and settlement fields `null`. |
| Inactive task            | Task status `draft|finished|closed`                                    | `db.getTaskById` returns status ≠ `active`                                       | Throws `ServiceError(409, 'conflict')`.                               |
| Invalid worker signature | Signature fails                                                        | `verifyDetachedSignature` → `false`                                             | Throws `ServiceError(401, 'unauthorized')`; DB not called.            |

---

## 4. Decision (Accept / Reject)

**Request shape:** `{ responseId, workerAddress, ownerAddress, price, status, settlementSignature?, signature }`

| Case                  | Input detail                                                                                                   | Mocks                                                                                             | Expected result                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Approve response      | Response `pending`, worker/owner match, includes settlement signature                                          | `verifyDetachedSignature` → `true`; `db.getResponseById`; `db.getTaskById`; `db.updateResponseStatus`; `db.updateTaskStatus` | Response marked `approved`, settlement signature stored, task moved to `finished`.                        |
| Reject response       | Same response but `status='rejected'`, no settlement payload                                                   | Same mocks; `db.updateTaskStatus` not invoked                                                     | Response marked `rejected`, settlement fields remain `null`, task status unchanged.                       |
| Missing settlement signature | Approve request without `settlementSignature`                                                           | —                                                                                                 | Throws `ServiceError(400, 'invalid_request')`.                                                            |
| Signature mismatch    | Decision signature invalid                                                                                     | `verifyDetachedSignature` → `false`                                                               | Throws `ServiceError(401, 'unauthorized')`.                                                               |

---

## 5. Cancel Task

**Request shape:** `{ taskId, ownerAddress, signature }`

| Case                        | Input detail                                                   | Mocks                                                                                                                      | Expected result                                                                 |
| --------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Generate withdraw signature | Active funded task owned by caller                             | `verifyDetachedSignature` → `true`; `db.getTaskById` → active task; `db.updateTaskStatus` → closed; `signWithdrawAuthorization` returns sig; `db.storeWithdrawSignature` persists | Returns task with `status='closed'` and `withdraw_signature` populated.          |
| Already settled             | Task already `finished` or `closed`                            | `db.getTaskById` returns finished                                                    | Throws `ServiceError(409, 'conflict')`.                                          |
| Invalid signature           | Signature fails                                                | `verifyDetachedSignature` → `false`                                                  | Throws `ServiceError(401, 'unauthorized')`.                                      |

---

## 6. Query APIs

Helpers:
- `queryTasksList({ filter, sortBy, pageNum, pageSize })`
- `queryTaskResponses({ taskId, ownerAddress, signature, pageNum, pageSize })`
- `queryWorkerResponses({ workerAddress, signature, taskId?, pageNum, pageSize })`

| Case                               | Input detail                                                                                       | Mocks                                                                               | Expected result                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Task query forwards filters        | Filter containing publisher/status/keyword/minPrice + pagination                                   | `db.queryTasks` resolves list                                                       | Returns DB list and ensures call receives the provided filters + pagination.    |
| Owner response query success       | Owner provides valid signature + pagination                                                        | `verifyDetachedSignature` → `true`; `db.listResponsesForTaskPaginated` returns list | Returns responses list.                                                         |
| Owner response query unauthorized  | Owner signature invalid                                                                            | `verifyDetachedSignature` → `false`                                                 | Throws `ServiceError(401, 'unauthorized')`; DB call not executed.               |
| Worker response query success      | Worker valid signature + optional `task_id` filter                                                 | `verifyDetachedSignature` → `true`; `db.listResponsesByWorker` returns list         | Returns worker responses.                                                       |
| Worker response query unauthorized | Worker signature invalid                                                                           | `verifyDetachedSignature` → `false`                                                 | Throws `ServiceError(401, 'unauthorized')`.                                     |

Each table row corresponds to an individual Vitest test. Adding or modifying workflows requires updating this specification first, then adjusting the tests to match.
