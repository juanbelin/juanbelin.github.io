const gallery = document.querySelector<HTMLDialogElement>('[data-image-gallery]');
const display = gallery?.querySelector<HTMLImageElement>('[data-gallery-image]');
const counter = gallery?.querySelector<HTMLElement>('[data-gallery-counter]');
const caption = gallery?.querySelector<HTMLElement>('[data-gallery-caption]');
const original = gallery?.querySelector<HTMLAnchorElement>('[data-gallery-original]');
const previous = gallery?.querySelector<HTMLButtonElement>('[data-gallery-previous]');
const next = gallery?.querySelector<HTMLButtonElement>('[data-gallery-next]');
const images = [...document.querySelectorAll<HTMLImageElement>('.article-main .article-cover, [data-article-prose] img')];

if (gallery && display && counter && caption && original && previous && next && images.length) {
  let current = 0;
  let opener: HTMLElement | undefined;
  let previousOverflow = '';
  const showImage = (index: number) => {
    current = (index + images.length) % images.length;
    const image = images[current];
    display.src = image.currentSrc || image.src;
    display.alt = image.alt;
    original.href = display.src;
    caption.textContent = image.closest('figure')?.querySelector('figcaption')?.textContent || image.alt;
    counter.textContent = `${current + 1} / ${images.length}`;
    previous.hidden = next.hidden = images.length < 2;
  };
  images.forEach((image, index) => {
    let trigger = image.closest<HTMLAnchorElement>('a');
    if (!trigger) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = image.classList.contains('article-cover') ? 'image-trigger image-trigger-cover' : 'image-trigger';
      button.setAttribute('aria-label', `Enlarge image ${index + 1}${image.alt ? `: ${image.alt}` : ''}`);
      image.before(button);
      button.append(image);
      trigger = null;
      enhance(button);
    } else enhance(trigger);
    function enhance(control: HTMLElement) {
      control.setAttribute('aria-haspopup', 'dialog');
      control.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        opener = control;
        previousOverflow = document.body.style.overflow;
        showImage(index);
        gallery!.showModal();
        document.body.style.overflow = 'hidden';
      });
    }
  });
  previous.addEventListener('click', () => showImage(current - 1));
  next.addEventListener('click', () => showImage(current + 1));
  gallery.querySelector('[data-gallery-close]')?.addEventListener('click', () => gallery.close());
  gallery.addEventListener('click', event => {
    if (event.target instanceof Element && !event.target.closest('[data-gallery-image], button, a')) gallery.close();
  });
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); showImage(current + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showImage(current - 1); }
  });
  gallery.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });
  let start: { x: number; y: number } | undefined;
  gallery.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') start = { x: event.clientX, y: event.clientY };
  });
  gallery.addEventListener('pointerup', event => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) showImage(current + (dx < 0 ? 1 : -1));
    start = undefined;
  });
  gallery.addEventListener('pointercancel', () => { start = undefined; });
}
export {};
