const button = document.querySelector<HTMLButtonElement>('[data-back-to-top]');
if (button) {
  const desktop = window.matchMedia('(min-width: 1101px) and (hover: hover) and (pointer: fine)');
  const update = () => { button.hidden = !desktop.matches || window.scrollY < 400; };
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { update(); scheduled = false; });
  }, { passive: true });
  desktop.addEventListener('change', update);
  window.addEventListener('pageshow', update);
  button.addEventListener('click', () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
  });
  update();
}
export {};
