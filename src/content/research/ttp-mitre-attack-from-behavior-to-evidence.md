---
title: "Understanding TTPs and MITRE ATT&CK"
description: "Tactics explain the objective, techniques describe the behavior, and procedures describe its implementation. Understanding MITRE ATT&CK helps connect red-team actions to evidence, distinguish activity from detection and response, and write an attack narrative that supports concrete defensive improvements."
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

Running a tool and understanding an adversary behavior are different skills. A command shows one implementation; it does not, on its own, explain the objective, access required, what defenders could observe, or whether a control worked.

Studying red teaming means learning to connect those layers. Tactics, techniques, and procedures provide a vocabulary for the behavior. An engagement narrative connects that behavior to evidence and to the organization's ability to prevent, detect, investigate, and respond.

## Tactics techniques and procedures describe different levels


| Level | Question | Example |
|---|---|---|
| Tactic | What objective is the adversary pursuing? | Credential Access |
| Technique | What behavior serves that objective? | OS Credential Dumping |
| Sub-technique | Which more specific behavior is involved? | DCSync |
| Procedure | How is the behavior implemented in this instance? | A particular identity requests account secrets through the directory replication interface from a recorded source host |

A procedure is more than a command name. It can include the account, prerequisites, host, tool invocation, timing, target, output, and evidence of success. Different tools can implement similar behavior, and one tool can support several techniques.

MITRE describes ATT&CK as a knowledge base of adversary behavior. Its [FAQ](https://attack.mitre.org/resources/faq/) and [getting-started guidance](https://attack.mitre.org/resources/) are useful starting points. The matrix is a way to organize that knowledge; it is not a requirement to perform every technique or a linear sequence an attacker must follow.

## Map the behavior rather than the tool name


Consider the distinction between using PowerShell, obtaining credential material, and reusing it:

| Observation | Candidate mapping | What the observation does not establish |
|---|---|---|
| PowerShell executes a script | [T1059.001 PowerShell](https://attack.mitre.org/techniques/T1059/001/) | That the script dumped credentials or established persistence |
| A principal requests account secrets through AD replication | [T1003.006 DCSync](https://attack.mitre.org/techniques/T1003/006/) | That those secrets were later used successfully |
| An acquired Kerberos ticket is reused for authentication | [T1550.003 Pass the Ticket](https://attack.mitre.org/techniques/T1550/003/) | That the ticket was forged or that the account had administrator rights |
| An account uses a remote SMB share | [T1021.002 SMB/Windows Admin Shares](https://attack.mitre.org/techniques/T1021/002/) when the behavior and context fit | That code executed on the destination |

A `klist` output demonstrates a cache state. It does not reveal the entire acquisition history of every ticket. Similarly, a network logon is not sufficient by itself to conclude that Pass the Ticket occurred: normal Kerberos authentication can produce network logons too.

These distinctions matter in both directions. Operators should not overstate an attack outcome, and analysts should not attribute a specific technique from an artifact that has several plausible explanations.

## Define the objective and engagement model

Red teaming evaluates people, processes, and technology against a relevant adversarial objective. It is not a review of every reachable host, nor does obtaining an administrative account automatically explain whether the assessment met its purpose.

Planning should establish the threat profile, the operational objective, and how initial access will be obtained. A threat profile describes intent, capabilities and relevant behaviors. It should reflect the organization rather than assuming that every assessment must emulate the most capable threat actor.

The breach model also changes what the assessment measures. An assumed-breach engagement starts from supplied access and can focus on internal detection and response. It does not establish whether initial compromise would have succeeded. If initial access is part of the engagement, an agreed fallback can preserve time for evaluating later behaviors.

Rules of engagement define the allowed systems and identities, constraints, stop conditions, contacts, timing, and treatment of evidence. Notification decisions should be explicit: who knows about the assessment can affect defender behavior and the interpretation of the results.

## Procedures connect behavior to evidence

A procedure describes the specific implementation of a technique. Useful details include the identity and privileges used, source host, target, timestamp, tool and arguments, prerequisites, and observed result.

The source of each observation matters. An operator's command history records an action from the operator's perspective. An endpoint event or server audit provides another observation. Neither should silently stand in for the other.

A tool returning success may establish only that a local operation completed. Importing a ticket, for example, establishes a cache change; successful access to a remote resource requires additional authentication and authorization evidence. The [Pass the Ticket cheatsheet](/cheatsheets/pass-the-ticket-cobalt-cheatsheet/) contains the implementation alternatives, while the ATT&CK mapping should describe the behavior they implement.

Only map what the evidence supports. A tool capable of credential dumping is not proof that credentials were dumped, and accessing a share is not proof of remote code execution.

## Measure visibility detection and response separately

| Question | Relevant evidence |
|---|---|
| Was the action performed? | Operator record and observed result |
| Was telemetry collected? | Corresponding event present in the logging pipeline |
| Was an alert generated? | Alert record, triggering evidence and timestamp |
| Was the activity investigated? | Analyst or case activity |
| Was a response applied? | Confirmed action against the identity, host or access path |
| Did the response meet the objective? | Evidence that the action was prevented or interrupted as intended |

A timestamp for analyst triage is not necessarily the detection timestamp. A collected event is not necessarily an alert, and an alert is not necessarily containment. Calculate response metrics only when the relevant start and end events are available.

“The red team observed no response” and “the SOC detected nothing” are different statements. Defender feedback can reveal alerts, investigations, or actions that the operator could not see. The final assessment should reconcile both perspectives.

## Use attack lifecycles for narrative and ATT&CK for behavior


The Cyber Kill Chain and other attack-lifecycle models help explain the progression of an intrusion. ATT&CK helps describe individual behaviors that may recur, overlap, or serve more than one objective.

An assessment can loop through discovery and credential use several times, fail on one path, and switch to another. Forcing every observation into a neat one-pass sequence can hide that reasoning. Likewise, an assumed-breach exercise starts after some initial phases; those phases should be marked out of scope rather than reported as successfully tested.

Reconnaissance and preparation can also produce observable evidence through mail controls, public-service monitoring, domain activity, or intelligence sources. “It happened outside the target host” does not mean there is nothing defenders can learn from it.

## Keep OPSEC tied to the environment

Operational security concerns how activity can be observed, interpreted, and interrupted. It is relative to the environment and defender capability. A different implementation can change process creation, file artifacts, or logging while leaving the underlying network behavior visible.

Importing a ticket through a BOF rather than an external executable does not eliminate subsequent Kerberos authentication or target access logs. An “OPSEC alternative” is an implementation choice to evaluate, not a universal stealth property.

Record what an implementation changes and which observations remain available. This makes a discussion of detection more useful than declaring a tool inherently undetectable.

## Write a narrative that supports improvement

An attack narrative should connect observations chronologically: the starting access, the actions taken, the boundaries crossed, their outcomes, and the response observed. Include relevant technical evidence without assuming the reader knows the operator's tools.

A list of CVEs and patches can document technical issues, but it does not explain the full path through people, processes and technology. Conversely, an ATT&CK technique list does not establish whether a vulnerability existed or a defensive control failed.

Recommendations should follow the identified gap and specify how improvement can be verified. Missing telemetry, a rule that did not alert, delayed investigation, and ineffective containment require different responses. Discuss the findings with defenders before treating the operator's view as the complete explanation.

## Review the mapping

Before treating an ATT&CK mapping as complete, I ask:

- Does the evidence show the behavior, or only a tool capable of it?
- Is the label a tactic, technique, sub-technique, or procedure description?
- Does a sub-technique fit more precisely than its parent?
- Which source supports the identity, action, target, and outcome?
- Have operator records been separated from independently collected telemetry?
- Are detection and containment claims supported by their corresponding events?
- What evidence would demonstrate that the recommendation worked?

A matrix cell helps communicate where an assessment looked. The narrative and evidence explain what it established.

Cover image: [Cyber Attack Kill Chain, E-SPIN](https://www.e-spincorp.com/wp-content/uploads/2020/05/cyber-attack-kill-chain.jpg).
