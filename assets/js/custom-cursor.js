document.addEventListener('DOMContentLoaded', () => {
    // Create cursor elements
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    const cursorDot = document.createElement('div');
    cursorDot.className = 'cursor-dot';
    document.body.appendChild(cursor);
    document.body.appendChild(cursorDot);

    // Create trail elements
    const trails = [];
    for (let i = 0; i < 5; i++) {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        document.body.appendChild(trail);
        trails.push(trail);
    }

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let dotX = 0;
    let dotY = 0;

    // Update mouse position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Update trail positions with delay
        trails.forEach((trail, index) => {
            setTimeout(() => {
                trail.style.left = `${mouseX - 3}px`;
                trail.style.top = `${mouseY - 3}px`;
            }, index * 50);
        });
    });

    // Animate cursor
    function animate() {
        // Smooth cursor following
        cursorX += (mouseX - cursorX) * 0.1;
        cursorY += (mouseY - cursorY) * 0.1;
        cursor.style.left = `${cursorX - 10}px`;
        cursor.style.top = `${cursorY - 10}px`;

        // Faster dot following
        dotX += (mouseX - dotX) * 0.2;
        dotY += (mouseY - dotY) * 0.2;
        cursorDot.style.left = `${dotX - 4}px`;
        cursorDot.style.top = `${dotY - 4}px`;

        requestAnimationFrame(animate);
    }
    animate();

    // Add hover effect for clickable elements
    const clickables = document.querySelectorAll('a, button, input[type="submit"]');
    clickables.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('active'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('active'));
    });
});
