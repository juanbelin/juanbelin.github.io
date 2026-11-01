export interface Experience {
  company: string;
  companyUrl?: string;
  cybersecurity?: boolean;
  includeInTotal?: boolean;
  logo?: string;
  role: string;
  start: string; // YYYY-MM; entries are displayed newest first.
  end?: string; // Omit for a current role.
  location?: string;
  summary: string;
  highlights: string[];
  images?: { src: string; alt: string; caption?: string }[];
}

export const experience: Experience[] = [
  {
    company: 'S2GRUPO',
    cybersecurity: true,
    companyUrl: 'https://s2grupo.es/',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRo3dUq7BJ_gM3OSCxPpiSFGsWMZjVCrothXsMbObkJUdXbblXW6P9nmsvc&s=10',
    role: 'Security Awareness & Adversary Simulation',
    start: '2026-06',
    location: 'Madrid, Spain · Hybrid',
    summary: 'Delivering practical security awareness programs and realistic adversary simulations for private companies and public-sector organizations.',
    highlights: [
      'Deliver hands-on awareness sessions, role-playing as the adversary in realistic red-team scenarios.',
      'Design and execute controlled phishing campaigns with Gophish, KnowBe4 and Proofpoint to simulate social engineering attacks and measure user awareness.',
      'Manage the full campaign infrastructure: Linux VPS instances, Gophish deployments, domains, DNS and environment reuse and reconfiguration.',
      'Create realistic phishing email templates and landing pages tailored to each client.',
      'Prepare client proposals, track campaigns and produce technical and executive reports with actionable recommendations.',
      'Develop scripts and automation for campaign deployment, adversary sessions, tracking and reporting.',
      'Work with clients to strengthen their awareness programs and human-layer defenses.',
    ],
    images: [{ src: '/images/experience/session1_scrubbed.png', alt: 'Security awareness session at S2GRUPO', caption: 'Hands-on security awareness session.' }],
  },
  {
    company: 'Áudea Seguridad de la Información',
    cybersecurity: true,
    companyUrl: 'https://audea.com/',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYbXItNO0o-p15jAX1ikokZQh7GwkRz3jWwDQt4-JJ1A&s=10',
    role: 'Malware Developer',
    start: '2025-06',
    end: '2025-11',
    location: 'Madrid, Spain · Remote',
    summary: 'Developed automation tools and malware simulation capabilities to support ethical hacking operations and realistic attack scenarios.',
    highlights: [
      'Reduced manual technical effort by developing custom automation tools and improving ethical hacking workflows.',
      'Worked as a product developer on the Ransomware Simulator platform, integrating agentic AI and LLMs using Google Gemini and ADK to automate complex attack scenarios and improve threat modeling.',
      'Developed malware using active and passive antivirus evasion techniques.',
    ],
    images: [],
  },
  {
    company: 'ARKANUM PICTURES',
    includeInTotal: true,
    companyUrl: 'https://arkanum.pictures/',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUJwlDneZ6RVzx_CsFIJyGoV1r4atS9a6u0-UYIbC2Uw&s',
    role: 'Virtual IT Intern · Internship',
    start: '2024-03',
    end: '2024-06',
    location: 'Berlin, Germany · On-site',
    summary: 'Supported the IT, development and hardware infrastructure used in a production environment.',
    highlights: [
      'Worked on database management and C programming.',
      'Used virtualization and development and creation tools, including Unity, Unreal Engine and rendering software.',
      'Worked with networks, routers, Raspberry Pi devices, repeaters and cabling.',
      'Set up production equipment, including computers, monitors, cameras, displays and cabling.',
    ],
    images: [],
  },
];
