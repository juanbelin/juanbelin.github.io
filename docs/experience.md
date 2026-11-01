# Updating work experience

Add roles to `src/data/experience.ts`. The timeline sorts them by start date,
newest first. All interface text and work experience descriptions should be in
English. Blog posts retain their original language.

Example entry (replace all example text with your own details):

```ts
export const experience: Experience[] = [
  {
    company: 'Company name',
    companyUrl: 'https://example.com', // Optional.
    role: 'Role title',
    start: '2025-01',
    // end: '2026-06', // Omit to display "Present".
    location: 'Madrid, Spain', // Optional.
    summary: 'A brief description of the role and its scope.',
    highlights: [
      'Describe a responsibility or project.',
      'Describe an achievement and its impact.',
    ],
    images: [ // Optional; add as many images as needed.
      {
        src: '/images/experience/project.png',
        alt: 'A description of what the image shows',
        caption: 'An optional caption.',
      },
    ],
  },
];
```

Store images in `public/images/experience/`; reference them using
`/images/experience/filename.png`. Images open at full size when clicked.
Use `YYYY-MM` dates. Company links, locations, images and captions are optional.

Add an optional `logo: '/images/experience/company-logo.png'` (or an external
image URL) to a role to show a company mark inside a circular frame.

Mark relevant roles with `cybersecurity: true` to include them in the total
cybersecurity experience counter. The counter uses calendar months (inclusive),
merges overlaps and excludes employment gaps. Mark an additional role or
internship with `includeInTotal: true` to include it without labelling it as a
cybersecurity job. The current total includes the ARKANUM IT internship. Ongoing
roles update automatically in the browser, using the Europe/Madrid month.

To enlarge the experience photos, edit `--experience-image-width` near the top
of `src/styles/global.css`. It defaults to `220px`; use `360px`, for example.
Photos keep their proportions and remain limited to the available mobile width.
