---
title: eJPT Review
image: Review%20eJPT.png
img_path: /assets/img/Anexos/
description: A review about eJPT certification.
categories: [Review]
tags: [eJPT]
---



- [Español](#Español)
- [English](#English)

## Español

### Introducción 
El 14/04/2025 me presente al examen de la [eJPT](https://security.ine.com/certifications/ejpt-certification/), certificación de [INE](https://security.ine.com/). Sabía que tenía el examen aprobado tras 4 horas pero quise comprometer todos los sistemas que pudiera y me demoré hasta las 7 horas terminando con una puntuación de 91%. El examen lo hice más o menos con 40 máquinas completadas pero no todas ellas a ciegas, probablemente en más de la mitad tuve que acudir al writeup ya que o me quedaba atascado o no conocía la metodología de ataque. La estructura del examen es la siguiente:

![](Review%20eJPT-1.png)


### Estructura del examen 
El examen se compone de 35 preguntas tipo test las cuales se aseguran que has realizado una tarea concreta. Por ejemplo "Cual es la versión del kernel del sistema que usa Strapi", esto no lo puedes saber hasta que encuentres el sistema que usa Strapi y luego lo comprometas. 

INE te da una serie de herramientas para el examen por lo que no deberías complicar las cosas utilizando otras herramientas. En mi caso pude pasar el examen sin ir más allá de las herramientas que me dieron. 

![](Review%20eJPT-3.png)

La estructura mi laboratorio fue parecida a esta:

![](Review%20eJPT-4.png)

Con tu máquina Kali, la cual te proporciona INE desde tu navegador, estas dentro de una red en donde hay una serie de máquinas las cuales tienes que descubrir. No todas las máquinas de la red tienen que ser comprometidas, en mi examen, hubo 2 que eran de relleno. Tampoco es necesario escalar privilegios en todas las máquinas. Una máquina contiene otra interfaz por lo cual deberás usar esta máquina como puente para pivotar a las máquinas de la otra red las cuales en mi caso 3 de ellas eran de señuelo.

### Recomendaciones 
- Haz muchas máquinas. Te recomiendo empezar por [DockerLabs](https://dockerlabs.es/) haciendo las muy fáciles, después fáciles y puedes hacerte alguna media también. Práctica en [HacktheBox](https://app.hackthebox.com), si tienes que pagar un el VIP págalo, tendrás acceso a todas las máquinas retiradas y podrás prepararte mejor. Esta es la mejor lista de máquinas para la eJPT que encontré [Lista máquinas eJPT](https://beafn28.gitbook.io/beafn28/preparar-ejptv2/maquinas).
- Practica Windows, no solo te centres en Linux ya que Windows si que entra. 
- Apunta todo durante el examen, usuarios, contraseñas, puertos para ir atando hilos y no quedarte atascado, en mi examen use **Obsidian** para tomar apuntes y hacer el diagrama. 
- No compliques las cosas, si la explotación **NO** va por ahí es que no va por ahí. El laboratorio es relativamente intuitivo, hazlo como si fuera un CTF normal, no caigas en rabbits holes. 
- No tengas prisa, tienes **48 horas**, ve con calma, toma descansos, come algo, apunta las cosas con calma y detalladamente. 

#### Videos recomendados  
- [Laboratorio de preparación eJPT](https://youtu.be/v20IsEd5nUU?si=ta7cgR1bl5yicr5m)
- [Tips y consejos eJPT](https://youtu.be/Fb3G5swFD_Q?si=eW_gdzDRoMHRLHEJ)
- [Simulación eJPT](https://youtu.be/l6tHH2qQmQ8?si=R8Gj4dwCBUMQ6Kl0)
- [Pivoting con Metasploit en Windows](https://www.youtube.com/watch?v=WM8lHCHblDU)
- [Pivoting con Metasploit en Linux](https://youtu.be/RotyKByc8Jc?si=ReI2Lof5obplSWK6)


## English

### Introduction

On April 14th, 2025, I took the [eJPT](https://security.ine.com/certifications/ejpt-certification/) exam, a certification by [INE](https://security.ine.com/). I knew I had passed the exam after 4 hours, but I wanted to compromise as many systems as I could, so I ended up spending 7 hours in total, finishing with a score of 91%. I tackled the exam with experience from about 40 machines under my belt, but not all of them were done blindly. For more than half of them, I had to refer to writeups either because I got stuck or I didn't know the attack methodology. The exam estructure is:

![](Review%20eJPT-1.png)

### Exam Structure

The exam consists of 35 multiple-choice questions, each confirming that you’ve performed a specific task. For example: _“What is the kernel version of the system running Strapi?”_, you won’t know that until you find the machine running Strapi and then compromise it.

INE provides you with a set of tools for the exam, so there’s really no need to complicate things using your own custom tools. In my case, I passed the entire exam without going beyond the tools they provided.

![](Review%20eJPT-3.png)

My lab structure looked something like this:

![](Review%20eJPT-4.png)

Using your Kali machine, which INE provides straight from your browser, you’re placed inside a network where you must discover and compromise various machines. Not every machine needs to be compromised; in my case, two of them were just decoys. You also don’t need to escalate privileges on every machine. One machine contains another interface, so you’ll need to use it as a pivot point to access machines on the other network three of which were also decoys in my case.

### Recommendations

- **Do lots of machines.** I recommend starting with [DockerLabs](https://dockerlabs.es/): begin with the “very easy” ones, then move to “easy,” and maybe try a couple of “medium” ones. Practice on [HacktheBox](https://app.hackthebox.com). If you have to pay for VIP, do it, you’ll get access to retired machines and be better prepared. This is the best eJPT machine list I found: [eJPT Machine List](https://beafn28.gitbook.io/beafn28/preparar-ejptv2/maquinas).
    
- **Practice Windows.** Don’t just focus on Linux,Windows **will** show up on the exam.
    
- **Take notes during the exam.** Usernames, passwords, ports… write everything down to connect the dots and avoid getting stuck. I used **Obsidian** for note-taking and diagramming.
    
- **Don’t overcomplicate things.** If the exploitation path **isn’t** working, it probably really isn’t the way. The lab is fairly intuitive, treat it like a normal CTF. Don’t fall into rabbit holes.
    
- **Take your time.** You’ve got **48 hours**. Chill. Take breaks. Eat something. Write things down clearly and in detail.
    

#### Recommended Videos

- [eJPT Preparation Lab (Spanish)](https://youtu.be/v20IsEd5nUU?si=ta7cgR1bl5yicr5m)
    
- [eJPT Tips & Advice (Spanish)](https://youtu.be/Fb3G5swFD_Q?si=eW_gdzDRoMHRLHEJ)
    
- [eJPT Simulation (Spanish)](https://youtu.be/l6tHH2qQmQ8?si=R8Gj4dwCBUMQ6Kl0)
    
- [Pivoting with Metasploit on Windows](https://www.youtube.com/watch?v=WM8lHCHblDU)
    
- [Pivoting with Metasploit on Linux](https://youtu.be/RotyKByc8Jc?si=ReI2Lof5obplSWK6)
    

