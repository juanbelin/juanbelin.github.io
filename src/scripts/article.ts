const copyStatus = document.querySelector<HTMLElement>('[data-copy-status]');
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

async function copyLink(url: string, control: HTMLElement) {
  try {
    await navigator.clipboard.writeText(url);
    if (copyStatus) copyStatus.textContent = 'Link copied to clipboard.';
    control.setAttribute('data-copied', '');
    clearTimeout(timers.get(control));
    timers.set(control, setTimeout(() => control.removeAttribute('data-copied'), 2000));
  } catch {
    if (copyStatus) copyStatus.textContent = 'Unable to copy. You can copy the link from your address bar.';
  }
}

for (const anchor of document.querySelectorAll<HTMLAnchorElement>('[data-copy-heading]')) {
  anchor.addEventListener('click', event => {
    // Retain native fragment navigation, keyboard access and modified clicks.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    void copyLink(anchor.href, anchor);
  });
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy-url]')) {
  button.addEventListener('click', () => {
    if (button.dataset.copyUrl) void copyLink(button.dataset.copyUrl, button);
  });
}

const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
const sections = tocLinks.map(link => ({
  link, heading: document.getElementById(decodeURIComponent(link.hash.slice(1))),
})).filter((section): section is { link: HTMLAnchorElement; heading: HTMLElement } => !!section.heading);

function updateContents() {
  let active = sections[0];
  for (const section of sections) {
    if (section.heading.getBoundingClientRect().top <= 140) active = section;
  }
  for (const section of sections) {
    if (section === active) section.link.setAttribute('aria-current', 'location');
    else section.link.removeAttribute('aria-current');
  }
}
if (sections.length > 0) {
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { updateContents(); scheduled = false; });
  }, { passive: true });
  window.addEventListener('resize', updateContents);
  window.addEventListener('hashchange', updateContents);
  window.addEventListener('load', updateContents);
  updateContents();
}

const mobileContents = document.querySelector<HTMLDetailsElement>('.article-mobile-toc');
if (mobileContents) {
  const trigger = mobileContents.querySelector<HTMLElement>('summary');
  const closeContents = (restoreFocus = false) => {
    mobileContents.open = false;
    if (restoreFocus) trigger?.focus();
  };
  mobileContents.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => closeContents(true));
  });
  document.addEventListener('click', event => {
    if (event.target instanceof Node && !mobileContents.contains(event.target)) closeContents();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileContents.open) {
      closeContents(true);
      event.preventDefault();
    }
  });
  window.matchMedia('(max-width: 1100px)').addEventListener('change', () => closeContents());
}

export {};
