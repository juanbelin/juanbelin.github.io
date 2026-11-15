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
  details?: string[];
  technologies?: string[];
  links?: { label: string; href: string }[];
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
      'Run hands-on awareness sessions and tailored phishing simulations for private companies and public-sector teams.',
      'Build and maintain campaign infrastructure, from Linux VPS instances and Gophish deployments to domains and DNS.',
      'Automate campaign workflows and translate results into technical and executive reports with actionable recommendations.',
    ],
    details: [
      'Role-play as the adversary in realistic red-team awareness scenarios.',
      'Design and execute controlled campaigns with Gophish, KnowBe4 and Proofpoint to measure user awareness.',
      'Create realistic phishing email templates and landing pages tailored to each client.',
      'Prepare client proposals and reuse and reconfigure campaign environments.',
      'Develop scripts and automation for campaign deployment, adversary sessions, tracking and reporting.',
      'Work with clients to strengthen their awareness programs and human-layer defenses.',
    ],
    technologies: ['Gophish', 'KnowBe4', 'Proofpoint', 'Linux', 'DNS', 'Automation'],
    links: [{ label: 'Read my Gophish methodology', href: '/research/gophish-metodology/' }],
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
      'Built custom automation tools to reduce manual effort in ethical hacking workflows.',
      'Integrated Google Gemini and ADK into the Ransomware Simulator platform to automate attack scenarios and support threat modeling.',
      'Developed malware with active and passive antivirus evasion techniques.',
    ],
    technologies: ['Google Gemini', 'ADK', 'Python', 'Bash', 'AV Evasion'],
    links: [{ label: 'Explore my AV Evasion project', href: '/projects/windows-av-evasion/' }],
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
      'Supported database management, C programming and virtualized development environments.',
      'Worked with networks, routers and Raspberry Pi devices to support production infrastructure.',
      'Set up workstations, cameras, displays and cabling for production teams.',
    ],
    technologies: ['C', 'Databases', 'Virtualization', 'Networking', 'Raspberry Pi'],
    images: [],
  },
];
