import { cybersecurityMonths, formatExperienceDuration } from '@/lib/experience-duration.mjs';

for (const counter of document.querySelectorAll<HTMLElement>('[data-cybersecurity-total]')) {
  const entries = JSON.parse(counter.dataset.roles ?? '[]');
  const update = () => { counter.textContent = formatExperienceDuration(cybersecurityMonths(entries)); };
  update();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
  setInterval(update, 60 * 60 * 1000);
}
