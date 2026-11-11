---
title: "Inter-Realm Tickets and AD Trusts"
description: "Understand trust direction, transitivity, TDO attributes and Kerberos referrals, then follow a local TGT through to a remote service ticket."
category: "Forest & Domain Trusts"
tools: ["Cobalt Strike", "Rubeus", "Kerbeus BOF", "PowerShell"]
updated: "2026-11-11"
tags: ["ad", "trusts", "forest", "kerberos"]
draft: false
---

## 1. Trusts connect identities to resources

An Active Directory trust allows one domain to accept authentication from another. Resource permissions still determine access. If **A trusts B**, A is the **trusting** resource domain and B is the **trusted** identity domain.

```text
Trust:       A (resources) ───→ B (identities)
Access:      A (resources) ←─── users from B, if authorized
Perspective: outbound from A; inbound from B
```

A bidirectional trust consists of two opposing one-way relationships. Always record the domain from which a direction was observed.

| Trust type | Connects | Direction | Transitivity | Creation |
|---|---|---|---|---|
| Parent-child | Parent and child domains | Bidirectional | Transitive | Automatic when adding a child domain |
| Tree-root | Tree roots within one forest | Bidirectional | Transitive | Automatic when adding a tree |
| External | Domains in separate forests | One-way or bidirectional | Nontransitive | Manual |
| Forest | Separate forests | One-way or bidirectional | Transitive within the two forests | Manual |

Transitivity extends the authentication path within the trust's scope. A forest trust does not automatically create a path to a third forest. Domains in one forest are not independent security boundaries against a malicious domain administrator; the forest is the relevant boundary.

## 2. Enumerate Trusted Domain Objects

TDOs describe the partner domain, direction and trust attributes. Associated trust secrets support inter-realm authentication. Ordinary LDAP enumeration of a TDO does not reveal those secrets.

Run the following in Beacon with the LDAP extension loaded:

```shell
# Read trust metadata relative to the domain being queried
ldapsearch (objectClass=trustedDomain) --attributes cn,trustPartner,flatName,trustDirection,trustAttributes,objectGUID

# Identify interdomain trust accounts in the local domain
ldapsearch (samAccountType=805306370) --attributes samAccountName,distinguishedName
# Example in CONTOSO: PARTNER$
```

| Attribute | Meaning |
|---|---|
| `trustPartner` / `cn` | Partner DNS domain or TDO name |
| `flatName` | Partner NetBIOS name |
| `trustDirection` | Direction relative to the queried domain |
| `trustAttributes` | Bitmask of trust properties |
| `objectGUID` | TDO identifier; distinct from a domain or group SID |

| `trustDirection` | Meaning |
|---|---|
| `0` | Disabled |
| `1` | Inbound |
| `2` | Outbound |
| `3` | Bidirectional |

| Attribute bit | Flag | Interpretation |
|---|---|---|
| `1` | `NON_TRANSITIVE` | Nontransitive trust |
| `4` | `QUARANTINED_DOMAIN` | SID filtering/quarantine property |
| `8` | `FOREST_TRANSITIVE` | Transitive forest trust |
| `32` | `WITHIN_FOREST` | Domains in the same forest |
| `64` | `TREAT_AS_EXTERNAL` | External-style SID filtering treatment |

The attribute value can combine flags. For example, test whether bit `8` is present rather than assuming a forest trust must have a value of exactly `8`. SID filtering and authentication restrictions require their own checks.

## 3. Why a referral is needed

A normal TGT is protected with the issuing domain's `krbtgt` key. A remote KDC does not use that local key to read it. The local KDC instead issues an **inter-realm TGT**, also called a **referral**, protected with the relevant shared trust key.

| Ticket | Protected with | Presented to |
|---|---|---|
| Local TGT | Source domain's `krbtgt` key | Source KDC |
| Inter-realm TGT | Relevant shared trust key | Next realm's KDC |
| Service ticket | Target service account's key | Target service |

A referral such as `krbtgt/partner.com` is not a CIFS service ticket. The remote KDC still needs to issue the ticket for `cifs/par-jmp-1.partner.com`.

```text
CONTOSO client + local TGT
  → CONTOSO KDC: request a service in PARTNER
  ← referral for krbtgt/partner.com
  → PARTNER KDC: present referral and request the target SPN
  ← ticket for cifs/par-jmp-1.partner.com
  → remote SMB service: authenticate, then undergo authorization
```

Windows can manage referrals automatically when a valid identity accesses a service across a permitted trust path. The explicit workflow below exposes each stage for inspection.

## 4. Example: CONTOSO to PARTNER

PARTNER trusts CONTOSO. From CONTOSO this is inbound; CONTOSO users may access PARTNER resources if authorized. The example assumes an already available, valid `rsteel` TGT in `rsteel.kirbi` on the operator's machine.

The `krb_*` commands are extension commands from the exercise environment, rather than built-in Beacon commands. Load the matching BOF/alias package and check its installed argument support.

```shell
# Identify a PARTNER DC using the example DNS server
nslookup _ldap._tcp.dc._msdcs.partner.com 10.10.120.1 SRV
# Example: par-dc-1.partner.com

# Present the source TGT to request an inter-realm referral
krb_asktgs /service:krbtgt/partner.com /ticket:C:\Users\Attacker\Desktop\rsteel.kirbi
# Retain the complete returned value as <REFERRAL_BASE64>

# Present the referral to the remote KDC for the actual service
krb_asktgs /service:cifs/par-jmp-1.partner.com /targetdomain:partner.com /dc:par-dc-1.partner.com /ticket:<REFERRAL_BASE64>
# Retain the complete returned service ticket as <CIFS_BASE64>
```

Rubeus provides a corresponding service-ticket request when the referral is already available:

```shell
execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asktgs /service:cifs/par-jmp-1.partner.com /dc:par-dc-1.partner.com /ticket:<REFERRAL_BASE64> /nowrap
```

## 5. Import the service ticket and verify access

Convert the **service ticket**, rather than the intermediate referral, in local PowerShell:

```powershell
[IO.File]::WriteAllBytes('C:\Users\Attacker\Desktop\rsteel-cifs.kirbi', [Convert]::FromBase64String('<CIFS_BASE64>'))
```

Then select a separate network-only context in Beacon:

```shell
make_token CONTOSO\rsteel FakePass
kerberos_ticket_use C:\Users\Attacker\Desktop\rsteel-cifs.kirbi
run klist
# Check client rsteel and service cifs/par-jmp-1.partner.com

ls \\par-jmp-1.partner.com\c$
# A listing requires the account's effective authorization on this host

# Purge only the selected test session, then end impersonation
kerberos_ticket_purge
rev2self
```

`FakePass` is a placeholder for the network-only context. The imported ticket supplies Kerberos material. Keep hostnames consistent with the service SPN. `klist` confirms cache contents; a resource access result confirms permissions on that resource.

## 6. Troubleshooting

| Symptom | What to check |
|---|---|
| Direction appears contradictory | Which domain's TDO was queried |
| Referral request fails | Trust path, source TGT validity, DNS, KDC reachability and policy |
| Remote TGS request fails | Referral realm, remote DC, SPN and supported encryption |
| Import fails | Complete Base64, correct file path and selected session |
| Ticket exists but access is denied | Remote authorization and authentication restrictions |
| BOF command is unknown | Loaded extension and its command syntax |

Reference: [Microsoft's explanation of trusting and trusted domains](https://www.microsoftpressstore.com/articles/article.aspx?p=3222421&seqNum=3).

## 7. Quick checklist

```text
MAP THE TRUST
[ ] ldapsearch (objectClass=trustedDomain) --attributes trustPartner,trustDirection,trustAttributes,flatName
[ ] Record the queried domain; trust direction is relative to it
[ ] ldapsearch (samAccountType=805306370) --attributes samAccountName
[ ] Distinguish a local TGT, referral and service ticket

REQUEST THE SERVICE TICKET
[ ] nslookup _ldap._tcp.dc._msdcs.<TARGET_DOMAIN> <DNS_IP> SRV
[ ] krb_asktgs /service:krbtgt/<TARGET_DOMAIN> /ticket:C:\path\source-tgt.kirbi
[ ] krb_asktgs /service:cifs/<TARGET_FQDN> /targetdomain:<TARGET_DOMAIN> /dc:<TARGET_DC> /ticket:<REFERRAL_BASE64>
[ ] Retain the complete service ticket returned by the remote KDC

IMPORT AND VERIFY
[ ] Local PowerShell: [IO.File]::WriteAllBytes('C:\path\service.kirbi', [Convert]::FromBase64String('<SERVICE_TICKET_BASE64>'))
[ ] Beacon: make_token <SOURCE_DOMAIN>\<USER> FakePass
[ ] kerberos_ticket_use C:\path\service.kirbi
[ ] run klist → check selected session, client, service and expiration
[ ] ls \\<TARGET_FQDN>\<SHARE> → verify resource authorization
[ ] kerberos_ticket_purge → only in the selected test session
[ ] rev2self
```

## Related references

- [Parent-child trusts](/cheatsheets/parent-child-trust-cheatsheet/)
- [Inbound trusts](/cheatsheets/inbound-trust-cheatsheet/)
- [Outbound trusts](/cheatsheets/outbound-trust-cheatsheet/)
- [Pass the Ticket](/cheatsheets/pass-the-ticket-cobalt-cheatsheet/)
