---
title: Como instalar BlackArch en USB! 
description: Tutorial para instalar BlackArch en USB con persisntencia
categories: [Tutorial]
tags: [linux]
pin: true
image: https://media.giphy.com/media/TyNiKSSbpMcoveJ75f/giphy.gif?cid=790b76110gqqmis82olwlsdobcx4gxx7j1w40cznqc60hpf5&ep=v1_stickers_search&rid=giphy.gif&ct=s
comments: true
---
## Requirements

To install BlackArch on a USB with persistence, we need the following:

>[!Note] Requirements 
>- We need **2 USB drives**, one to install the ISO and another to install BlackArch with persistence, meaning it will boot BlackArch every time we plug it into the corresponding laptop/PC. 
>    - Minimum 8GB USB to install the [slim ISO](https://ftp.halifax.rwth-aachen.de/blackarch/iso/blackarch-linux-slim-2023.05.01-x86_64.iso)
>    - USB **+100 GB**, **essential**; otherwise, the installation will fail. It's recommended that the USB be 3.0 for optimal performance.
>    ![](/assets/img/Anexos/IMG_0441.png)



## Installation
First, download the **ISO** from the following link:

> [Install BlackArch iso](https://www.blackarch.org/downloads.html)

![](/assets/img/Anexos/Pasted%20image%2020250313090731-1.png)

To install it on the USB, we need to use software like _BalenaEtcher_ or _Rufus_. Preferably Rufus, as that is what I will use during the installation:

> [Install Rufus](https://rufus.ie/en/)

Once Rufus is installed on our computer and the ISO is downloaded, open Rufus, select the corresponding USB, select the recently downloaded BlackArch ISO, and click _Start_.
> [!info] Note 
> - Although the installation shows a 64GB USB, I eventually used a 128GB one due to installation issues.

![](/assets/img/Anexos/Pasted%20image%2020250313093740-1.png)
Here, it is important to select the **DD Image mode** writing mode; otherwise, the installation won't proceed correctly using the ISO mode.

![](/assets/img/Anexos/Pasted%20image%2020250313093814-1.png)
Again, make sure you have selected the correct USB, as the warning mentions, all files on the selected USB will be erased. 
![](/assets/img/Anexos/Pasted%20image%2020250313093837-1.png)
Once ready, close it and proceed as follows:
![](/assets/img/Anexos/Pasted%20image%2020250313094910-1.png)

With the USB still plugged in, **restart** the computer, and as it powers back on, depending on the type or model of BIOS in your laptop/PC, press **F2**, **F11**, **F10**, **DEL**, or **ESC**—the most common keys for accessing the BIOS. Here's a mini cheat sheet:
> - Acer: F2
> - ASUS: F2
> - Dell: F2
> - HP: F10
> - Lenovo: F2 or Fn+F2
> - MSI: Del
> - Samsung: F2
> - Toshiba: F2

Next, go to **Boot Manager** and select the USB.
![](/assets/img/Anexos/IMG_0445-1.png)

![](/assets/img/Anexos/IMG_0395.png)

Once selected, choose the second option, and the installer will start.
![](/assets/img/Anexos/IMG_0396.png)

Once inside, **DO NOT UNPLUG THE USB**, connect the other USB where BlackArch will be installed and log in.
>[!Note] Credentials  
>Login: liveuser  
>Password: blackarch

![](/assets/img/Anexos/IMG_0397.png)

After logging in, please consider the following:
- It is important **NOT to start the installation from the desktop installer**, as this might cause issues.
![](/assets/img/Anexos/Pasted%20image%2020250316092517-1.png)
- **DO NOT connect to a Wi-Fi network with Internet access**, as errors with **pacman** may occur during the installation, causing it to fail. **The pacman errors will be resolved later**.
- **Keep the computer plugged into power during installation**, as the process might take **MORE THAN 2 HOURS!!!!**.

For the installation, open a terminal and run the Calamares installer with `sudo`.
![](/assets/img/Anexos/Pasted%20image%2020250316092432-1.png)

The installer will open. A warning might pop up about not being connected to the Internet, but **that's okay**, select the language and continue.
![](/assets/img/Anexos/Pasted%20image%2020250316091721-1.png)

Next, select your location, whatever it may be.

![](/assets/img/Anexos/IMG_0399-1.png)
Finally, select your preferred keyboard layout:
![](/assets/img/Anexos/IMG_0400.png)

> [!Warning] Warning  
> Do not select this option. This option will automate the installation process, but it appears to be "deprecated," and the installation will get stuck at 4%.
![](/assets/img/Anexos/Pasted%20image%2020250316092257-1.png)

After completing the configuration, it's time for installation. Here, select the USB where BlackArch will be installed. **It's essential to ensure that the selected disk is the USB**, as selecting your laptop's/PC's disk will erase all its data.

Next, select "Manual partitioning."

![](/assets/img/Anexos/Pasted%20image%2020250316092632-1.png)
Create a new partition.

![](/assets/img/Anexos/Pasted%20image%2020250316092655-1.png)

Choose "GUID Partition Table (GPT)."
![](/assets/img/Anexos/Pasted%20image%2020250316092708-1.png)
Then select "Free Space" and click "Create."

![](/assets/img/Anexos/Pasted%20image%2020250316092734-1.png)

The first partition is for "boot," so it should be configured as follows:
- Size -> 500MB  
- File System -> fat32  
- Mount Point -> /boot/efi  
- Flags -> boot  
![](/assets/img/Anexos/Pasted%20image%2020250316092756-1.png)

Then, select the remaining space and click "Create."
![](/assets/img/Anexos/Pasted%20image%2020250316092910-1.png)

This remaining space will be used to install BlackArch. Configure it as follows:  
- Size -> The rest  
- File System -> ext4  
- Mount Point -> /  
- Flags -> root  

![](/assets/img/Anexos/Pasted%20image%2020250316092820-1.png)

When the partitions are created, click "Next," and the screen will show a summary of the partitions.

![](/assets/img/Anexos/Pasted%20image%2020250316092952-1.png)

Ensure everything is correct, then click "Install."  

Now, simply wait. The installation typically takes 2 hours. There might be moments where it seems stuck, particularly at 71% when installing the bootloader.
![](/assets/img/Anexos/IMG_0427.png)

Once installed, check "Restart now" and click "Done." While restarting, repeat the previous steps and press the appropriate key to access the BIOS.

![](/assets/img/Anexos/IMG_0428.png)

![](/assets/img/Anexos/IMG_0446(1).png)

When it boots, select BlackArch in the GRUB menu and log in with the credentials you set earlier.

![](/assets/img/Anexos/IMG_0447.png)

Now, if you try to use pacman to update the repositories or install software, you'll encounter the following error:
![](/assets/img/Anexos/IMG_0431.png)

This is because, on March 1, 2025, there was a migration in Arch's git repositories. You need to make the following changes for it to work. More info here: [Arch Linux News](https://archlinux.org/news/cleaning-up-old-repositories/).

In _/etc/pacman.conf_, comment out "**[community]**" and the line that follows it: "**Include = /etc/pacman.d/mirrorlist**".

![](/assets/img/Anexos/IMG_0432.png)

![](/assets/img/Anexos/IMG_0433.png)

![](/assets/img/Anexos/IMG_0436.png)

If you still encounter issues, edit _/etc/pacman.d/mirrorlist_ as follows: 

![](/assets/img/Anexos/IMG_0440.png)

After commenting out those lines, you should be able to update the packages:

![](/assets/img/Anexos/IMG_0437.png)

BlackArch is now installed on a USB with persistence. Enjoy.
![](/assets/img/Anexos/IMG_0439.png)



## Why don't we install with Internet access?
If we are connected to the Internet, the installation will automatically update packages using `pacman`. The issue is that `pacman` is "deprecated" in this case due to the migration in Arch's old git repositories. Therefore, it's better to install without an Internet connection and resolve the `pacman` issue afterward.  
> See [Arch Linux News](https://archlinux.org/news/cleaning-up-old-repositories/) for more information.



## Why don't we install using the "Erase disk" option?
If we use this option, the installation will get stuck at 4% when creating the root partition. For this reason, it's always better to do it manually.
![](/assets/img/Anexos/Pasted%20image%2020250316092257-1.png)

![](/assets/img/Anexos/Pasted%20image%2020250316150401-1.png)
