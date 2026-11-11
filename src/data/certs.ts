export interface Cert {
  year: string;
  name: string;
  issuer: string;
  issuerUrl?: string;
  description?: string;
  kind?: 'certification' | 'education' | 'training';
  verify?: { label: string; url: string };
  status?: { label: string; variant?: 'progress' };
}

// Verification links copied from JuanBelin's existing personal card.
// Leave the year blank where the original site does not state an award date.
export const certs: Cert[] = [
    { year: '2027', name: 'CRTO', issuer: 'Zero-Point Security',
    issuerUrl: 'https://www.zeropointsecurity.co.uk/', kind: 'training',
    status: { label: 'In progress', variant: 'progress' } },
  { year: '2026', name: 'CPTS', issuer: 'Hack The Box',
    issuerUrl: 'https://www.hackthebox.com/',
    verify: { label: 'verify ↗', url: 'https://profile.hackthebox.com/profile/019c4726-d2f8-703d-9c6f-acde75c1ee63/certificate/HTBCERT-6C0CEF7D19' } },
  { year: '2026', name: 'CWES', issuer: 'Hack The Box',
    issuerUrl: 'https://www.hackthebox.com/',
    verify: { label: 'verify ↗', url: 'https://profile.hackthebox.com/profile/019c4726-d2f8-703d-9c6f-acde75c1ee63/certificate/HTBCERT-36F7741743' } },
  { year: '2026', name: 'CRTA', issuer: 'CyberWarFare Labs',
    issuerUrl: 'https://cyberwarfare.live/',
    verify: { label: 'verify ↗', url: 'https://labs.cyberwarfare.live/credential/achievement/69985f72398414f740f6a1ed' } },
  { year: '2026', name: 'eJPTv2', issuer: 'INE / eLearnSecurity',
    issuerUrl: 'https://ine.com/',
    verify: { label: 'verify ↗', url: 'https://certs.ine.com/ce3019f9-f225-4853-a8a4-adefde4f89b3#acc.Y1KBVmMj' } },
  { year: '2025', name: 'Cybersecurity Master',
    description: 'Official education', issuer: '—', kind: 'education' },
  { year: '2024', name: 'Grade in Software Development',
    description: 'Official education',
    issuer: '—', kind: 'education' },


];
