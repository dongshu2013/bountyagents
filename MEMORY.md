# Codex Memory – bountyagents

## Purpose & Current State
- Monorepo implementing a trust-minimized bounty marketplace where each listing is backed by an escrow deposit on Base; actors are Ethereum addresses.
- Goal: expose Fastify REST + MCP APIs plus an OpenClaw plugin so agents can post tasks, submit encrypted responses, and approve payouts while keeping on-chain escrow canonical.

## Codebase Map
- `task/`: Fastify service (`task/src/app.ts`) + service layer (`task/src/services/tasks.ts`) validating signatures, hydrating escrow info through `viem`, persisting via `TaskDb`, and exposing MCP tools (`task/src/mcp.ts`).
- `plugin/`: OpenClaw-compatible client (`plugin/src/index.ts`) with pluggable `Signer`s, canonical payload builders, and fetch-based REST invocations for create/respond/decision flows.
- `packages/task-db/`: Shared Drizzle ORM schema + repository powering migrations, CRUD, pagination, text search, and Zod schemas reused elsewhere.
- `contracts/`: Foundry project defining `AgentEscrow` (fee-charging ERC20 escrow with admin-authorized withdraw + owner-signed settle paths).

## Core Flows
1. **Task creation**
   - Owner signs canonical payload (`taskSignaturePayload`); service re-fetches escrow via `keccak256(taskId)` key, enforces owner/token/amount parity, and stores task as `active`.
2. **Response submission**
   - Worker signs encrypted payload; service blocks non-`active` tasks and inserts pending `responses` rows keyed by worker/task.
3. **Decision & settlement**
   - Owner signs approval/rejection (`decisionSignaturePayload`); server enforces owner/worker/price checks, requires `encryptedSettlement` when approving, and updates response status + settlement blob.
4. **Queries / MCP**
   - REST + MCP routes hydrate deposit metadata per task (`fetchDepositInfo`) and provide signature-gated owner/worker pagination endpoints.

## Smart Contract Highlights (`contracts/src/AgentEscrow.sol`)
- Deposits keyed by bytes32 hash store { owner, token, amountLocked, released }.
- `deposit` collects ERC20, streams configurable fee (<=10% default, <=20% via `setServiceFeeBps`), and records locked amount.
- `withdraw` requires admin signature + owner caller; `settle` requires owner signature so anyone can release to worker; both emit `DepositReleased`.

## Shared Data Layer (`packages/task-db/src/index.ts`)
- Postgres via Drizzle; boot migration seeds `tasks`/`responses` tables plus GIN search index.
- `TaskDb` offers `createTask`, flexible queries with publisher/price/keyword filters, and paginated list helpers for owner + worker views.
- Re-exported Zod schemas align type validation between service and plugin packages.

## Plugin Behavior (`plugin/src/index.ts`)
- Constructed with a `Signer` (e.g., `PrivateKeySigner`); normalizes service URL, registers three `PluginTool`s, and mirrors canonical signing logic to avoid mismatches.
- Provides `getTools()`/`executeTool()` for OpenClaw integration; throws surfaced REST error messages for better agent UX.

## Environment & Ops
- Copy `.env.example` → `.env`; supply `DATABASE_URL`, `CONTRACT_ADDRESS`, `CHAIN_RPC_URL`, `CHAIN_ID`, `DEPOSIT_NETWORK`, etc.
- Useful commands:
  - `pnpm install` (root) to bootstrap.
  - `pnpm --filter @bountyagents/task-service dev` to run Fastify + MCP locally (ts-node).
  - `pnpm --filter @bountyagents/openclaw-plugin build` to emit plugin artifacts.
  - `cd contracts && forge install && forge test` before running `DeployEscrow.s.sol` with `PRIVATE_KEY`, `ADMIN_SIGNER`, `FEE_RECIPIENT`, `SERVICE_FEE_BPS`.

## Open Questions / Follow-ups
- Automated tests are placeholders across packages; need suites for service, plugin, and contract interactions.
- SERVICE_SPEC lists desired improvements: rate limiting, pagination polish, JSON Schema export for MCP, signature edge-case coverage, and on-chain verification enhancements.
- Document encryption/settlement payload expectations + sample workflows so plugin + service implementers stay aligned.
