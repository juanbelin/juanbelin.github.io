---
title: "Understanding TTPs and MITRE ATT&CK"
description: "An introduction to MITRE ATT&CK and TTPs: what the knowledge base contains, how tactics, techniques, sub-techniques and procedures relate, how to read the matrix, and why this shared vocabulary matters for red teaming, threat intelligence and defense."
date: '2026-11-25'
image: https://www.e-spincorp.com/wp-content/uploads/2020/05/cyber-attack-kill-chain.jpg
categories:
  - Red Team
  - Blue Team
tags:
  - ttp
  - mitre-attack
  - crto
  - detection
  - reporting
---

Understanding an attack involves more than identifying the tool or vulnerability used. It also means explaining what the adversary wanted to achieve, which behavior helped achieve it, and how that behavior was carried out.

**TTPs** describe those different levels of activity. **MITRE ATT&CK** organizes adversary behaviors into a shared knowledge base so that operators, analysts, and defenders can discuss them consistently.

## What is MITRE ATT&CK

MITRE ATT&CK stands for **Adversarial Tactics, Techniques, and Common Knowledge**. It is a publicly accessible knowledge base that describes adversary behavior using observations of real attacks and published research. It is developed and maintained by MITRE.

Its purpose is to give security teams a common vocabulary for actions across an adversary's lifecycle. Instead of describing an incident only through a malware name, an IP address, or a particular exploit, teams can also describe the behaviors involved. The [official ATT&CK site](https://attack.mitre.org/) provides the matrix and the individual entries.

ATT&CK is a reference for understanding and organizing behavior. It is not a scanner, a tool that executes attacks, or a numerical security rating. It does not establish that an organization is secure simply because several techniques have been tested.

## What is a TTP

**TTP** stands for **tactic, technique, and procedure**; **TTPs** is the plural. The three terms describe related aspects of adversary activity at different levels of detail.

| Term | Main question | Level of description |
|---|---|---|
| Tactic | Why is the adversary taking this action? | The immediate objective |
| Technique | How does the adversary pursue that objective? | A category of behavior |
| Procedure | How is that behavior implemented in a particular instance? | The concrete implementation |

These terms are not interchangeable. A tactic is not a tool, a technique is not necessarily a vulnerability, and a procedure is not limited to a single command.

### Tactics describe the objective

A tactic expresses the purpose behind an action. **Credential Access**, for example, concerns obtaining authentication material. **Discovery** concerns learning about the environment. **Lateral Movement** concerns reaching other systems within it.

The tactic is the reason for the behavior, rather than its implementation. Obtaining credentials and using credentials are therefore different parts of the reasoning, even when they occur close together in an intrusion.

### Techniques describe the behavior

A technique describes a way to pursue a tactical objective. **OS Credential Dumping** is a technique associated with obtaining credential material from operating-system resources.

The technique remains meaningful across different tools. Two implementations can use different executables or APIs while still belonging to the same behavioral category. Conversely, a single tool can perform several techniques, so its name does not determine the mapping by itself.

### Procedures describe the implementation

A procedure captures the specific way a technique is performed. It can include the chosen tool, account, privileges, source system, target, configuration, and sequence of actions.

This is the level where implementation differences become important. Two procedures may pursue the same objective through the same technique while leaving different artifacts or depending on different prerequisites. ATT&CK technique pages include **Procedure Examples** connecting documented activity to the broader category. The [ATT&CK FAQ](https://attack.mitre.org/resources/faq/) explains the terminology.

## Where sub-techniques fit

A **sub-technique** narrows a technique into a more specific behavioral category. It is not simply another name for a procedure.

| Level | ATT&CK entry | Meaning |
|---|---|---|
| Tactic | Credential Access | The objective is to obtain credential material |
| Technique | [T1003 OS Credential Dumping](https://attack.mitre.org/techniques/T1003/) | The general category of operating-system credential extraction |
| Sub-technique | [T1003.006 DCSync](https://attack.mitre.org/techniques/T1003/006/) | Extraction through abuse of directory replication |
| Procedure | A documented implementation of DCSync | The particular tool, identity, systems and steps used |

DCSync names a specific behavior that can have multiple implementations. A command using one implementation is a procedure detail; it is not a new sub-technique merely because the command or tool differs.

## How the ATT&CK matrix is organized

The matrix groups techniques under tactics. Its columns represent tactical objectives, while the entries within them represent techniques. Where available, techniques can be expanded into sub-techniques.

The identifiers make references precise:

| Identifier form | What it identifies |
|---|---|
| `TA0006` | A tactic, in this case Credential Access |
| `T1003` | A technique, in this case OS Credential Dumping |
| `T1003.006` | A sub-technique, in this case DCSync |

A technique can relate to more than one tactic when it can serve different objectives. The matrix should therefore be read as an organization of behaviors, not a mandatory route from the first column to the last.

The matrix also evolves as ATT&CK changes. Names, relationships, and available entries should be checked against the relevant release rather than assuming that an older screenshot is a permanent specification.

## Enterprise Mobile and ICS

Different technology environments require different behavioral descriptions. ATT&CK provides matrices for:

- [Enterprise](https://attack.mitre.org/matrices/enterprise/), covering enterprise systems and environments such as endpoints, identity services, networks, and cloud platforms.
- [Mobile](https://attack.mitre.org/matrices/mobile/), focusing on mobile-device threats.
- [ICS](https://attack.mitre.org/matrices/ics/), focusing on industrial control systems.

The relevant matrix and platform matter. A technique described for one environment should not be assumed to apply unchanged to another.

## What a technique page contains

A technique page explains the behavior and links it to additional context. Depending on the entry, that includes supported platforms, related tactics, sub-techniques, procedure examples, mitigations, and defensive guidance.

The description establishes what the technique means. Procedure examples show documented implementations; they are not a claim that every adversary uses the same steps. Defensive guidance helps teams consider relevant observations and controls, but it must still be interpreted for their own environment.

Reading only the title can lead to incorrect mappings. The description, scope, and relationships help determine whether the observed behavior belongs to that entry.

## How ATT&CK differs from CVE CWE and CVSS

These references describe different things:

| Reference | Focus |
|---|---|
| CVE | A publicly recorded vulnerability |
| CWE | A class of weakness that can contribute to vulnerabilities |
| CVSS | Technical vulnerability severity under a versioned scoring model |
| ATT&CK | Adversary objectives and behaviors |

An adversary can exploit a CVE as part of an attack, but many ATT&CK behaviors do not require a software vulnerability. Using stolen credentials or abusing legitimate functionality may be sufficient.

This is why an ATT&CK technique should not receive a CVSS score merely because it appears in an assessment. A specific vulnerability finding can be scored; a behavioral category serves a different purpose. The [CVE CWE and CVSS post](/research/cve-cwe-cvss-from-finding-to-report/) explains those distinctions in more detail.

## ATT&CK and the Cyber Kill Chain

Attack-lifecycle models describe an intrusion's progression at a higher level. The Cyber Kill Chain, for instance, organizes activity into phases such as reconnaissance, delivery, exploitation, installation, command and control, and actions on objectives.

ATT&CK provides more detailed behavioral categories. The two perspectives can complement each other: one helps organize a narrative, while the other helps explain the actions within it.

Neither perspective requires every intrusion to follow an identical sequence. Discovery and credential use can recur; access attempts can fail; an adversary can change direction. A matrix should not force those events into a sequence unsupported by the actual activity.

The cover image illustrates an attack lifecycle. It is a lifecycle diagram, not the ATT&CK matrix.

![Cyber Attack Kill Chain, E-SPIN](https://www.e-spincorp.com/wp-content/uploads/2020/05/cyber-attack-kill-chain.jpg).


## Why TTPs matter to red and blue teams

For red teams, TTPs help describe the behaviors selected to emulate a relevant threat. A tool is an implementation choice within that plan; the underlying objective and behavior explain why it belongs there.

For blue teams, the same vocabulary helps organize analysis and discuss what defensive controls can observe or interrupt. Threat-intelligence teams can use it to compare reported behavior across incidents without relying solely on changing filenames, hashes, or infrastructure.

Shared labels improve communication, but they do not replace evidence. An entry marked as tested does not prove that all its procedures are detected. Different implementations and environmental conditions can produce different observations.

## Common misunderstandings

**A tool name is not a technique.** Its actual use determines the behavior being described.

**A sub-technique is not a procedure.** One is a more specific category; the other is a concrete implementation.

**The matrix is not a checklist of everything an attacker must do.** Actions depend on the objective, available access, and environment.

**A colored cell is not proof of complete defensive coverage.** Coverage claims need a defined scope and evidence of what was tested.

**A matching technique does not identify an attacker by itself.** Many actors and legitimate administrators can use similar mechanisms; attribution requires additional context.

The distinction I find most useful is to keep the levels separate: **the tactic explains the objective, the technique describes the behavior, and the procedure explains its implementation**. ATT&CK supplies the shared structure for discussing those behaviors.

