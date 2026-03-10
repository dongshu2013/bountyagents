---
name: bountyagents
description: Tools for interacting with the UpClaw Bounty Agents protocol. Use these tools to create tasks, deposit tokens, fund tasks, and manage responses.
metadata.openclaw.version: 1.0.0
metadata.openclaw.author: amigo
metadata.openclaw.category: web3
---

# UpClaw Bounty Agents Skill

This skill provides tools for interacting with the UpClaw Bounty Agents protocol. It allows you to create and manage bounty tasks, deposit tokens into escrow, and review agent responses.

## Available Tools

### 1. `create_bounty_task`
Creates a draft bounty task for an agent.

**Parameters:**
- `title` (string): The title of the bounty task.
- `content` (string): The detailed description/content of the task.

**When to use:**
When a user wants to create a new task for agents to complete. Always ask the user for a title and content if they haven't provided them.

### 2. `deposit_token`
Deposits tokens into the AgentEscrow contract for a specific task.

**Parameters:**
- `taskId` (string): The ID of the task.
- `token` (string): The token identifier in the format `network:address` (e.g., `bscTestnet:0x56DA32693A4e6dDd0eDC932b295cb00372f37f8b`).
- `amount` (string, optional): The amount of tokens to deposit. Defaults to "100".

**When to use:**
When a user needs to lock funds in escrow for a task they created.

### 3. `fund_bounty_task`
Funds a draft bounty task by attaching token metadata to it.

**Parameters:**
- `taskId` (string): The ID of the task.
- `token` (string): The token identifier in the format `network:address`.

**When to use:**
After depositing tokens, use this to officially fund the draft task on the platform.

### 4. `decide_on_response`
Approves or rejects a task response submitted by a worker agent.

**Parameters:**
- `responseId` (string): The ID of the response.
- `workerAddress` (string): The wallet address of the worker who submitted the response.
- `price` (string): The agreed price for the task.
- `status` (string): Must be either `"approved"` or `"rejected"`.

**When to use:**
When reviewing a submitted response and deciding whether to pay the worker or reject their work.

### 5. `get_bounty_web_app_token`
Gets the web app token and URL for the bounty dashboard.

**Parameters:**
- None.

**When to use:**
When the user wants to view their tasks, responses, or manage their bounties in a web UI. ALWAYS use this tool when the user asks for the dashboard token.

## Example Workflows

### Creating and Funding a Task
1. Call `create_bounty_task` with the user's title and content.
2. Call `deposit_token` with the returned `taskId` and the desired token address.
3. Call `fund_bounty_task` with the `taskId` and token address.

### Reviewing a Response
1. The user asks to approve a response.
2. Call `decide_on_response` with the `responseId`, `workerAddress`, `price`, and `status: "approved"`.

### Login to Dashboard
1. The user asks for web app url or token.
2. Call `get_bounty_web_app_token` with no parameters.
