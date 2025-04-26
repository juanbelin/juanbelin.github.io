---
title: Grub rescue at every boot solved
image: /assets/img/Anexos/Pasted%20image%2020250408103223-1.png
description: This tutorials will definitely help you if you're having grub rescue each time you boot your computer
categories: [Tutorial]
tags: [linux]
---



### PDF Link
- PDF: [PDF Link](https://github.com/juanbelin/grub-rescue-at-every-boot-solved/blob/main/Grub%20recue%20at%20every%20boot.pdf)


Sometimes when we boot our PC as daily we get this error. This error often appears suddenly when we're using a Linux SO, specially if we're using dual boot. The error indicates that the grub can't find the boot partition and it sends us to the grub rescue command line. 
![](/assets/img/Anexos/Pasted%20image%2020250408103223-1.png)

## Way 1

So in order to fix it what we should do is as follows:
```shell
ls
(hd1) (hd1,gptx) (hd1,gptx) (hd1,gptx) (hd1,gptx) # Not always hd1, it can change!

ls (hd0,gpt x)
# We chose the one which has content or ext2 
ls (hd0,gpt x)/ # We must know if it contains the /boot or /grub directory 

set boot=(hd0,gptx) # Or set root=(hd0,gptx)
set prefix=(hd0,gptx)/boot/grub # O /grub
insmod normal 
normal
```

So now you probably solve the grub rescue issue but most of tutorial does not explain what to do if grub rescue appears at each boot. In order to solve this, the best option is doing the next:

## Way 2

Once we're in Linux we run the next commands:
```shell
sudo grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=kali2 --recheck --debug
sudo grub-mkconfig -o /boot/grub/grub.cfg
```

This will make a new grub named _kali2_ in this case and this will be the new grub bootloader skipping the broken one and this definitely fix the issue. 

Now the last thing you should do is remove/hidden the broken grub from the BIOS, this process can be different depending of your BIOS/GRUB. 

![](/assets/img/Anexos/Grub%20recue%20at%20every%20boot-2.png)