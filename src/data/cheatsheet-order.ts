// Follow the CRTO note indexes rather than publication or modification dates.
export const cheatsheetCategories = [
  'Defence Evasion',
  'Credential Dumping',
  'User Impersonation',
  'Kerberos',
  'Domain Dominance',
  'AD CS',
  'Forest & Domain Trusts',
  'Databases',
];

export const cheatsheetOrder = [
  'defence-evasion-cobalt-cheatsheet',
  'browser-credentials-cheatsheet',
  'windows-credential-manager-cheatsheet',
  'os-credential-dumping-cheatsheet',
  'kerberos-credential-access-cheatsheet',
  'token-impersonation-cobalt-cheatsheet',
  'pass-the-hash-cobalt-cheatsheet',
  'pass-the-ticket-cobalt-cheatsheet',
  'process-injection-cobalt-cheatsheet',
  'kerberos-unconstrained-delegation-cheatsheet',
  'kerberos-constrained-delegation-cheatsheet',
  'kerberos-service-name-substitution-cheatsheet',
  'kerberos-s4u2self-computer-takeover-cheatsheet',
  'kerberos-rbcd-cheatsheet',
  'dcsync-cheatsheet',
  'silver-ticket-cheatsheet',
  'golden-ticket-cheatsheet',
  'diamond-ticket-cheatsheet',
  'dpapi-domain-backup-key-cheatsheet',
  'adcs-enumeration-cheatsheet',
  'adcs-esc1-cheatsheet',
  'adcs-esc2-cheatsheet',
  'adcs-esc3-cheatsheet',
  'adcs-esc4-cheatsheet',
  'adcs-esc8-cheatsheet',
  'adcs-golden-certificates-cheatsheet',
  'inter-realm-tickets-cheatsheet',
  'parent-child-trust-cheatsheet',
  'inbound-trust-cheatsheet',
  'outbound-trust-cheatsheet',
  'mssql-cobalt-cheatsheet',
];

export function noteOrder(value: string, order: readonly string[]) {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
}
