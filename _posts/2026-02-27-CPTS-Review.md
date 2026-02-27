
---
title: CPTS Review and Tips
image: /assets/img/Anexos/CPTS2.png
description: A review of my recient achiviement, the CPTS certification in addtion with some exam tips.
categories: [Review]
pin: true
tags: [CPTS]
---

## Español
**En este post me gustaría estar hablando de la ya famosa CPTS de HackTheBox. Seré breve y conciso**.

![](/assets/img/Anexos/CPTS%20POST.jpg)

### La PATH 
![](/assets/img/Anexos/CPTS%20POST-1.png)

El 90% de lo que entra en el examen se enseña en algún momento en los módulos de la PATH. **NO te esperes hacer copia y pega todo el rato**, ya que, como sabras cuando hagas la PATH o si ya la has hecho, HackTheBox da especial importancia a "Thing outside the box". Debes de ser capaz de relacionar las cosas entre si y buscar una lógica. Tienes que entender el _porque_ de las cosas. 

Aquí recomiendo fuertemente usar una buena app de notas desde el minuto 1, en mi caso yo usé [obisian](https://obsidian.md/) . Durante los módulos de la PATH, trata de enfocarte y prestar atención, haz los labs de cada módulo a ciegas siempre que puedas y toma bueno apuntes de lo que has aprendido de ellos, especialmente de los "_Skill assessment_" que tiene cada módulo, que viene siendo como un examen/lab final por cada módulo para poner en práctica todo lo aprendido. 

Aquí dejo una pequeña muestra de como me organizaba los apuntes con obsidian:

![](/assets/img/Anexos/CPTS%20POST-2.png)


![](/assets/img/Anexos/CPTS%20POST-4.png)


![](/assets/img/Anexos/CPTS%20POST-5.png)


#### Errores que debes evitar cuando estudies la PATH 
Durante mi aprendizaje a través de la PATH, cometí una serie de errores que hicieron que me frustrare y atrasaron mi presentación al examen, esto son: 
- Copiar y pegar los conceptos técnicos complejos en mis notas en lugar de entenderlos
- Hacer vagamente los  "_Skill assessment_" de cada módulo 
- No hacer el módulo _AEN_ a ciegas
- Tener prisa en completar la PATH para obtener la certificación cuanto antes




### El examen 
![](/assets/img/Anexos/CPTS%20POST-8.png)


El examen se compone son 10 días en donde tienes que sacar mínimo 12 flags para aprobar y hacer un reporte de pentesting profesional. El examen esta lleno de ruido, rabbit holes y distracciones. Es a mi parecer un entorno realista en donde todas las máquinas mantienen una relación entre sí, tal cual como si fuera una compañía. Conseguí las 12 flags en el día 8, los últimos 2 días estuve haciendo el reporte (no tenía casi nada en el reporte ya no quería perder el foco en el examen) y unas 5 horas antes de la deadline del examen entregué el reporte a las 3 de la mañana habiéndolo revisado varias veces.

#### El mayor enemigo eres tu  
![](/assets/img/Anexos/CPTS%20POST-3.png)

Durante el examen el mayor enemigo eres tu, ves cosas donde no las hay, caes en rabbit holes que te inventas tu solo, pruebas cosas que están fuera del scope del examen. Ten cuidado contigo mismo, el examen esta hecho para frustrarte y sacarte de tus casillas, si llevas mucho tiempo intentando algo sin resultados, eso es porque muy probablemente esa no sea la solución. 

#### Flags que más me costaron
Como ya muchos sabréis, hubo un cambio en la CPTS creo que por Junio de 2025 en donde algunas flags cambiaron, por lo que tener cuidado al leer reviews viejas ya que ellos experimentaron situaciones diferentes con ciertas flags. Sin embargo, mucha gente dice que cualquier flag puede sentirse frustrante, al fin y al cabo cada persona es diferente y puede que tenga diferentes metodologías, estoy de acuerdo pero la flag 8 me parece especialmente tricky. Las flags que más me costaron fueron: 
- Flag 1 
- Flag 2
- Flag 6 
- Flag 8
- Flag 12

#### Tips para el examen 
- **No tengas prisa**, **esto no es una carrera**, te estancarás varias horas, incluso días en más de una flag, esto se sentirá como que no tienes tiempo pero es totalmente normal, no te frustres. 
- **Descansa y come bien**, son 10 días en los que puede que caigas en la locura sino descansas bien. También trata de hacer deporte en la medida de lo posible, yo solía ir al gimnasio 1 hora, también puedes ir a dar un paseo o tumbarte en la cama mirando al techo para descansar. 
- **Comienza de nuevo si estás estancado**. Si estas estacando durante mucho tiempo, quizás lo mejor es volver a empezar y probar otras cosas desde 0, aunque se siente una pérdida de tiempo quizás sea lo mejor. 
- **Toma capturas y copia comandos de TODO**. Durante el examen ve tomando capturas de todo lo que descubres y copia los comandos clave, te serán de muchas ayuda más adelante cuando hagas el reporte. 
- **Las flags 13 y 14 pueden esperar**. Cuando consigas la flag 12, céntrate a muerte en el reporte ya que si el reporte no está bien nada vale. No te van a dar la CPTS+ por conseguir todas las flags ni ningún otro premio.
- **Mantén una lista de las contraseña**s de los usuarios que comprometes a la par que los comandos clave que te ayudaron a conseguir el foothold o la escalada de privilegios, esto asegurará persistencia si por lo que sea tienes que reiniciar el examen. 
- **Piensa tonto**, no tienes porque descubrir un 0-day durante el examen, en ocasiones la cosa más tonta que pienses es con la que obtienes el foothold o una escalada de privilegios. 



#### Reporting
![](/assets/img/Anexos/CPTS%20POST-14.png)

El feedback de mi examinador confirmó que mi reporte estaba muy bien redactado. Los pasos que seguí para ello, fueron los siguientes: 

- Apliqué prácticamente todos los tips de reporting de este post en reddit  -> <https://www.reddit.com/r/hackthebox/comments/1medjim/passed_cpts_exam/>
- Seguí este video de reporting con Sysreport <https://youtu.be/ItVsQmHLicc?si=7ACgV92sfFYtex3L>
- Seguí esta metodología de reporting tal cual está -> <https://www.brunorochamoura.com/posts/cpts-report/>

Eso fue Suficiente para hacer un buen reporte que me permitió aprobar el examen. 


### Como preparar el examen 
En mi caso, no hice los prolabs Dante y Zephyr ya que leí varias veces en reddit que todo lo que entre en el examen se enseña en algún momento en la PATH por lo que no consideré hacerlos. Sin embargo, debes hacer labs que te ayuden a estar preparado para el examen. Lo que recomiendo en base a lo que hice es lo siguiente: 
- Haz el AEN a ciegas

![](/assets/img/Anexos/CPTS%20POST-9.png)
Este módulo es lo más parecido que hay al examen. Sin embargo, cuando te presentes al examen, **Olvídate del AEN**, el examen no es un **AEN 2.0**, te lo puedo asgurar. 
- Haz el track de _CPTS Preparation_

![](/assets/img/Anexos/CPTS%20POST-10.png)

Este track es el oficial creado por HackTheBox, te ayudará a practicar y reforzar conceptos dentro del scope de la CPTS aunque también hay máquinas que dan conceptos que están fuera del scope. 

- Haz máquinas de la [NetSecFocus Trophy Room](https://docs.google.com/spreadsheets/u/1/d/1dwSMIAPIam0PuRBkCiDI88pU3yzrqqHkDtBngUHNCw8/htmlview), a mi me vinieron bien para practicar, pero no te vuelvas loco, no tienes porque hacerlas todas. 
- Practica pivoting, en mi caso, hice el siguiente lab diseñado específicamente para practicar pivoting entre múltiples interfaces https://labs.thehackerslabs.com/machine/45. 

Ahora bien, mejora tus notas y cheatsheets con todo lo que vayas aprendiendo mientras que completas los labs. Yo tenía una página en donde apuntaba las máquinas que iba haciendo y lo que aprendía de ellas


![](/assets/img/Anexos/CPTS%20POST-12.png)


### Mis pensamientos sobre la CPTS
La CPTS me parece una certificación que realmente se asegura que puedas cumplir en un puesto de trabajo como pentester. No solo por la manera de pensar que adquieres, sino también por las reporting skills, ya que al fin y al cabo el producto final en un pentest es el reporte y ellos se aseguran que tienes las habilidades y aptitudes necesarias para desarrollar un reporte profesional a la hora de corregírtelo.

Aunque cada vez la CPTS vaya cogiendo más fama en la industria y se esta valorando como se merece, la **OSCP** sigue siendo el finalboss de la certificaciones de pentesting a la hora de conseguir un trabajo. Me parece algo injusto que recursos humanos no valoré tanto esta certificación, sobre todo porque la OSCP está, en mi opinion, bastante más desactualizada que la CPTS, además de que la CPTS abarque más conceptos y te aporte más información. 

Quiero dejar claro que no estoy menospreciando a la OSCP, sino que me parece que por calidad precio, la CPTS hoy en día es una mejor opción. 


![](/assets/img/Anexos/CPTS%20POST-2.jpg)

### Próximos pasos 

Después de haber conseguido la CPTS, me gustaría formarme en read team, sin embargo pienso que mi punto debíl es hacking web, por lo que no lo quiero dejar de lado. Después de esta positiva experiencia con HackTheBox y ya teniendo la PATH de la CWES al 64%, es posible que me presenta a ella antes de que comience el verano. Como sea, seguiré formándome y haciendo laboratorios, las certificaciones que tengo en mente para el resto del año y comienzos de 2027 son las siguientes:

![](/assets/img/Anexos/CPTS%20POST-16.png)



## English
**In this post, I'd like to talk about the already famous HackTheBox CPTS. I'll be brief and concise.**

![](/assets/img/Anexos/CPTS%20POST.jpg)
### The PATH

![](/assets/img/Anexos/CPTS POST-1.png)

90% of what appears on the exam is taught at some point in the PATH modules. **Do not expect to just copy and paste all the time**, because, as you'll know when you take the PATH (or if you've already taken it), HackTheBox places special importance on "thinking outside the box." You need to be able to connect concepts and find the logic behind them. You have to understand the _why_ of things.

Here, I strongly recommend using a good note-taking app from minute one. In my case, I used [Obsidian](https://obsidian.md/). During the PATH modules, try to focus and pay attention. Do the labs for each module blind whenever you can, and take good notes on what you've learned from them, especially the "_Skill assessments_" each module has, which are like a final exam/lab for each module to put everything you've learned into practice.

Here's a small sample of how I organized my notes with Obsidian:
![](/assets/img/Anexos/CPTS POST-2.png)

![](/assets/img/Anexos/CPTS POST-4.png)


![](/assets/img/Anexos/CPTS POST-5.png)


#### Mistakes to Avoid When Studying the PATH

During my learning through the PATH, I made a series of mistakes that caused frustration and delayed my exam submission. These are:

- Copying and pasting complex technical concepts into my notes instead of understanding them.
- Half-heartedly completing the "_Skill assessments_" for each module.
- Not doing the _AEN_ module blind.
- Being in a hurry to complete the PATH to get the certification as quickly as possible.

### The Exam

![](/assets/img/Anexos/CPTS POST-8.png)

The exam consists of 10 days where you need to capture at least 12 flags to pass and produce a professional pentesting report. The exam is full of noise, rabbit holes, and distractions. In my opinion, it's a realistic environment where all the machines are interconnected, just like in a real company. I got the 12 flags on day 8. I spent the last 2 days working on the report (I had almost nothing in the report because I didn't want to lose focus on the exam), and about 5 hours before the exam deadline, at 3 in the morning, I submitted the report after reviewing it several times.

#### Your Biggest Enemy is You
![](CPTS POST-3.png)


During the exam, your biggest enemy is yourself. You see things that aren't there, you fall into rabbit holes you create on your own, you try things that are out of scope. Be careful with yourself; the exam is designed to frustrate you and push your buttons. If you've been trying something for a long time without results, it's very likely that it's not the solution.

#### Flags That Cost Me the Most

As many of you may know, there was a change to the CPTS around June 2025, where some flags changed. So be careful when reading old reviews, as they experienced different situations with certain flags. However, many people say that any flag can feel frustrating. After all, each person is different and may have different methodologies. I agree, but **flag 8** seems particularly tricky to me. The flags that cost me the most were:

- Flag 1
- Flag 2
- Flag 6
- Flag 8
- Flag 12


#### Tips for the Exam

- **Don't rush; this isn't a race.** You'll get stuck for several hours, even days, on more than one flag. It will feel like you're running out of time, but it's completely normal. Don't get frustrated.
- **Rest and eat well.** It's 10 days where you could go crazy if you don't rest properly. Also, try to exercise as much as possible. I used to go to the gym for an hour. You could also go for a walk or lie in bed staring at the ceiling to rest.
- **Start over if you're stuck.** If you've been stuck for a long time, maybe the best thing is to start over and try other things from scratch. Even though it feels like a waste of time, it might be the best course of action.
- **Take screenshots and copy commands for EVERYTHING.** During the exam, take screenshots of everything you discover and copy the key commands. They will be very helpful later when you're writing the report.
- **Flags 13 and 14 can wait.** Once you get flag 12, focus intensely on the report because if the report isn't good, nothing else matters. They won't give you CPTS+ for getting all the flags or any other prize.
- **Keep a list of passwords** for the users you compromise, along with the key commands that helped you get the foothold or privilege escalation. This ensures persistence if, for any reason, you have to restart the exam.
- **Think simple.** You don't have to discover a 0-day during the exam. Sometimes, the simplest thing you can think of is what gives you the foothold or privilege escalation.

#### Reporting

![](CPTS POST-14.png)

My examiner's feedback confirmed that my report was very well written. The steps I followed were:

- I applied practically all the reporting tips from this Reddit post -> [https://www.reddit.com/r/hackthebox/comments/1medjim/passed_cpts_exam/](https://www.reddit.com/r/hackthebox/comments/1medjim/passed_cpts_exam/)
    
- I followed this reporting video with Sysreptor -> [https://youtu.be/ItVsQmHLicc?si=7ACgV92sfFYtex3L](https://youtu.be/ItVsQmHLicc?si=7ACgV92sfFYtex3L)
    
- I followed this reporting methodology exactly as described -> [https://www.brunorochamoura.com/posts/cpts-report/](https://www.brunorochamoura.com/posts/cpts-report/)
    

That was enough to create a good report that allowed me to pass the exam.

### How to Prepare for the Exam


In my case, I didn't do the Dante and Zephyr Pro Labs because I read several times on Reddit that everything that appears on the exam is taught at some point in the PATH, so I didn't consider doing them. However, you should do labs that help you get ready for the exam. Based on what I did, I recommend the following:

- **Do the AEN module blind.**
    ![](/assets/img/Anexos/CPTS POST-9.png)

  
This module is the closest thing to the exam. However, when you take the exam, **forget about AEN**; the exam is **not AEN 2.0**, I can assure you.

- **Do the CPTS Preparation track.**
    ![](/assets/img/Anexos/CPTS POST-10.png)

This track is the official one created by HackTheBox. It will help you practice and reinforce concepts within the CPTS scope, although there are also machines that introduce concepts outside the scope.

- **Do machines from the [NetSecFocus Trophy Room](https://docs.google.com/spreadsheets/u/1/d/1dwSMIAPIam0PuRBkCiDI88pU3yzrqqHkDtBngUHNCw8/htmlview).** They were helpful for practice, but don't go crazy; you don't have to do them all.
    
- **Practice pivoting.** In my case, I did the following lab specifically designed to practice pivoting across multiple interfaces: [https://labs.thehackerslabs.com/machine/45](https://labs.thehackerslabs.com/machine/45).
    

Now, improve your notes and cheatsheets with everything you learn while completing the labs. I had a page where I noted down the machines I was working on and what I learned from them.

![](/assets/img/Anexos/CPTS POST-12.png)

### My Thoughts on the CPTS

I think the CPTS is a certification that truly ensures you can perform in a pentesting job role. Not only because of the mindset you acquire, but also because of the reporting skills. After all, the final product in a pentest is the report, and they make sure you have the necessary skills and aptitudes to develop a professional report when they grade it.

Although the CPTS is gaining more and more fame in the industry and is starting to be valued as it deserves, the **OSCP** is still the final boss of pentesting certifications when it comes to landing a job. It seems somewhat unfair to me that HR doesn't value this certification as much, especially because the OSCP is, in my opinion, considerably more outdated than the CPTS, in addition to the fact that the CPTS covers more concepts and provides you with more information.

I want to make it clear that I'm not underestimating the OSCP, but I believe that in terms of value for money, the CPTS today is a better option.

![](/assets/img/Anexos/CPTS POST-2.jpg)
### Next Steps

After having obtained the CPTS, I'd like to train in red teaming. However, I think my weak point is web hacking, so I don't want to neglect that. After this positive experience with HackTheBox and already having the CWES PATH at 64%, I might go for it before summer starts. Either way, I'll continue training and doing labs. The certifications I have in mind for the rest of the year and early 2027 are the following:

![](/assets/img/Anexos/CPTS POST-16.png)

