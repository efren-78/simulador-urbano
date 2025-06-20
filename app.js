const API_URL = "http://localhost:8000";
const canvas = document.getElementById("mapaCanvas");
const ctx = canvas.getContext("2d");

// Variables globales de transformación
let escala = 1;
let offsetX = 0;
let offsetY = 0;

// Función para encontrar límites del mapa
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

function calcularLimites(calles) {
  calles.forEach(calle => {
    calle.puntos.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
  });
}

// Calcular escala y desplazamiento para ajustar al canvas
function calcularTransformacion() {
  const margen = 20;
  const anchoDatos = maxX - minX;
  const altoDatos = maxY - minY;

  const escalaX = (canvas.width - margen * 2) / anchoDatos;
  const escalaY = (canvas.height - margen * 2) / altoDatos;

  escala = Math.min(escalaX, escalaY);
  offsetX = -minX * escala + margen;
  offsetY = -minY * escala + margen;
}

// Dibujar calles en el canvas
function dibujarCalles() {
  fetch(`${API_URL}/calles`)
    .then(res => res.json())
    .then(data => {
      calcularLimites(data);
      calcularTransformacion();

      data.forEach(calle => {
        const puntos = calle.puntos;
        if (puntos.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(puntos[0].x * escala + offsetX, puntos[0].y * escala + offsetY);

        for (let i = 1; i < puntos.length; i++) {
          const x = puntos[i].x * escala + offsetX;
          const y = puntos[i].y * escala + offsetY;
          ctx.lineTo(x, y);
        }

        ctx.strokeStyle = "#888";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    })
    .catch(err => console.error("Error al dibujar calles:", err));
}

// Dibujar vehículos en el canvas
function actualizarVehiculos() {
  fetch(`${API_URL}/vehiculos`)
    .then(res => res.json())
    .then(data => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dibujarCalles(); // Redibujar calles en cada actualización

      data.forEach(v => {
        const x = v.posicion.x * escala + offsetX;
        const y = v.posicion.y * escala + offsetY;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "blue";
        ctx.fill();
        ctx.strokeText(v.id, x + 7, y); // Mostrar ID al lado
      });
    })
    .catch(err => console.error("Error al obtener vehículos:", err));
}

// Inicializar calles
dibujarCalles();

// Actualizar vehículos cada segundo
setInterval(actualizarVehiculos, 1000);

// Botones de control
document.getElementById("play-button").addEventListener("click", () => {
  fetch(`${API_URL}/start`)
    .then(res => res.json())
    .then(data => alert(data.status));
});

document.getElementById("stop-button").addEventListener("click", () => {
  fetch(`${API_URL}/stop`)
    .then(res => res.json())
    .then(data => alert(data.status));
});

document.getElementById("reload-button")?.addEventListener("click", () => {
  fetch(`${API_URL}/reload`)
    .then(res => res.json())
    .then(data => alert(data.status));
});
