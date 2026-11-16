---
title: "DCSync"
description: "Request account secrets through AD replication, identify the required rights, and inspect krbtgt material for subsequent ticket forgery."
category: "Domain Dominance"
tools: ["Cobalt Strike", "Mimikatz"]
updated: 2026-11-16
tags: ["domain-dominance", "dcsync", "replication", "ad"]
draft: false
---

## 1. Why the attack works

Domain controllers replicate Active Directory changes through Directory Replication Service (DRS). DCSync uses that replication interface to request account secrets from a DC, rather than reading LSASS memory on the operator's current machine.

The important prerequisite is **replication rights over the domain naming context**. Domain and enterprise administrators and DC accounts commonly hold these rights, but another identity may have them delegated. Ordinary domain membership or local administrator access to a workstation is not enough.

| Right | GUID |
|---|---|
| DS-Replication-Get-Changes | `1131f6aa-9c07-11d1-f79f-00c04fc2dcd2` |
| DS-Replication-Get-Changes-All | `1131f6ad-9c07-11d1-f79f-00c04fc2dcd2` |
| DS-Replication-Get-Changes-In-Filtered-Set | `89e95b76-444d-4c62-991a-0facbeda640c` |

The first two rights are central to secret replication in this workflow; the filtered-set right is relevant to applicable filtered attributes. Their GUIDs are distinct.

## 2. Request krbtgt secrets

```shell
beacon> getuid
# Confirm the effective identity before requesting replication.
beacon> dcsync contoso.com CONTOSO\krbtgt
# Inspect the returned account SID, NTLM hash and available AES128/AES256 keys.
```

Beacon's `dcsync` invokes Mimikatz replication functionality. The operation needs connectivity to the domain's replication interfaces and an identity with the required rights. Select the intended account instead of treating this as a local cache dump.

## 3. Interpret the material

| Output | Use |
|---|---|
| Account SID | Identifies the replicated account; the final RID is not part of the domain SID |
| NTLM hash | RC4 key material where the environment supports that encryption type |
| AES128 / AES256 | Kerberos key material for the corresponding encryption type |
| Current and historical material | Keep track of which key/version is being used |

`krbtgt` protects domain TGTs. Its key enables the Golden and Diamond workflows; it is not the service account key used to construct an ordinary Silver Ticket. A `krbtgt` SID ends with RID `502`; remove the account RID when a tool asks for the **domain SID**.

## 4. Verification and troubleshooting

| Symptom | Check |
|---|---|
| Access denied | Effective token and replication rights on the domain root |
| RPC or server error | Domain/DC discovery, DNS, network reachability and RPC filtering |
| Desired key missing | Selected account, available encryption material and returned key versions |
| Forged ticket rejected afterward | Key type, key version, identity fields and KDC validation; successful DCSync is not a ticket-acceptance test |

## 5. Detection and remediation

Investigate replication from hosts that are not DCs. Event `4662`, with the relevant directory auditing and SACLs, can record use of replication rights. Correlate the requesting identity and source host; DRS traffic alone is normal between DCs.

Remove unjustified replication rights and treat extracted secrets as compromised. For `krbtgt`, recovery requires a coordinated key-reset procedure accounting for both current and previous keys; changing only the compromised administrator's password does not invalidate stolen `krbtgt` material.

## Related references

- [Golden Tickets](/cheatsheets/golden-ticket-cheatsheet/)
- [Diamond Tickets](/cheatsheets/diamond-ticket-cheatsheet/)
- [OS credential dumping](/cheatsheets/os-credential-dumping-cheatsheet/)
