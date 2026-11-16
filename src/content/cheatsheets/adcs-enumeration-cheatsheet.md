---
title: "AD CS Enumeration and Certificate Authentication"
description: "Identify certification authorities, published templates, enrollment rights, certificate usages and the prerequisites for ESC1\u2013ESC4, ESC8 and Golden Certificates."
category: "AD CS"
tools: ["Cobalt Strike", "Certify"]
updated: "2026-11-16"
tags: ["adcs", "enumeration"]
draft: false
---

## 1. How the components fit together

AD CS issues X.509 certificates that bind public keys to identities. A template controls what can be requested; the issuing CA controls whether it is issued; the authenticating service or KDC decides whether to trust and map it to an account.

| Item | What to inspect |
|---|---|
| CA FullName | Host and CA name used for requests |
| Published templates | Whether the intended CA actually issues the template |
| Enroll permissions | Whether the current principal can request it |
| Subject and SAN | Whether identity comes from AD or the requester |
| EKU / application policies | Authentication, Any Purpose or enrollment-agent capability |
| Issuance requirements | Manager approval and authorized signatures |
| Template ACL | Effective rights to change properties, owner or DACL |
| Web enrollment | Authentication methods, TLS and Extended Protection |
| Authentication mapping | Whether the KDC can securely associate the certificate with the account |

## 2. Find CAs and templates

```shell
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe enum-cas --quiet
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe enum-templates --filter-enabled --filter-vulnerable --hide-admins --quiet
```

The command syntax follows the Certify version in the notes. Record the actual CA FullName, template name, effective permissions and endpoint. Re-run without `--hide-admins` when inspecting administrative ACLs; the filtered view is not a complete security review.

```shell
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe enum-templates --template <TEMPLATE_NAME> --quiet
```

## 3. Select the path

| Finding | Next reference |
|---|---|
| Authentication-capable template plus requester-controlled identity | [ESC1](/cheatsheets/adcs-esc1-cheatsheet/) |
| Any Purpose or absent EKU restrictions | [ESC2](/cheatsheets/adcs-esc2-cheatsheet/) |
| Enrollment-agent certificate and an accepting target template | [ESC3](/cheatsheets/adcs-esc3-cheatsheet/) |
| Effective template modification rights | [ESC4](/cheatsheets/adcs-esc4-cheatsheet/) |
| Relayable NTLM web enrollment | [ESC8](/cheatsheets/adcs-esc8-cheatsheet/) |
| Access to a usable CA signing private key | [Golden Certificates](/cheatsheets/adcs-golden-certificates-cheatsheet/) |

An ESC label is a candidate configuration, not confirmation of impersonation. CA issuance, account mapping and service authorization are separate checks.

## 4. Useful EKUs

| Usage | OID |
|---|---|
| Client Authentication | `1.3.6.1.5.5.7.3.2` |
| Certificate Request Agent | `1.3.6.1.4.1.311.20.2.1` |
| Any Purpose | `2.5.29.37.0` |
| Server Authentication | `1.3.6.1.5.5.7.3.1` |

A certificate's public key is not its private key. A certificate-only export is insufficient for the PFX authentication examples.

## 5. Certificate mapping matters

Current Windows DC enforcement requires strong certificate-to-account mapping. A chosen UPN alone is not proof that a certificate issued to one account will authenticate as another. Inspect the certificate SID extension and configured mappings when the lab's UPN-only examples fail; do not assume that changing the UPN changes a CA-generated SID binding. See [Microsoft KB5014754](https://support.microsoft.com/en-us/topic/kb5014754-certificate-based-authentication-changes-on-windows-domain-controllers-ad2c23b0-15d8-4340-a468-4d4f3b188f16).

## Quick checklist

```text
[ ] Enumerate CAs and record FullName, trust and enrollment endpoints.
[ ] Enumerate published templates and effective enrollment permissions.
[ ] Check identity controls, EKUs, approval and authorized signatures.
[ ] Inspect template ACLs separately from CA permissions.
[ ] Select an attack path only after validating all prerequisites.
[ ] Verify issuance and KDC acceptance as distinct outcomes.
```

## Related references

- [AD CS enumeration](/cheatsheets/adcs-enumeration-cheatsheet/)
- [Certify](https://github.com/GhostPack/Certify)
- [Rubeus](https://github.com/GhostPack/Rubeus)
