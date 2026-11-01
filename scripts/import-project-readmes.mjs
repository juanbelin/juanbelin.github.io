import fs from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import yaml from 'js-yaml';

const projects = [
  { slug: 'instagram-phising-2024', repository: 'Instagram-phising-2024', title: 'Instagram Phishing 2024', description: 'An educational, local simulation of an Instagram password-recovery phishing page.', category: 'Social Engineering', stack: ['PHP', 'CSS', 'MySQL'], status: 'public' },
  { slug: 'hyprland-arch-dotfiles', repository: 'Hyprland-arch-dotfiles', title: 'Hyprland Arch Linux Dotfiles', description: 'Personal Arch Linux dotfiles configured with Hyprland for a hacking-focused desktop.', category: 'Infrastructure', stack: ['Arch Linux', 'Hyprland', 'Waybar', 'Shell'], status: 'wip' },
  { slug: 'hit-the-dns', repository: 'Hit-The-Dns', title: 'Hit-The-Dns', description: 'An open-source DNS reconnaissance tool written in Bash.', category: 'Red Team', stack: ['Bash', 'DNS', 'Reconnaissance'], status: 'public' },
  { slug: 'windows-av-evasion', repository: 'Windows-AV-Evasion', title: 'Windows AV Evasion', description: 'An educational Windows Defender evasion demonstration, documented in the project README.', category: 'Evasion', stack: ['Python', 'Bash', 'Metasploit'], status: 'public' },
];
const parser = unified().use(remarkParse).use(remarkGfm);
fs.mkdirSync('src/content/projects', { recursive: true });
for (const project of projects) {
  const readme = fs.readFileSync(`docs/github-readmes/${project.repository}.md`, 'utf8');
  const repo = `https://github.com/juanbelin/${project.repository}`;
  const raw = `https://raw.githubusercontent.com/juanbelin/${project.repository}/main/`;
  const resolveUrl = (url, image) => {
    if (/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(url)) return url;
    const relative = url.replace(/^\.\//, '').replace(/^\//, '');
    return new URL(relative, image ? raw : `${repo}/blob/main/`).href;
  };
  const edits = [];
  function visit(node) {
    if (['image', 'link', 'definition'].includes(node.type)) {
      const replacement = resolveUrl(node.url, node.type === 'image');
      if (replacement !== node.url) {
        const fragment = readme.slice(node.position.start.offset, node.position.end.offset);
        const offset = fragment.lastIndexOf(node.url);
        if (offset >= 0) edits.push({ start: node.position.start.offset + offset, end: node.position.start.offset + offset + node.url.length, value: replacement });
      }
    }
    if (node.type === 'html') {
      for (const match of node.value.matchAll(/\b(src|href)=(['"])([^'"]+)\2/g)) {
        const value = resolveUrl(match[3], match[1] === 'src');
        if (value !== match[3]) {
          const start = node.position.start.offset + match.index + match[0].indexOf(match[3]);
          edits.push({ start, end: start + match[3].length, value });
        }
      }
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(parser.parse(readme));
  let body = readme;
  for (const edit of edits.sort((a, b) => b.start - a.start)) body = body.slice(0, edit.start) + edit.value + body.slice(edit.end);
  // One README image tag is missing its closing delimiter; retain its content.
  body = body.replace(/(<img\b[^>]*?)(\r?\n)(?=\s*<\/p>)/gi, '$1 />$2');
  const metadata = { title: project.title, description: project.description, date: '2026-11-01', status: project.status, category: project.category, stack: project.stack, repo };
  fs.writeFileSync(`src/content/projects/${project.slug}.md`, `---\n${yaml.dump(metadata, { lineWidth: -1 })}---\n\n${body}`);
  console.log(`Imported README: ${project.repository}`);
}
