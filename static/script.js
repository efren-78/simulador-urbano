//funcion para el slider de trafico
const luces = document.querySelectorAll('.luces-circulo');

luces.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
        luces.forEach(l => {
            l.classList.remove('red', 'yellow', 'green');
        });
        btn.classList.add(btn.getAttribute('color'));
    });
});
