---
title: "Defence Evasion (Cobalt Edition)"
description: "A consolidated reference for Cobalt Strike artifacts, script inspection, Beacon memory and command behavior, with OPSEC considerations, telemetry checks and a practical validation checklist."
category: "Defence Evasion"
tools: ["Cobalt Strike", "PowerShell", "Sysmon", "Microsoft Defender", "System Informer"]
updated: 2026-11-12
tags: ["cobalt-strike", "opsec", "memory", "amsi", "detection"]
draft: false
---

## 1. Detection surfaces and OPSEC

Detection can occur before execution, during loading or after Beacon starts performing tasks. File signatures, script content, memory characteristics and behavior are complementary sources of evidence. Changing one representation does not remove the others.

OPSEC: record the command, identity, host and resulting changes. No command family guarantees an absence of telemetry.

| Surface | Examples of observable evidence | Assessment question |
|---|---|---|
| Compiled artifact | File hash, PE metadata, imports, service image | Which exact file and architecture were tested? |
| Script artifact | Script content, interpreter activity, AMSI inspection | Was only the stored text examined, or also runtime behavior? |
| Beacon memory | Executable regions, permissions, PE structures, threads | What differs from the process's normal memory layout? |
| Post-exploitation | Child processes, process access, named pipes, module loads | Which implementation does the selected command actually use? |
| Network | DNS, connections, destinations, timing, authentication | Does the evidence agree with the host timeline? |
| Services and remote execution | Service configuration, executable path, remote logon | Which local and remote systems retain evidence? |

A single result is bounded by the tested file, product configuration, security intelligence version and execution path. Neither an absent alert nor a successful task establishes that an activity is undetectable.

## 2. Artifact Kit, Resource Kit and Malleable C2

These components affect different parts of the execution chain. Keep their versions and outputs separate when documenting a example.

| Component | Role | Evidence to retain |
|---|---|---|
| Artifact Kit | Source/templates for executable, DLL and service wrappers | Source revision, build metadata and hashes of generated files |
| Resource Kit | Script templates and delivery resources | Template revision, generated script and delivery-time content |
| Malleable C2 profile | Configuration for communications and supported runtime behavior | Profile hash, server version and loaded configuration |
| Aggressor scripts | Client extensions and hooks | Script names, revisions and load state |
| Beacon command implementation | Code path used for an individual task | Command, version, architecture and observed effects |

An artifact wrapper prepares and launches embedded Beacon material. Beacon's loader then maps the payload, resolves imports and relocations, and transfers execution. File, loader and runtime observations therefore describe different stages.

### Compiled artifact naming

| Name component | Template meaning |
|---|---|
| `32` / `64` | Target architecture |
| `big` | Stageless template variant |
| `svc` | Service executable variant |
| EXE / DLL | Entry-point and loading model |

The source layout includes executable, service and DLL entry points, plus shared loading logic. A change to an EXE wrapper does not automatically change every script, DLL, service or already running Beacon.

### Source layout and build inputs

| Component | Files or directories | Purpose |
|---|---|---|
| Artifact Kit entry points | `src-main/main.c`, `svcmain.c`, `dllmain.c` | Executable, service and DLL entry points |
| Artifact Kit shared implementation | `src-common`, `patch.c`, `injector.c`, `start_thread.c` | Shared payload preparation and execution implementation |
| Artifact Kit client integration | `artifact.cna` | Selects the generated artifact templates in the client |
| Resource Kit templates | `template.x64.ps1`, `template.x86.ps1` and other format templates | Architecture- and format-specific script resources |
| Resource Kit delivery wrapper | `compress.ps1` | Represents compressed template content for delivery |
| Resource Kit client integration | `resources.cna` | Connects generated resources to the client |
| Malleable configuration | `.profile` file | Team-server configuration; separate from both kit builds |

Build scripts and their positional arguments are version-specific. The installed kit's README and script define the supported inputs. A stage-size constant copied from a different version is not a universal value. Windows paths and their WSL `/mnt/c/` equivalents refer to the same files, but their quoting and separators differ.

Inspect the installed source tree from its kit directory before documenting a build:

```bash
# Read the build requirements and supported arguments
rg --files -g '*README*' -g 'build.sh' -g '*.cna'
rg -n 'usage|Usage|mingw|compiler|architecture|output' README* build.sh

# Check shell syntax without building or executing a payload
bash -n ./build.sh
```

Shell syntax validation does not verify the compiler toolchain, C code, generated templates or runtime behavior. Record these separately.

### Configuration and output lifecycle

| Change | What must be checked afterwards |
|---|---|
| Kit source revision | Build requirements, generated output directory and exact output hashes |
| Client integration script | Which `.cna` is loaded and which output directory it references |
| Resource template | Whether a generated script actually uses that template revision |
| Profile revision | Whether the intended team server loaded that exact profile |
| Generated artifact revision | Whether the file being examined was regenerated after the relevant changes |

In the client, **Cobalt Strike → Script Manager** identifies loaded integration scripts, while **Cobalt Strike → Malleable C2 Profile** exposes the loaded profile. Loading a client script and changing a team-server profile are separate actions. Neither retroactively changes files already generated or proves that an existing session uses the new settings.

### Practical artifact inventory

Run locally in PowerShell. Set the path to the actual exercise output directory.

```powershell
$artifactRoot = 'C:\Payloads'

# Record filenames, sizes and timestamps before comparing results
Get-ChildItem -LiteralPath $artifactRoot -File |
    Select-Object Name, Length, LastWriteTimeUtc

# Identify the exact bytes associated with each observation
Get-ChildItem -LiteralPath $artifactRoot -File |
    Get-FileHash -Algorithm SHA256

# Inspect signature state independently from antivirus findings
Get-ChildItem -LiteralPath $artifactRoot -File |
    ForEach-Object { Get-AuthenticodeSignature -LiteralPath $_.FullName } |
    Select-Object Path, Status
```

A valid signature is an identity/integrity signal, not proof of benign behavior. A hash identifies file content; it does not identify the memory state of a running process.

## 3. Script artifacts, AMSI and runtime evaluation

AMSI is an interface through which participating applications submit content to an antimalware provider. It is distinct from PowerShell logging and from scanning a file on disk.

PowerShell can construct or evaluate content dynamically. The stored script, decoded content and subsequently executed code may therefore differ. A file-oriented check does not reproduce every runtime inspection point. Base64 and compression change representation; they do not establish trust or safety.

| Layer | What it can establish | What it cannot establish alone |
|---|---|---|
| File-oriented inspection | Result for supplied bytes under a particular engine/configuration | All later decoded or evaluated content |
| AMSI inspection | Provider assessment of content submitted by the application | Complete visibility into every process or execution mechanism |
| Script Block Logging | Script-block evidence when supported and enabled | Universal logging without policy and host support |
| Endpoint process telemetry | Interpreter launches and related behavior | Full script content in every case |

A stageless PowerShell template and its compressed delivery wrapper are different representations. Preserve both when correlating results. ThreatCheck locates a detection boundary in supplied input; its result is not a certification of runtime behavior.

Inspect which PowerShell event channels exist on the host:

```powershell
# Windows PowerShell and PowerShell 7 use different operational channels
Get-WinEvent -ListLog '*PowerShell*' |
    Select-Object LogName, IsEnabled, RecordCount

# Query a known exercise interval in Windows PowerShell's channel
$since = (Get-Date).AddHours(-1)
Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-PowerShell/Operational'
    Id = 4104
    StartTime = $since
} -MaxEvents 100 |
    Select-Object TimeCreated, Id, Message
```

For PowerShell 7, query the available `PowerShellCore/Operational` channel instead. Missing events may mean the relevant logging was unavailable, disabled, filtered or outside retention. See [Microsoft's PowerShell logging documentation](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_logging_windows).

## 4. Beacon memory: what to examine

Memory inspection complements artifact analysis. Writable/executable allocations, PE structures, module association and recognizable strings are separate characteristics. None is a standalone verdict.

| Observation | Why it matters | Important limitation |
|---|---|---|
| RWX memory | A region is simultaneously writable and executable | JIT runtimes and legitimate software can also use dynamic executable memory |
| Private executable memory | Executable pages may lack an ordinary image mapping | Some legitimate applications also generate code dynamically |
| PE structures in memory | Can reveal a mapped or manually loaded executable image | Their absence does not prove executable memory is benign |
| Image-backed executable pages | Suggest association with a mapped module | Association alone does not prove the pages match the disk image |
| Embedded strings | Can connect memory to a family or component | A changed or missing string does not eliminate behavioral evidence |
| Thread information | Start location, owning process and related activity provide context | A plausible address alone does not prove legitimate execution |

In System Informer or an equivalent inspection tool, correlate the process, region type, protection, mapped file and thread information. Inspection permissions and tool behavior affect visibility. Avoid treating every unsigned region or unusual string as proof of compromise.

Module stomping and string transformations affect different aspects of an image. Compare the claimed module identity with memory content and observed execution. Preserve protocol strings and application behavior when assessing whether a test artifact still functions; a crash or broken workflow is not a successful detection result.

## 5. Beacon commands: behavior and OPSEC

### Housekeeping commands

Configure Beacon or manage client/session state. Some are client-side; others create tasks or affect later activity. This is not a “zero OPSEC cost” category.

| Command | Purpose | OPSEC consideration |
|---|---|---|
| `help` / `help <command>` | Display available commands or command help | Check installed syntax before relying on examples |
| `checkin` | Request a Beacon check-in | Can affect communication timing |
| `sleep <seconds> [jitter]` | Set callback interval and jitter | Changes communication behavior; does not remove network evidence |
| `clear` | Clear pending Beacon tasks | Does not erase endpoint events or completed activity |
| `downloads` | Display tracked downloads | A client listing is separate from the transfer itself |
| `cancel <download>` | Cancel a tracked download | Does not undo data already transferred |
| `jobs` | List post-exploitation jobs | A listed job may be operating in another process |
| `note <text>` | Add an operator annotation | Records context; does not change the endpoint identity |
| `powershell-import` | Import a script for later PowerShell use | Import state and later execution are different stages |
| `ppid` | Configure parent-process attribution for supported operations | Not a universal setting for all process-creation paths |
| `spawnto` | Configure the temporary process used by supported operations | Does not govern every service or existing-process workflow |
| `windows_error_code <number>` | Explain a Windows error | An error description does not identify the blocking component |

```shell
# Inspect command support and current task state
help
help clear
help downloads
jobs
downloads

# Decode the error without attributing it to a particular security product
windows_error_code 5
# ERROR_ACCESS_DENIED: investigate permissions, policy and security events
```

### API-only commands

Built-in operations that use Windows APIs rather than requiring a command interpreter for the operation itself. Their effects can still be visible to endpoint and network monitoring.

| Command | Purpose | Observable effects |
|---|---|---|
| `pwd` | Display the working directory | Queries process state |
| `cd <path>` | Change the working directory | Changes context for later relative paths |
| `ls [path]` | List files or directories | Filesystem access; a UNC path can involve remote authentication |
| `download <path>` | Transfer a target file to the operator's infrastructure | File reads and data transfer |
| `upload <path>` | Transfer a local file to the target | File writes and data transfer |
| `getuid` | Report the effective identity | Identity query; does not prove access to a resource |
| `ps` | List processes | Process enumeration |
| `make_token` | Create and impersonate an alternate network context | Logon/authentication state changes |
| `steal_token` | Impersonate an accessible process token | Process/token access |
| `rev2self` | End current token impersonation | Returns to the original context; does not purge tickets |
| `kill <PID>` | Terminate a process | Process termination and possible application disruption |
| `exit` | End the Beacon session | Session termination; earlier evidence remains |

```shell
# Basic context inspection in Beacon
getuid
pwd
ps
ls

# Inspect supported syntax without performing file transfers or token changes
help download
help upload
help make_token
help steal_token
```

### Inline commands: BOFs

A Beacon Object File is compiled native code executed within a Beacon session. Classify both the execution container and the action performed: an inline command can still create a service, access another process or communicate remotely.

| Command or family | Function | OPSEC consideration |
|---|---|---|
| `reg query` / `reg queryv` | Read registry data | Registry access remains observable |
| `kerberos_ticket_use` | Import a Kerberos ticket | Changes a logon session's ticket cache |
| `kerberos_ticket_purge` | Clear the selected session's tickets | Can disrupt authentication if the wrong session is selected |
| `clipboard` | Clipboard-related collection | Sensitive data access; behavior depends on implementation |
| `getsystem` | Attempt a SYSTEM context transition | Privilege-related activity; success is context-dependent |
| `jump psexec` family | Service-backed remote execution | Inline implementation does not remove service or remote-host evidence |
| `runasadmin` family | Administrative-context operations | Token/process activity and policy-dependent behavior |

```shell
# Inspect the installed registry and ticket commands
help reg
help kerberos_ticket_use
help kerberos_ticket_purge
```

**OPSEC:** “BOF” does not mean “no threads” or “no child processes.” The BOF's own implementation determines which APIs it invokes. In-process execution is a location, not an assurance of low visibility.

### Fork-and-run and explicit-process jobs

Fork-and-run creates a temporary process and executes a post-exploitation component there. Explicit-process variants target an already existing process. Both can involve process access, executable memory and result channels.

| Command | Execution pattern | Function |
|---|---|---|
| `execute-assembly` | Fork-and-run | Execute a .NET assembly |
| `powerpick` | Fork-and-run | Execute PowerShell through a runspace |
| `psinject` | Explicit process | Run PowerShell in a selected process |
| `portscan` | Spawn or explicit-process variant | Port discovery |
| `mimikatz` | Spawn or explicit-process variant | Credential/security operations |
| `keylogger` | Spawn or explicit-process variant | Keystroke collection |
| `printscreen` / `desktop` | Spawn or explicit-process variant | Screen capture / desktop interaction |

```shell
# Check installed argument support and track existing jobs
help execute-assembly
help powerpick
help psinject
jobs
```

**OPSEC:** account for the host process, component, thread activity and IPC separately. A command can avoid launching `powershell.exe` while still executing PowerShell content. A tasking message is not proof of successful execution or of an absence of detection.

### Process execution commands

| Command | Behavior | Result and evidence |
|---|---|---|
| `execute` | Launch a program | Does not return ordinary command output |
| `run` | Launch a program and return output | New process and command line |
| `runas` | Launch with alternate credentials | New process plus authentication context |
| `runu` | Launch using the specified process context/parent mechanism | Check the installed command's requirements and behavior |
| `shell` | Execute through `cmd.exe` | Interpreter process and `/c` command line |
| `powershell` | Execute through `powershell.exe` | Interpreter, arguments and script/runtime evidence |

```shell
# Benign comparison of execution paths
run whoami
shell whoami
powershell $PSVersionTable.PSVersion
# Compare process events and interpreter activity, not just displayed output
```

`run whoami` and `shell whoami` can return similar text through different process paths. The output alone does not describe what executed on the endpoint.

### Service creation commands

| Command family | Function | Effects to account for |
|---|---|---|
| `elevate svc-exe` | Service-based local context transition | Service configuration, process creation and image path |
| `jump psexec`, `psexec64`, `psexec_psh` | Service-based remote execution | Remote authentication, service activity and target execution |
| `remote-exec psexec` | Remote command through a service | Service and process activity on the destination |

**OPSEC:** service workflows have their own executable and process behavior. Do not assume the temporary-process setting for ordinary post-exploitation jobs governs service executables. Inspect both source and destination evidence.

### Quick classification

```text
help / jobs / note         → session and client management
pwd / ls / getuid / ps     → native/API-oriented operations
reg query / ticket import → inline capability plus its actual action
execute-assembly          → post-exploitation job in a separate process
psinject                  → post-exploitation in an existing process
run                       → new executable process
shell                     → cmd.exe plus the requested command
powershell                → powershell.exe plus script/runtime activity
psexec family             → remote authentication, service and execution
```

Implementation and extension behavior vary by version. Confirm the installed behavior with the [Cobalt Strike command reference](https://hstechdocs.helpsystems.com/manuals/cobaltstrike/current/userguide/content/topics/appendix-a_beacon-opsec-considerations.htm).

## 6. Process trees, command lines and access-denied results

A process's normal role may be inconsistent with its children or network activity. Examine the full relationship rather than relying on one process name. Parent attribution and sacrificial-process selection do not erase underlying execution activity.

```powershell
# Current snapshot: executable, command line and reported parent PID
Get-CimInstance Win32_Process |
    Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine

# Services provide a separate execution and persistence surface
Get-CimInstance Win32_Service |
    Select-Object Name, State, StartName, PathName, ProcessId
```

Some properties require additional permissions. PIDs can be reused, and the parent may have exited before this snapshot. Correlate with historical process events and timestamps.

Windows provides process-notification callbacks with information including image name, command line and creation status. A registered component can reject process creation. However, error 5 or `ERROR_ACCESS_DENIED` alone does not establish that Defender blocked the action: permissions, policy and other protection mechanisms can also explain it. Confirm the cause with the corresponding event evidence. See [Microsoft's `PS_CREATE_NOTIFY_INFO` documentation](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_ps_create_notify_info).

## 7. Correlate endpoint telemetry

Availability depends on installation, audit policy and filtering. Sysmon does not record every memory operation or injection technique, and the absence of a particular event is not proof that the action did not occur.

| Source | Useful evidence |
|---|---|
| Defender Operational | Detection and action records; configuration changes |
| PowerShell Operational | Script-block content where supported and enabled |
| Sysmon 1 | Process creation and associated context |
| Sysmon 3 | Network connections, if configured |
| Sysmon 7 | Image loading, if configured |
| Sysmon 8 / 10 | Remote-thread creation / process access |
| Sysmon 17 / 18 | Named-pipe creation / connection |
| Sysmon 25 | Supported process-tampering detections |
| System 7045 | Service installation records |

Event definitions: [Sysmon documentation](https://learn.microsoft.com/en-au/sysinternals/downloads/sysmon). A detected threat and an action taken are separate observations in [Defender's event reference](https://learn.microsoft.com/en-us/defender-endpoint/troubleshoot-microsoft-defender-antivirus).

```powershell
$since = (Get-Date).AddHours(-1)

# Inspect protection state and intelligence version without changing settings
Get-MpComputerStatus |
    Select-Object AMServiceEnabled, AntivirusEnabled, RealTimeProtectionEnabled,
        AntivirusSignatureVersion, AntivirusSignatureLastUpdated

# Review active and historical detection records
Get-MpThreatDetection

# Defender: detection, action and configuration-change events
Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-Windows Defender/Operational'
    Id = 1116, 1117, 5007
    StartTime = $since
} -MaxEvents 100 |
    Select-Object TimeCreated, Id, Message

# Sysmon: query only if installed and the channel is available
Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-Sysmon/Operational'
    Id = 1, 3, 7, 8, 10, 17, 18, 25
    StartTime = $since
} -MaxEvents 200 |
    Select-Object TimeCreated, Id, Message

# Correlate service installation with the same time window
Get-WinEvent -FilterHashtable @{
    LogName = 'System'
    Id = 7045
    StartTime = $since
} -MaxEvents 50 |
    Select-Object TimeCreated, Id, Message
```

An event query returning no matching records differs from an unavailable channel or an access-denied error. Record which case occurred. Also distinguish the host's local event store from centrally retained EDR evidence.

## 8. Repeatable validation

Separate artifact, resource and profile layers when comparing execution paths. A connected Beacon cannot explain which individual change affected a detection.

| Example stage | Evidence required for a useful conclusion |
|---|---|
| Profile/configuration | Version, profile identity and confirmation of the configuration actually loaded |
| Compiled outputs | Exact file, architecture, hash and build revision |
| Script outputs | Template, wrapper and actual delivery-time script |
| Runtime | Host protection state, timestamps, process/memory observations and task result |
| Post-exploitation | Actual process/service/authentication mechanism on every involved host |
| Final comparison | Functional result and security observations recorded separately |

Use one documented comparison at a time. Keep a baseline and preserve the same host configuration when drawing conclusions. Note any restart or regeneration because it changes what is being compared.

Disabling a protection or tampering with AMSI invalidates a claim that the same enabled protections accepted an artifact. Record control state explicitly and distinguish disabled inspection from a control that remained active but produced no detection.

## 9. Troubleshooting

| Finding | Next evidence to collect |
|---|---|
| File check is clean but execution is detected | Runtime script content, process events and Defender action records |
| Profile change appears ineffective | Loaded profile identity, version and whether the running artifact predates the change |
| Script works locally but fails through delivery | Actual delivered content, interpreter/version and script/runtime errors |
| Task returns access denied | Identity, object permissions, policy and contemporaneous security events |
| Expected process is missing | Creation failure, process termination and historical process events |
| No event appears | Channel availability, audit configuration, filters, time range and retention |
| Beacon connects but a post-ex task fails | Task-specific implementation and dependency errors |
| Service-related behavior differs from other tasks | Service image/configuration and its distinct execution path |

## 10. Quick checklist

Run the PowerShell commands locally on the observation host with the required read permissions. Replace paths and select a time window covering the exercise. The checklist records evidence without changing security controls.

```text
BASELINE AND FILE IDENTITY
[ ] $since = (Get-Date).AddHours(-1)
[ ] Get-MpComputerStatus | Select-Object AntivirusEnabled, RealTimeProtectionEnabled, AntivirusSignatureVersion, AntivirusSignatureLastUpdated
[ ] Get-FileHash -LiteralPath 'C:\path\sample.exe' -Algorithm SHA256
[ ] Get-AuthenticodeSignature -LiteralPath 'C:\path\sample.exe'
[ ] Record product/tool version, architecture and configuration identity
[ ] Distinguish Artifact Kit, Resource Kit and profile changes

SCRIPT VISIBILITY
[ ] Get-WinEvent -ListLog '*PowerShell*' | Select-Object LogName, IsEnabled, RecordCount
[ ] Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; Id=4104; StartTime=$since} -MaxEvents 100
[ ] Use PowerShellCore/Operational instead when applicable and available
[ ] Separate stored script, delivered wrapper and runtime content

PROCESS, MEMORY AND SERVICE CONTEXT
[ ] Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CommandLine
[ ] Get-CimInstance Win32_Service | Select-Object Name, State, StartName, PathName, ProcessId
[ ] In the memory inspection tool, correlate regions, protections, mapped files and threads
[ ] Classify the actual task implementation; do not assume BOFs or native APIs are unmonitored
[ ] Correlate timestamps and historical identity because PIDs can be reused

DETECTION AND ACTION RECORDS
[ ] Get-MpThreatDetection
[ ] Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Windows Defender/Operational'; Id=1116,1117,5007; StartTime=$since} -MaxEvents 100
[ ] Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; Id=1,3,7,8,10,17,18,25; StartTime=$since} -MaxEvents 200
[ ] Get-WinEvent -FilterHashtable @{LogName='System'; Id=7045; StartTime=$since} -MaxEvents 50
[ ] Record unavailable channels and permission errors separately from empty query results

OPSEC REVIEW AND CONCLUSION
[ ] Record file writes, process creation/access, script execution, pipes and remote authentication
[ ] Include every host affected by a remote or service-based task
[ ] Distinguish observed success, observed detection and confirmed blocking
[ ] Confirm that protection state was unchanged during the comparison
[ ] Preserve evidence; ending a session does not remove its earlier telemetry
[ ] Describe the result within the exact tested versions and configuration
```

## Related references

- [Process injection](/cheatsheets/process-injection-cobalt-cheatsheet/)
- [Token impersonation](/cheatsheets/token-impersonation-cobalt-cheatsheet/)
