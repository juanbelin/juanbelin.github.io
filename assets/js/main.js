document.addEventListener('DOMContentLoaded', function() {
  // Efecto de escritura
  const nameSpan = document.querySelector('.name span');
  const text = nameSpan.textContent;
  nameSpan.textContent = '';
  
  let i = 0;
  function type() {
    if (i < text.length) {
      nameSpan.textContent += text.charAt(i);
      i++;
      setTimeout(type, 100);
    }
  }
  
  setTimeout(type, 500);

  // Cursor personalizado
  const cursor = document.querySelector('.custom-cursor');
  const cursorDot = document.querySelector('.custom-cursor-dot');

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX - cursor.offsetWidth / 2 + 'px';
    cursor.style.top = e.clientY - cursor.offsetHeight / 2 + 'px';
    cursorDot.style.left = e.clientX - cursorDot.offsetWidth / 2 + 'px';
    cursorDot.style.top = e.clientY - cursorDot.offsetHeight / 2 + 'px';
  });

  document.addEventListener('mousedown', () => {
    cursor.style.transform = 'scale(0.8)';
    cursorDot.style.transform = 'scale(0.8)';
  });

  document.addEventListener('mouseup', () => {
    cursor.style.transform = 'scale(1)';
    cursorDot.style.transform = 'scale(1)';
  });

  // Efecto hover en links
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('mouseenter', () => {
      cursor.style.transform = 'scale(1.5)';
      cursorDot.style.transform = 'scale(1.5)';
    });
    
    link.addEventListener('mouseleave', () => {
      cursor.style.transform = 'scale(1)';
      cursorDot.style.transform = 'scale(1)';
    });
  });

  // Función para alternar los GIFs de fondo
  async function cycleBackgrounds() {
    const backgrounds = document.querySelectorAll('.background-gif');
    const current = document.querySelector('.background-gif.active');
    const next = current.nextElementSibling || backgrounds[0];
    
    // Espera a que el siguiente GIF se cargue completamente
    await new Promise(resolve => {
      if (next.complete) {
        resolve();
      } else {
        next.onload = resolve;
      }
    });

    // Inicia la transición
    next.classList.add('active');
    current.classList.remove('active');
  }

  // Iniciar el ciclo cuando se cargue el primer GIF
  const firstGif = document.querySelector('.background-gif');
  firstGif.onload = function() {
    // Ajusta este valor según la duración real de tus GIFs
    const duration = 8000; // 8 segundos
    setInterval(cycleBackgrounds, duration);
  };
});