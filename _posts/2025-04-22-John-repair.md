---
title: John The reaper error solved 
image: /assets/img/Anexos/John%20repair-2.png
description: John The reaper python2 error solved 
categories: [Tutorial]
tags: [tool]
---




## Introduction

When using tools like `ssh2john`, which is part of the **John the Ripper** utility suite, you might run into an error like this:

```shell
File "/usr/bin/ssh2john", line 194, in <module>
  read_private_key(filename)
File "/usr/bin/ssh2john", line 154, in read_private_key
  saltstr = data[salt_offset:salt_offset+salt_length].encode("hex")
AttributeError: 'bytes' object has no attribute 'encode'. Did you mean: 'decode'?

```

This error happens because the script was originally written for **Python 2**, where you _could_ do:
```shell
some_bytes.encode("hex")
```
However, in **Python 3**—the standard nowadays—that method is **no longer valid**. Instead, you should use:
```shell
some_bytes.hex()

```

Or if you’re working with encoded strings:
```shell
some_bytes.decode('utf-8')
```

But since the script hasn’t been updated, and you're using an old version of John the Ripper installed via your package manager (`pacman -S john` or `apt install john`), it throws this Python error.

##  The Quick Fix

This problem is easily solved by installing the **up-to-date GitHub version** of John the Ripper. It’s Python 3 compatible and works smoothly.

On Arch Linux:
```shell
sudo pacman -S john-git
```

Or if you're using `yay`:

```shell
yay -S john-git
```

On Debian/Ubuntu (if `john-git` is available):
```shell
sudo apt install john-git
```

_If it's not available, just clone and compile it manually:_
```shell
git clone https://github.com/openwall/john.git
cd john/src
./configure && make -s clean && make -sj4
```