---
title: Down Vulnlab (English)
image: /assets/img/Anexos/Vulnlab.png
description: Down Vulnhab [Difuculty easy]
categories: [CTF,Vulnlab]
tags: [hacking,easy]
---



## Introduction
N/A
### Machine Description


- Name: Down
- Goal: Get two flags
- Difficulty: easy
- Operating System: Linux
- link: [Down](https://www.vulnlab.com/machines )

  

### PDF Link
- PDF: [Link to PDF](https://github.com/juanbelin/Writeups-CTFs-Challenges/blob/main/Vulnlab/M%C3%A1quina%20Down.pdf)





![](/assets/img/Anexos/Vulnlab.png)


## Reconnaissance 
```
sudo nmap -sSCV --min-rate 5000 -p- --open -n -Pn 10.10.87.59 -oN scan1.txt
Starting Nmap 7.95 ( https://nmap.org ) at 2025-06-20 14:52 CEST
Stats: 0:00:21 elapsed; 0 hosts completed (1 up), 1 undergoing Service Scan
Service scan Timing: About 50.00% done; ETC: 14:52 (0:00:06 remaining)
Nmap scan report for 10.10.87.59
Host is up (0.038s latency).
Not shown: 59880 closed tcp ports (reset), 5653 filtered tcp ports (no-response)
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.10 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 f6:cc:21:7c:ca:da:ed:34:fd:04:ef:e6:f9:4c:dd:f8 (ECDSA)
|_  256 fa:06:1f:f4:bf:8c:e3:b0:c8:40:21:0d:57:06:dd:11 (ED25519)
80/tcp open  http    Apache httpd 2.4.52 ((Ubuntu))
|_http-title: Is it down or just me?
|_http-server-header: Apache/2.4.52 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 23.56 seconds
```

We start using `nmap` in order to know port and services running in the target and it reported us the port _22_ and _80_. We'll explore HTTP since we cannot do nothing with `ssh` for now. 

![](/assets/img/Anexos/Vulnlab-1.png)

In http this web exists which we can use to apparently make requests

![](/assets/img/Anexos/Vulnlab-2.png)


![](/assets/img/Anexos/Vulnlab-3.png)

After some tests, I can figured two things out. First as the image above, if you put two url, it will do a request to each url it receives, the other is that is probably using `curl`.

## Explotation 
So due to the way it's using curl, we can attemp to a SSRF: 

![](/assets/img/Anexos/Vulnlab-4.png)

Viewing `index.php` in order to get the webserver-code, we can see that a expert mode exists so lets see it.

![](/assets/img/Anexos/Vulnlab-5.png)

![](/assets/img/Anexos/Vulnlab-6.png)

In this new function, if we make a request to a unkown host we will get this error and searching in google we can confirm that is using `nc`

![](/assets/img/Anexos/Vulnlab-7.png)
So lets get a reverse shell:


![](/assets/img/Anexos/Vulnlab-8.png)

In order to bypass this, lets use burp:

![](/assets/img/Anexos/Vulnlab-9.png)

![](/assets/img/Anexos/Vulnlab-10.png)

## Privilage Escalation

Once in, investigating the Aleks' home directory, there is a content apparently encrypted in `pswm`

![](/assets/img/Anexos/Vulnlab-12.png)

So I used this decryptor in order to find the master password and discover Aleks' password 

```shell
❯ python3 pswm-decrypt.py -f code -w /usr/share/wordlists/rockyou.txt

[+] Master Password: flower
[+] Decrypted Data:
+------------+----------+----------------------+
| Alias      | Username | Password             |
+------------+----------+----------------------+
| pswm       | aleks    | flower               |
| aleks@down | aleks    | 1uY3w22uc-Wr{xNHR~+E |
+------------+----------+----------------------+
```

Once logged as _aleks_ we can execute whatever as whoever so lets get the root: 

```shell
aleks@down:~/.local/share/pswm$ sudo -l
[sudo] password for aleks: 
Matching Defaults entries for aleks on down:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin,
    use_pty

User aleks may run the following commands on down:
    (ALL : ALL) ALL
```


