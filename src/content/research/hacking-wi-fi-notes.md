---
title: Apuntes Hacking WI-FI (Spanish)
description: "Mis apuntes de hacking WiFi: modo monitor, captura y análisis de tramas, handshake WPA/WPA2-PSK, recuperación de claves, PMKID, Evil Twin, WPS y diferencias entre el cifrado inalámbrico y HTTPS. Incluye el PDF original y los comandos organizados por técnica."
date: '2025-02-08'
categories:
  - Tutorial
tags:
  - wifi
  - wpa
  - wpa2
image: https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-0O6b-BaoV_hj9IJHYMEpiHjVRbdDKmUIVQ&s
pin: false
legacySlug: Hacking_Wi-Fi_Notes
---

Aquí dejo el [PDF de mis apuntes de Hacking WiFi](https://github.com/juanbelin/Apuntes-Hacking-WIFI/blob/main/Vulneraci%C3%B3n%20de%20redes%20WPA-WPA2(PSK).pdf), junto con las notas organizadas para consultarlas directamente desde el artículo.

## Adaptador bandas y modo monitor

Antes de empezar hay que comprobar el chipset, el controlador, las bandas admitidas y la capacidad de trabajar en modo monitor. Poder conectarse normalmente a una red no garantiza poder capturar tramas de gestión o inyectarlas.

Un adaptador limitado a 2,4 GHz no permitirá observar correctamente una red que opere únicamente en 5 GHz. También importan el canal, el ancho de canal y las restricciones que aplica el controlador. La banda de 5 GHz ofrece más canales en muchos entornos, pero no garantiza mejor cobertura ni menos interferencias en todos los casos.

En modo **managed**, la interfaz se utiliza para conectarse a un AP. En modo **monitor**, permite observar las tramas 802.11 que recibe en el canal seleccionado, sin tener que estar asociada a ese AP. No equivale a recibir todo el tráfico del entorno: influyen la señal, el canal y el hardware.

```bash
# Identificar interfaces y capacidades.
iw dev
iw list

# Comprobar procesos que pueden interferir.
sudo airmon-ng check

# Activar modo monitor sobre la interfaz identificada.
sudo airmon-ng start wlan0

# Comprobar el nombre y modo resultantes.
iw dev
```

El nombre puede cambiar a `wlan0mon`; hay que usar el que realmente muestre el sistema. Si los servicios de conexión interfieren, `airmon-ng check kill` los detiene, pero también puede cortar la conectividad del equipo. La [documentación de airmon-ng](https://www.aircrack-ng.org/doku.php?id=airmon-ng) explica ese comportamiento.

## Cambiar y restaurar la dirección MAC

La MAC identifica una interfaz en la capa de enlace. Cambiarla puede servir para controlar la identidad utilizada en una prueba; no proporciona anonimato ni evita que la actividad sea observable.

```bash
# Consultar antes de cambiar.
sudo macchanger -s wlan0

# Con la interfaz fuera de uso y antes de activar monitor.
sudo ip link set wlan0 down
sudo macchanger -m 02:00:00:00:00:10 wlan0
sudo ip link set wlan0 up

# Restaurar la dirección permanente al terminar.
sudo ip link set wlan0 down
sudo macchanger -p wlan0
sudo ip link set wlan0 up
```

La dirección usada debe evitar conflictos con otros equipos. El controlador o las políticas de aleatorización del gestor de red pueden influir en el resultado, por lo que hay que volver a comprobarlo.

## Reconocimiento con Airodump-ng

```bash
sudo airodump-ng wlan0mon

# Explorar bandas compatibles de 2,4 y 5 GHz.
sudo airodump-ng --band abg wlan0mon
```

La primera tarea es identificar el AP y los clientes relevantes, sin confundir el nombre visible de la red con la dirección del punto de acceso.

| Campo | Interpretación |
|---|---|
| BSSID | Dirección del punto de acceso |
| ESSID | Nombre anunciado de la red |
| CH | Canal observado |
| PWR | Estimación de potencia recibida; no es una medida exacta de distancia |
| Beacons | Cantidad de anuncios del AP recibidos |
| ENC / CIPHER / AUTH | Información anunciada sobre protección y autenticación |
| STATION | Dirección de un cliente observado |
| Probes | Nombres buscados en las solicitudes que se han podido observar |

Que aparezca un cliente no implica necesariamente que esté conectado al AP de interés. Tampoco todos los dispositivos anuncian continuamente todas las redes conocidas: las implementaciones y las medidas de privacidad cambian ese comportamiento.

Para concentrar la captura, se selecciona un canal y un BSSID. Estos marcadores se sustituyen por los valores observados:

```bash
sudo airodump-ng --channel <CANAL> --bssid <BSSID_AP> \
  --write captura wlan0mon
```

Fijar el canal evita perder partes de una conversación mientras la interfaz salta entre canales. `--write` utiliza un prefijo para los archivos de salida, entre los que puede aparecer `captura-01.cap`. Véase [Airodump-ng](https://www.aircrack-ng.org/doku.php?id=airodump-ng).

## Qué contiene un handshake WPA WPA2

El **four-way handshake** permite demostrar que el cliente y el AP disponen del material de claves adecuado y establecer claves de sesión. No transmite la contraseña de la red, ni en claro ni como una contraseña simplemente cifrada que pueda extraerse de la captura.

En WPA/WPA2-PSK, una contraseña candidata y el SSID permiten derivar una PMK. Con la información correspondiente del intercambio se derivan otras claves y se comprueba si el resultado coincide con los datos de autenticación capturados. Esa comprobación permite probar candidatos sin seguir consultando al AP.

Por eso deben distinguirse tres resultados:

1. Observar mensajes de una conexión.
2. Obtener material suficiente y consistente para comprobar candidatos.
3. Encontrar una contraseña candidata que valide ese material.

Capturar un handshake no garantiza recuperar la clave. Si una contraseña larga y aleatoria no aparece entre los candidatos, un diccionario no la encontrará.

## Reconexión pasiva y desautenticación dirigida

La captura puede realizarse esperando a que un cliente se conecte o reconecte. No es necesario provocar una desconexión para que exista un handshake.

La desautenticación es una técnica activa: intenta que una estación abandone su relación con el AP. En el contexto del lab se mantiene Airodump-ng capturando el AP en su canal y se limita la prueba al cliente controlado:

```bash
# Prueba acotada sobre el AP y cliente incluidos en el laboratorio.
sudo aireplay-ng --deauth 3 -a <BSSID_AP> -c <MAC_CLIENTE> wlan0mon
```

Que se envíen las tramas no garantiza que el cliente las acepte ni que se capture una reconexión utilizable. La señal, la inyección, el canal y **Protected Management Frames (PMF)** influyen en el resultado. Las tramas de gestión protegidas pueden impedir la desautenticación falsificada.

La variante broadcast afecta a más estaciones y no es necesaria para comprobar la reconexión de un cliente concreto. Las pruebas continuas o globales cambian el objetivo hacia la interrupción del servicio. Referencia: [desautenticación en Aircrack-ng](https://www.aircrack-ng.org/doku.php?id=deauthentication).

## Interpretar las tramas con Wireshark y Tshark

Los filtros de visualización permiten separar las fases de una conexión. Son filtros de análisis de una captura, no instrucciones para que la interfaz reciba tramas que no capturó.

| Trama o protocolo | Filtro de visualización |
|---|---|
| Beacon | `wlan.fc.type_subtype == 0x08` |
| Probe Request | `wlan.fc.type_subtype == 0x04` |
| Probe Response | `wlan.fc.type_subtype == 0x05` |
| Authentication | `wlan.fc.type_subtype == 0x0b` |
| Association Request | `wlan.fc.type_subtype == 0x00` |
| Association Response | `wlan.fc.type_subtype == 0x01` |
| Disassociation | `wlan.fc.type_subtype == 0x0a` |
| Deauthentication | `wlan.fc.type_subtype == 0x0c` |
| CTS | `wlan.fc.type_subtype == 0x1c` |
| EAPOL | `eapol` |

```bash
# Revisar mensajes EAPOL en una captura existente.
tshark -r captura-01.cap -Y 'eapol'

# Revisar desautenticaciones.
tshark -r captura-01.cap -Y 'wlan.fc.type_subtype == 0x0c'
```

En una conexión WPA2 convencional, la autenticación 802.11 inicial y la asociación preceden al intercambio EAPOL de establecimiento de claves. No debe confundirse esa autenticación inicial con haber demostrado ya conocimiento de la PSK.

Un Probe Response no obliga por sí mismo al cliente a conectarse al primer AP que responda. El cliente también aplica su configuración y sus requisitos de seguridad. Los nombres de campos se pueden consultar en la [referencia de filtros de Wireshark](https://www.wireshark.org/docs/dfref/w/wlan.html).

## Validar el material y probar contraseñas

Conviene comprobar qué intercambio se ha capturado, qué AP y cliente participan y si la herramienta dispone del material necesario. Un aviso visual de handshake no sustituye esa revisión.

Aircrack-ng permite trabajar directamente con la captura:

```bash
# Examinar el material que reconoce en el archivo.
aircrack-ng captura-01.cap

# Probar un diccionario contra el AP seleccionado.
aircrack-ng -w diccionario.txt -b <BSSID_AP> captura-01.cap
```

La prueba de diccionario compara candidatos; no descifra una contraseña almacenada en el `.cap`. Si termina sin coincidencias, puede faltar la contraseña en la lista o existir un problema con la captura. La conclusión debe reflejar cuál de las dos cosas se ha comprobado. Referencia: [Aircrack-ng](https://www.aircrack-ng.org/doku.php?id=aircrack-ng).

### Hashcat y el formato 22000

Las notas originales incluyen la conversión a `.hccap` y el uso de `hccap2john`. Ese recorrido pertenece a formatos y herramientas anteriores. Para Hashcat, un flujo actual utiliza hcxtools y el formato de texto 22000:

```bash
hcxpcapngtool -o captura.22000 captura-01.cap
hashcat -m 22000 -a 0 captura.22000 diccionario.txt
hashcat -m 22000 captura.22000 --show
```

El formato puede representar material PMKID o EAPOL; no convierte ambos mecanismos en el mismo intercambio. El modo debe corresponder al formato realmente generado. Referencias: [hcxtools](https://github.com/ZerBea/hcxtools) y [WPA/WPA2 con Hashcat](https://hashcat.net/wiki/doku.php?id=cracking_wpawpa2).

### John Pyrit y Cowpatty

John necesita el formato de entrada apropiado para su versión y conversor; no basta con renombrar una captura. Pyrit y Cowpatty también aparecen en los apuntes para analizar capturas y probar candidatos.

```bash
# Revisar una captura con Pyrit, si está disponible.
pyrit -r captura-01.cap analyze

# Prueba de diccionario con Cowpatty.
cowpatty -r captura-01.cap -f diccionario.txt -s '<ESSID>'
```

La compatibilidad con controladores, cifrados y formatos debe verificarse en la versión instalada. Una cifra de rendimiento obtenida en una máquina no representa una velocidad universal de recuperación.

## Precomputación de PMK

En WPA/WPA2-Personal, el SSID forma parte de la derivación de la PMK desde la contraseña. Precalcular candidatos puede ahorrar trabajo cuando se reutiliza el mismo SSID, pero tiene un coste de cálculo y almacenamiento.

Las bases de PMK de Airolib-ng, Genpmk o herramientas similares no deben confundirse automáticamente con una rainbow table genérica. Cambiar el SSID cambia la derivación, por lo que una tabla preparada para otra red puede no servir.

```bash
# Preparar las listas de candidatos y SSID antes de importar.
airolib-ng wifi.db --import essid essids.txt
airolib-ng wifi.db --import passwd diccionario.txt
airolib-ng wifi.db --clean all
airolib-ng wifi.db --batch

# Usar la base precomputada con una captura compatible.
aircrack-ng -r wifi.db captura-01.cap
```

La utilidad de esa precomputación depende del número de candidatos, SSID y capturas. No cambia la entropía de una contraseña que no se ha incluido entre los candidatos. Referencia: [Airolib-ng](https://www.aircrack-ng.org/doku.php?id=airolib-ng).

## Bettercap y redes sin clientes visibles

Bettercap reúne reconocimiento y otras funciones WiFi bajo un mismo módulo. Las operaciones de observación pueden consultarse desde su sesión interactiva:

```bash
sudo bettercap -iface wlan0mon
```

```text
wifi.recon on
wifi.show
wifi.recon off
```

Debe distinguirse el reconocimiento de las acciones de asociación o desautenticación: estas últimas generan tráfico. No es correcto asumir que una orden global de asociación obtendrá el handshake de todas las redes. Referencia: [módulo WiFi de Bettercap](https://www.bettercap.org/modules/wifi/).

En determinados AP puede obtenerse material **PMKID** sin esperar a observar a un cliente ya conectado. Es un mecanismo distinto al four-way handshake y no está disponible de la misma forma en todas las configuraciones. La captura activa con hcxdumptool depende de la versión, el adaptador y las características del AP; un comando antiguo no garantiza el mismo comportamiento en una versión actual.

## Otras tramas y técnicas de interrupción

Los apuntes también recogen técnicas que conviene separar de la recuperación offline de una PSK:

| Técnica | Qué intenta alterar | Límite de la interpretación |
|---|---|---|
| Falsa autenticación | Autenticación y asociación en determinados escenarios WEP | No sustituye conocer una PSK WPA/WPA2 |
| CTS con duración manipulada | Reserva del medio y disponibilidad | No revela una clave ni garantiza una reconexión capturable |
| Beacon flooding | Anuncios de redes mediante tramas de gestión | Su efecto depende del cliente, AP e implementación |
| Disassociation flooding | Continuidad de las asociaciones | Es una prueba de interrupción, no una recuperación de clave |
| Michael MIC countermeasures | Comportamiento de protección de TKIP | Es específico de TKIP; no significa apagar físicamente cualquier router |

La [falsa autenticación documentada por Aircrack-ng](https://www.aircrack-ng.org/doku.php?id=fake_authentication) pertenece a escenarios WEP. Aplicar ese nombre a WPA/WPA2 puede llevar a confundir asociación con haber superado la autenticación de la red.

Una desconexión de un dispositivo, incluido un terminal de pago, demuestra impacto en disponibilidad. No demuestra acceso al dispositivo, a sus transacciones ni a su clave.

## Descifrar la capa WiFi no elimina HTTPS

Con una captura adecuada, la PSK correcta y el material de establecimiento de claves de la sesión, Airdecap-ng puede producir una captura descifrada de WPA/WPA2-PSK:

```bash
airdecap-ng -e '<ESSID>' -p '<PSK>' captura-01.cap
```

Conocer la PSK no garantiza descifrar todas las sesiones históricas si falta el intercambio necesario. El archivo de salida suele terminar en `-dec.cap`. Referencia: [Airdecap-ng](https://www.aircrack-ng.org/doku.php?id=airdecap-ng).

El resultado elimina una capa de protección, no todas. El contenido HTTP puede quedar visible; el contenido HTTPS sigue protegido por TLS. La visibilidad de DNS y otros metadatos también depende de si se han usado protocolos cifrados para ellos.

## ARP spoofing y análisis del tráfico local

ARP spoofing intenta modificar la asociación entre IP y MAC que mantienen otros equipos de una red IPv4. Puede situar al operador en el camino del tráfico entre un cliente y su puerta de enlace, si el entorno lo permite.

No es un ataque exclusivo de WiFi: actúa después de disponer de acceso a la red local. También debe distinguirse de DNS spoofing, que intenta alterar las respuestas de resolución de nombres.

Reenviar el tráfico evita que el intermediario corte la comunicación por no encaminar los paquetes. Eso no exige borrar todas las reglas del firewall. Los cambios deben limitarse al flujo evaluado y revertirse a su estado anterior; un vaciado global de reglas puede afectar a servicios ajenos al análisis.

La posición de intermediario no elimina por sí sola TLS. La observación de un dominio o conexión no equivale a leer el contenido de cada petición HTTPS.

## Inspección HTTPS con un proxy de confianza

En una inspección configurada con mitmproxy, el cliente se configura para usar el proxy y confiar en su CA. El proxy establece una conexión TLS con el cliente y otra con el servidor, lo que permite inspeccionar los datos entre ambas conexiones.

No se está descifrando una captura TLS arbitraria solo por estar en la misma red. El resultado depende de la confianza del cliente, de qué aplicaciones usan el proxy y de controles como certificate pinning. La CA no es una excepción que todas las aplicaciones acepten automáticamente. Referencia: [certificados en mitmproxy](https://docs.mitmproxy.org/stable/concepts/certificates/).

Al terminar, hay que retirar del dispositivo de prueba la confianza añadida y restaurar su configuración de proxy.

## Evil Twin y portales falsos

Un **Evil Twin** imita características de una red legítima para atraer conexiones a un AP controlado. El SSID es un nombre, no una prueba suficiente de identidad del punto de acceso.

En los apuntes, la arquitectura combina un AP, una interfaz para los clientes, DHCP, un servidor web y reglas de encaminamiento o redirección. Cada componente tiene una función distinta:

| Componente | Función |
|---|---|
| AP | Anunciar la red y gestionar la conexión inalámbrica |
| DHCP | Asignar una dirección y parámetros de red a los clientes |
| Encaminamiento | Llevar tráfico entre las interfaces correspondientes |
| Portal web | Presentar el contenido que verá el usuario |
| Reglas de redirección | Enviar determinados flujos al servicio local |

Un portal que pide la contraseña de la red es **ingeniería social**. No demuestra que el AP haya recuperado criptográficamente la PSK. Una red WPA2 no acepta a un cliente simplemente porque otro AP anuncie el mismo SSID: también intervienen el modo de seguridad y la autenticación.

Una redirección de HTTP no permite suplantar sin más un destino HTTPS válido. Los certificados, HSTS y la validación del cliente siguen siendo relevantes. Del mismo modo, las técnicas de sustitución de imágenes HTTP de herramientas antiguas no implican poder modificar una sesión HTTPS correctamente validada.

## WPS

**Wi-Fi Protected Setup** facilita el alta de dispositivos. El método de botón y el método PIN son mecanismos distintos: el botón no consiste en introducir un PIN.

Los ataques al método PIN dependen de la implementación, de los bloqueos o limitaciones de intentos y de posibles debilidades del dispositivo. Que un AP anuncie WPS no garantiza que cualquier herramienta pueda recuperar su clave ni que disponga de un PIN genérico válido.

Entre las medidas de protección están deshabilitar la inscripción por PIN cuando no se necesita, mantener el firmware y utilizar una configuración de autenticación adecuada. Una PSK robusta no corrige por sí sola un mecanismo alternativo de inscripción vulnerable.

## Restaurar el entorno

Al terminar una captura, primero se detienen las herramientas y después se devuelve la interfaz a su función habitual:

```bash
sudo airmon-ng stop wlan0mon
sudo systemctl restart NetworkManager

# Comprobar el estado y el nombre actual de la interfaz.
iw dev
ip link
```

Los servicios y nombres dependen de la distribución. Si se cambió la MAC, el reenvío IP, las rutas, el firewall, un proxy o una CA de confianza, se restaura cada cambio conforme al estado que había antes de la prueba.

Las capturas y el material recuperado pueden contener identificadores y datos sensibles. Conviene conservar solo las evidencias necesarias y separar su almacenamiento del contenido que se publica en el artículo.
