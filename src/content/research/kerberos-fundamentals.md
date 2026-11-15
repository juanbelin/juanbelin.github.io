---
title: 'How Kerberos Works: KDC, Tickets and SPNs'
description: 'Follow a Kerberos authentication in Active Directory step by step: preauthentication, TGTs, service tickets, SPNs, session keys and the PAC.'
date: '2026-11-14'
categories:
  - Tutorial
tags:
  - ad
  - kerberos
pin: false
---

## What Kerberos Solves

Imagine Anna signs in to her domain workstation and then opens a shared folder. She does not need to enter her password again to access the file server. Kerberos lets her computer prove her identity using **tickets** issued by an authority that both the client and the server trust.

Her password is not sent to the file server. In the password-based flow, the client uses a key derived from it to complete the initial authentication. From that point on, tickets and session keys allow the client to request other services without prompting for credentials again.

We will follow that journey within a single domain, from signing in to accessing a folder.

## The Participants

In our example, Anna belongs to `EXAMPLE.COM`, works from `ws01.example.com` and wants to open `\\files01.example.com\documents`.

| Component | Role |
| --- | --- |
| Client | The computer acting on Anna's behalf and managing her tickets. |
| Principal | An identity that Kerberos can authenticate: a user, computer or service. |
| Realm | The administrative scope of Kerberos; here, `EXAMPLE.COM`. |
| KDC | The authority that authenticates principals and issues tickets. In AD, it runs on domain controllers. |
| Service | The resource the client wants to authenticate to: here, SMB on the file server. |

The **Key Distribution Center (KDC)** has two main functions: the **Authentication Service (AS)** handles initial authentication, while the **Ticket-Granting Service (TGS)** issues tickets for services. These are KDC functions, not necessarily two separate servers to deploy.

The KDC uses the Active Directory database to look up identities and the cryptographic material associated with their accounts. This relationship between the KDC and the directory is part of the [Windows implementation of Kerberos](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview).

## TGTs and Service Tickets

The first ticket Anna obtains is a **Ticket-Granting Ticket (TGT)**. It lets her request tickets from the TGS without repeating the initial authentication. Its recipient is the domain's ticket-granting service, identified as `krbtgt/EXAMPLE.COM`.

To access SMB, she then needs a **service ticket**. This ticket is intended for the requested service: in our case, `cifs/files01.example.com`.

| | TGT | Service ticket |
| --- | --- | --- |
| Purpose | Request other tickets from the KDC. | Authenticate to the requested service. |
| Presented to | The KDC's TGS. | The server providing the service. |
| Key protecting its encrypted part | A key belonging to the domain's `krbtgt` account. | A key belonging to the account associated with the service. |
| Can the client decrypt that part? | No. | No. |

Although a service ticket is sometimes called a “TGS,” it helps to keep the terms separate: **TGS is the service that issues it**; `TGS-REQ` and `TGS-REP` are the exchange messages.

The client stores each ticket alongside its session key. It can carry and present the ticket without knowing the key that encrypts its contents.

## SPNs: Identifying the Right Service

A **Service Principal Name (SPN)** identifies a service instance and associates it with an account in Active Directory. The client can request a ticket for that service without knowing its account name.

Some common examples are:

| SPN | Service identified |
| --- | --- |
| `cifs/files01.example.com` | SMB access to the file server. |
| `HTTP/intranet.example.com` | A web service using Kerberos authentication. |
| `MSSQLSvc/sql01.example.com:1433` | A SQL Server instance on that host and port. |

The usual form is `class/host`, with a port or other components where appropriate. An SPN is neither a password nor a permission: it is the name used to locate the service's identity.

In AD, SPNs are registered in the relevant account's `servicePrincipalName` attribute. That account may be a computer account, such as `FILES01$`, or an account dedicated to running the service. The KDC uses this association to select the key that will protect the ticket.

A service can have several SPNs for its different access names, but a given SPN must identify only one account. Microsoft explains this relationship in its [Service Principal Names documentation](https://learn.microsoft.com/en-us/windows/win32/ad/service-principal-names).

## The Complete Flow

```text
Anna's client                   KDC                         SMB service
      |                          |                               |
      |-- AS-REQ --------------->|                               |
      |<-------------- AS-REP ---|                               |
      |   TGT + session key      |                               |
      |                          |                               |
      |-- TGS-REQ -------------->|                               |
      |<------------- TGS-REP ---|                               |
      |   CIFS service ticket    |                               |
      |   + session key          |                               |
      |                          |                               |
      |-- AP-REQ ------------------------------------------------>|
      |<----------------------------------------------- AP-REP ---|
      |                  If mutual authentication is requested   |
```

This diagram shows a flow with preauthentication already included in `AS-REQ`. If the client needs to discover the accepted mechanisms first, a `KDC_ERR_PREAUTH_REQUIRED` response may precede it.

### 1. AS-REQ and AS-REP: Obtaining the TGT

The client sends an **AS-REQ** to the KDC containing Anna's identity, the realm, the requested service—`krbtgt`—and options such as supported encryption types.

In the usual password-based preauthentication flow, it includes a timestamp encrypted with a key derived from Anna's password. The KDC uses the corresponding account key to verify this proof. **The entire request is not encrypted with the password**: messages contain both visible fields and protected parts.

After verifying preauthentication and the applicable account conditions, the KDC returns an **AS-REP** containing two important elements:

- The **TGT**, whose encrypted part is protected with a `krbtgt` key. It contains the client's identity, validity information and a client–TGS session key.
- An encrypted part for the **client**, containing another copy of that session key and response information. In this flow, Anna can recover it using her password-derived key.

The result is that the client and KDC can use the same session key. The client stores the TGT but does not decrypt the part protected by `krbtgt`.

### 2. TGS-REQ and TGS-REP: Obtaining the SMB Ticket

When Anna opens the folder, the client needs a ticket for `cifs/files01.example.com`. If it does not already have a valid one cached, it sends a **TGS-REQ** to the KDC with the requested SPN, its TGT and an **authenticator**.

The authenticator contains fresh information, such as a timestamp, and is encrypted with the client–TGS session key. It demonstrates that whoever presents the TGT also knows its session key.

The KDC decrypts the protected part of the TGT, recovers that key and validates the authenticator. It then locates the account associated with the SPN and issues a **TGS-REP** containing:

- A **service ticket**, protected with the key of the account providing SMB. It contains a new client–service session key.
- A protected part for the **client**, with another copy of that new key. In the basic case, it is protected with the client–TGS session key; if the request includes a subkey, that may be used instead.

Anna now has what she needs to authenticate to SMB. The KDC issuing that ticket does not mean she can read every folder on the server: the resource still needs to check her permissions.

### 3. AP-REQ and AP-REP: Authenticating to the Service

The client communicates directly with SMB and presents an **AP-REQ**: the service ticket and a new authenticator, this time protected with the client–service session key.

The server can decrypt the protected part of the ticket because it has its account key. It recovers the session key and checks the authenticator, identity and ticket validity.

If mutual authentication is requested, it returns an **AP-REP** protected with that session key. This also gives the client proof that the server knows the key corresponding to the ticket.

These messages are integrated into the application protocol; the user does not send them manually. The AS, TGS and AP exchanges are defined in the [Kerberos V5 specification](https://datatracker.ietf.org/doc/html/rfc4120#section-3).

## Which Key Is Used at Each Step?

A common source of confusion is that **the ticket and the response for the client are protected separately**. This table summarises the basic password-based flow:

| Protected element | Key used |
| --- | --- |
| Preauthentication timestamp | Anna's long-term key, derived from her password. |
| Encrypted part of the TGT | The `krbtgt` account key. |
| Encrypted AS-REP part intended for the client | Anna's key. |
| TGS-REQ authenticator | The client–TGS session key. |
| Encrypted part of the service ticket | The service account key. |
| Encrypted TGS-REP part intended for the client | The client–TGS session key or an exchange subkey. |
| AP-REQ authenticator and AP-REP response | The client–service session key. |

Long-term keys belong to accounts; session keys are generated for these exchanges. “Key” does not always mean “NTLM hash,” either: its derivation depends on the encryption type. This explanation follows the password-based flow; other initial authentication mechanisms exist.

## PAC: Identity and Authorisation Data

In Active Directory, tickets can carry a **Privilege Attribute Certificate (PAC)** containing information such as the user's SID and group memberships. The server uses this data to build the security context and evaluate the requested access.

After authenticating Anna, SMB checks the share and filesystem permissions. It can accept her identity and still return “access denied” if she lacks permission to open `documents`.

The PAC carries signatures used to verify its integrity and origin. Depending on the service and validation requirements, the domain controller may be involved; it should not be assumed that every access is handled without additional communication with it.

## Caching, Expiration and Time

Tickets have a validity period. The client can reuse a valid service ticket for new authentications to that service, generating the appropriate authenticators. If it needs another service, it uses the TGT to request another ticket.

A renewable TGT can be renewed within the limits of policy and its renewal period. The actual lifetime depends on domain configuration and issuance conditions; it is not a universal property of every Kerberos environment.

Timestamps, time limits and replay detection help prevent a captured request from being accepted again. This is why clocks need to remain synchronised within the permitted tolerance.

DNS matters too: it helps locate the KDC and resolve the names used to access services. An access name that does not match the expected SPN can cause authentication errors. Communication with the KDC uses port 88 over TCP or UDP; resource access then uses the service's protocol, such as SMB.

On Windows, `klist` displays the tickets in the current session:

```powershell
klist
```

When reviewing the cache, we can connect the `krbtgt` ticket to initial authentication and tickets for `cifs`, `HTTP` or other services to the resources used. Their names, encryption types and dates help connect what happens on the workstation with the flow described above.

## Back to Anna's Folder

Anna signs in and obtains a TGT with its session key. When she opens the folder, her computer requests a ticket for `cifs/files01.example.com` and receives another session key for communicating with SMB. It presents that ticket to the server, proves that it knows the key and, if requested, also verifies the service's identity.

The server then evaluates whether Anna can access the documents. Keeping ticket issuance, identity verification and permission checks separate makes it easier to understand what each step contributes to the protocol.
