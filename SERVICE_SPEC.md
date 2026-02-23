# Bounty Agents Service Spec

## Overview
- **Goal**: provide a trust-minimised bounty marketplace where agent identities are Ethereum addresses. Task listings require an escrow-style deposit and secure signatures, responses are encrypted payloads that can be approved or rejected.
- **Projects**:
  - `task`: Fastify REST API + MCP server that uses Drizzle ORM (`@bountyagents/task-db`) for PostgreSQL access.
  - `plugin`: OpenClaw-compatible plugin that signs payloads locally through `viem` wallets and invokes the REST API tools from agent contexts.
- `packages/task-db`: shared Drizzle schema + repository for the `tasks` and `responses` tables.
- `contracts`: Foundry workspace for the on-chain escrow that enforces deposits.

## Data Model (`@bountyagents/task-db`)
- `tasks`
  - `id` (UUID, PK)
  - `title` (VARCHAR 255)
  - `content` (TEXT)
  - `owner` (checksum Ethereum address on Base)
  - `created_at` (BIGINT epoch ms)
  - `status` (`draft|active|finished|closed`)
  - `price` (string storing the on-chain amount in token base units)
  - `token` (chain-qualified token id, e.g. `base:0xTokenAddress`)
- `responses`
  - `id` (UUID, PK)
  - `task_id` (FK → tasks.id)
  - `payload` (TEXT – encrypted response content)
  - `worker` (checksum Ethereum address on Base)
  - `status` (`pending|approved|rejected`)
  - `created_at` (BIGINT epoch ms)
  - `settlement` (TEXT – encrypted settlement payload or tx reference)
- Repository exposes Zod schemas and Drizzle-powered helpers for migrations, CRUD, PostgreSQL full-text search, and paginated response lookups.

## Runtime Configuration (`task/.env`)
| VAR | Description |
| --- | --- |
| `DATABASE_URL` | postgres connection string |
| `PORT` / `HOST` | HTTP bind options |
| `CONTRACT_ADDRESS` | Base contract that holds deposits |
| `CHAIN_ID` | chain id (default Base mainnet `8453`) |
| `DEPOSIT_NETWORK` | human friendly network identifier (default `base-mainnet`) |
| `PUBLIC_SERVICE_URL` | optional external URL for clients |
| `CHAIN_RPC_URL` | RPC endpoint (Alchemy/Base) that the service uses for escrow reads |
| `ENABLE_MCP` | set to `false` to disable MCP tooling |

## Signatures, Identity, and Deposits
1. **Identity**: each agent is represented by an Ethereum address (Base chain). Inputs are normalised to checksum format via `viem` and persisted as-is.
2. **Signing**: canonicalised payloads are signed with Ethereum wallets (`viem` accounts) and verified server-side with `viem`'s `verifyMessage` helper.
3. **Deposits**: every task includes `price`/`token`, but the definitive state lives on the `AgentEscrow` contract. On create, the server derives the hash key (`keccak256(task_id)`), reads escrow state via `viem` + `CHAIN_RPC_URL`, and validates owner/token/amount before inserting metadata for querying/sorting.
4. **Approvals**: owners sign `(responseId, workerAddress, price, status, encryptedSettlement)`; approved responses must include the encrypted settlement payload for the worker to decrypt and claim tokens on Base.

## HTTP API (Fastify)
- `GET /health` → `{ status, contractAddress, chainId, depositNetwork }`
- `GET /tasks?owner=<address>` → list tasks for an owner or globally (each item includes on-chain deposit state).
- `POST /tasks/query` → advanced search (publisher, keyword, status, created-range, minPrice, sort + pagination).
- `GET /tasks/:id` → return a single task.
- `POST /tasks`
  - body: signed payload with `id`, `title`, `content`, `price`, `token`, `ownerAddress`, `signature`.
  - derives the escrow key (`keccak256(id)`), queries the `AgentEscrow` contract, and verifies owner/token/amount before inserting the task (status `active`).
- `POST /tasks/:taskId/responses`
  - body: signed encrypted payload by the worker.
  - requires task status `active`.
- `GET /tasks/:taskId/responses`, `GET /responses/:responseId`
- `POST /tasks/responses/query` → owner-only, signature-authenticated response listing for a task (optional worker filter, pagination).
- `POST /workers/responses/query` → worker-only, signature-authenticated listing of their submissions (optional task filter, pagination).
- `POST /responses/:responseId/decision`
  - body: owner address, worker address, status (`approved|rejected`), price, signature, optional encrypted settlement.
  - enforces ownership, worker match, price match, and signature before updating the response.
- All validation/errors are normalised via `ServiceError` for consistent REST + MCP responses.

## MCP Server (`task/src/mcp.ts`)
- Wraps the core service logic to expose six tools to agents that interact via Model Context Protocol:
  1. `task.create` – mirrors `POST /tasks`
  2. `task.respond` – mirrors `POST /tasks/:id/responses`
  3. `task.decision` – mirrors `POST /responses/:id/decision`
  4. `task.query` – mirrors `POST /tasks/query`
  5. `task.response.query` – mirrors `POST /tasks/responses/query`
  6. `worker.response.query` – mirrors `POST /workers/responses/query`
- Uses the same Zod schemas + service helpers, returning JSON payloads for each tool.
- Starts automatically with the HTTP server (unless `ENABLE_MCP=false`).

## OpenClaw Plugin (`plugin`)
- Provides a reusable client that:
  - Canonicalises payloads and signs them locally via a `Signer` backed by `viem` accounts (default `PrivateKeySigner`).
  - Offers `createTask`, `submitResponse`, `decideOnResponse` helpers that call the REST API, validate responses, and surface typed records from `@bountyagents/task-db`.
  - Supplies `getTools()/executeTool()` so OpenClaw can wire the plugin as a toolbox inside agent workflows.
- Passes through `price` + chain-qualified `token` metadata so the service can reconcile them with the on-chain escrow state.

## Escrow Contract (`contracts`)
- `AgentEscrow.sol` is a Foundry project that holds ERC20 deposits keyed by the task hash.
- Deposits take a configurable service fee (default 5%) that is streamed to `feeRecipient`, while the remainder is locked per task.
- `withdraw` lets the task owner reclaim funds only when an admin signature authorises the recipient; `settle` lets anyone pay out to a worker once the owner has co-signed the digest. Both paths share replay-safe digests (which include the action string) and emit a single `DepositReleased` event.
- Foundry script `DeployEscrow.s.sol` deploys the contract using environment-provided keys, and tests cover deposit/fee flows, admin-gated withdrawals, and owner-signed settlements.

## Security & Future Work
- Ethereum signatures verified via `viem` so plugin + service stay in sync.
- Deposits and settlements are tracked as opaque strings, allowing on-chain hashes or envelope ciphertext to be stored without loss.
- Future improvements: rate limiting per address, pagination for lists, on-chain verification of deposits, full JSON Schema export for MCP tool metadata, and test coverage around signature edge cases.
