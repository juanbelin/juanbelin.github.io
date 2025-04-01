---
title: SpookyPass HTB Challenge (English)
image: /assets/img/Anexos/Pasted%20image%2020250401091447.png
description: SpookyPass Challenge from HTB [Dificult very asy]
categories: [Challenge,HTB]
tags: [reversing,very easy]
---

#

Once I install the file, I have got the next executable file: 
```shell
❯ ls
 pass
❯ file pass
pass: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=3008217772cc2426c643d69b80a96c715490dd91, for GNU/Linux 4.4.0, not stripped
```

Let's see how it works:
```shell
❯ ./pass
Welcome to the SPOOKIEST party of the year.
Before we let you in, you'll need to give us the password: test
You're not a real ghost; clear off!
```

Apparently we must provide the correct password which we don't know. So I run **ltrace** to see closely what happen:
```shell
❯ ltrace ./pass
puts("Welcome to the \033[1;3mSPOOKIEST\033["...Welcome to the SPOOKIEST party of the year.
)                  = 54
printf("Before we let you in, you'll nee"...)                      = 59
fgets(Before we let you in, you'll need to give us the password: test
"test\n", 128, 0x7a8ebea008e0)                               = 0x7ffd7686fda0
strchr("test\n", '\n')                                             = "\n"
strcmp("test", "s3cr3t_p455_f0r_gh05t5_4nd_gh0ul"...)              = 1
puts("You're not a real ghost; clear o"...You're not a real ghost; clear off!
)                        = 36
+++ exited (status 0) +++
```

It seems a C program, it's using **strcmp** to compare the user's input with the correct password (s3cr3t_p455_f0r_gh05t5_4nd_gh0ul).

```shell
❯ ./pass
Welcome to the SPOOKIEST party of the year.
Before we let you in, you'll need to give us the password: s3cr3t_p455_f0r_gh05t5_4nd_gh0ul
You're not a real ghost; clear off!
```
Trying I still get this. Perhaps ltrace did not show the full password string beceuse it's too long so let use **strings** to check it:

![](/assets/img/Anexos/Pasted%20image%2020250331133456.png)
We have it!

```shell
❯ ./pass
Welcome to the SPOOKIEST party of the year.
Before we let you in, you'll need to give us the password: s3cr3t_p455_f0r_gh05t5_4nd_gh0ul5
Welcome inside!
HTB{un0bfu5c4t3d_5tr1ng5}

```