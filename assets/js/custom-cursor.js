document.addEventListener('DOMContentLoaded', () => {
  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor';
  document.body.appendChild(cursor);

  const cursorInner = document.createElement('div');
  cursorInner.className = 'cursor-inner';
  cursor.appendChild(cursorInner);

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  cursor.appendChild(dot);

  let mouseX = 0;
  let mouseY = 0;
  let cursorX = 0;
  let cursorY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Hide default cursor
    document.body.style.cursor = 'none';
  });

  const links = document.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    link.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });

  function animate() {
    // Smooth follow
    cursorX += (mouseX - cursorX) * 0.1;
    cursorY += (mouseY - cursorY) * 0.1;
    
    cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
    requestAnimationFrame(animate);
  }

  animate();
});
