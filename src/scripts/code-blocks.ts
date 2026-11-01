for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy-code]')) {
  const block = button.closest('[data-code-block]');
  const code = block?.querySelector('pre code');
  const status = block?.querySelector('[data-code-status]');
  let reset: ReturnType<typeof setTimeout>;
  button.addEventListener('click', async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
      button.textContent = 'Copied!';
      button.dataset.copied = '';
      if (status) status.textContent = 'Code copied to clipboard.';
    } catch {
      button.textContent = 'Copy failed';
      if (status) status.textContent = 'Unable to copy. Select the code and copy it manually.';
    }
    clearTimeout(reset);
    reset = setTimeout(() => { button.textContent = 'Copy'; delete button.dataset.copied; }, 2000);
  });
}
export {};
