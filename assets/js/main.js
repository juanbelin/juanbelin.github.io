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