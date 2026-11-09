const observer = new IntersectionObserver(entries => {
  let visibleIndex = 0;
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      (entry.target as HTMLElement).style.setProperty('--reveal-delay', `${Math.min(visibleIndex++, 4) * 45}ms`);
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

export function observeReveals(root: ParentNode = document) {
  root.querySelectorAll('.rv:not(.in)').forEach(element => observer.observe(element));
}

export function unobserveReveals(root: ParentNode) {
  root.querySelectorAll('.rv').forEach(element => observer.unobserve(element));
}
