---
title: "DPAPI Domain Backup Key"
description: "Recover the domain DPAPI backup key and use SharpDPAPI to decrypt accessible domain-user credential files and their backed-up masterkeys."
category: "Domain Dominance"
tools: ["Cobalt Strike", "SharpDPAPI", "Mimikatz"]
updated: 2026-11-16
tags: ["domain-dominance", "dpapi", "backup-key", "credentials"]
draft: false
---

## 1. Why the attack works

DPAPI protects secrets such as saved Windows credentials with masterkeys. For domain-user masterkeys backed up through the domain recovery mechanism, another copy is protected with the domain's DPAPI backup key.

The private backup key can recover those masterkeys without the user's password. The encrypted masterkey files and credential blobs must still be available; possession of the backup key does not automatically download every user's secrets or decrypt every kind of protected data.

| Access or material | What it enables |
|---|---|
| Sufficient domain privilege and DC access | Retrieve the domain backup key in the notes' workflow |
| Local elevation | Read other accessible user profiles on the current machine |
| Backup key plus matching files | Recover backed-up masterkeys and decrypt their associated DPAPI blobs |

Local administrator access to a workstation is not enough to retrieve the domain backup key from a DC. A normal user password change does not inherently destroy DPAPI access, and changing user passwords alone does not invalidate a stolen domain backup key.

## 2. Extract the domain backup key

```shell
beacon> execute-assembly C:\Tools\SharpDPAPI\SharpDPAPI\bin\Release\SharpDPAPI.exe backupkey
# Retain the complete Key value for /pvk.
```

The notes also identify Mimikatz `lsadump::backupkeys` as an alternative. The SharpDPAPI output contains sensitive private recovery material, not a password hash for offline guessing.

## 3. Enumerate accessible credentials

```shell
beacon> getuid
beacon> execute-assembly C:\Tools\SharpDPAPI\SharpDPAPI\bin\Release\SharpDPAPI.exe credentials
# A credential may be readable while its masterkey is not yet available:
# MasterKey GUID not in cache
```

In the supplied example, an elevated `CONTOSO\dyork` session can inspect `pchilds`' credential files:

```text
C:\Users\pchilds\AppData\Local\Microsoft\Credentials\
```

Being able to read a blob is not the same as decrypting it. Keep the matching masterkey material under the user's `Microsoft\Protect` directory available as well.

## 4. Decrypt with the backup key

```shell
beacon> execute-assembly C:\Tools\SharpDPAPI\SharpDPAPI\bin\Release\SharpDPAPI.exe credentials /pvk:<BASE64_BACKUP_KEY>
# Review TargetName, UserName and Credential in successfully decrypted results.
# Lab example:
# TargetName: Domain:target=TERMSRV/lon-ws-1
# UserName:   LON-WS-1\Administrator
```

The target identifies the resource for which a credential was saved; it does not establish that the password remains valid or that the session has already connected there. The `/rpc` recovery route is not equivalent: local administrator access as `dyork` does not automatically authorize recovery of `pchilds`' masterkey through that user's domain RPC recovery context.

## 5. Troubleshooting and detection

| Symptom | Check |
|---|---|
| `backupkey` access denied | Effective domain identity and DC access, not merely local elevation |
| Masterkey missing | Matching GUID and access to the user's Protect files |
| Blob still cannot be decrypted | Correct domain backup key, backed-up masterkey and credential files |
| Some secrets remain unavailable | Different protection mechanisms or unsupported data types |

Correlate unusual access to DC backup-key material with reads of multiple users' Protect and Credentials directories. Enumeration failures do not rule out collection for later offline decryption.

Unlike an ordinary user password, the domain backup key is long-lived recovery material. Stop using and remove exported copies when the exercise ends, but do not mistake operator cleanup for invalidation of copies already obtained.

## Related references

- [Windows Credential Manager](/cheatsheets/windows-credential-manager-cheatsheet/)
- [Browser credentials](/cheatsheets/browser-credentials-cheatsheet/)
- [SharpDPAPI](https://github.com/GhostPack/SharpDPAPI)
