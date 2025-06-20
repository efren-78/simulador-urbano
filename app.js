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

        // Transformar los puntos con escala y offset
        const camino = puntos.map(p => ({
          x: p.x * escala + offsetX,
          y: p.y * escala + offsetY
        }));

        // 1. Dibujar la calle en negro (base gruesa)
        ctx.beginPath();
        ctx.moveTo(camino[0].x, camino[0].y);
        for (let i = 1; i < camino.length; i++) {
          ctx.lineTo(camino[i].x, camino[i].y);
        }
        ctx.strokeStyle = "#000"; // Negro
        ctx.lineWidth = 6;
        ctx.stroke();

        // 2. Dibujar la línea central amarilla (más delgada)
        ctx.beginPath();
        ctx.moveTo(camino[0].x, camino[0].y);
        for (let i = 1; i < camino.length; i++) {
          ctx.lineTo(camino[i].x, camino[i].y);
        }
        ctx.strokeStyle = "#FFD700"; // Amarillo dorado
        ctx.lineWidth = 2;
        ctx.stroke();
      });

    })
    .catch(err => console.error("Error al dibujar calles:", err));
}



const iconoAuto = new Image();
iconoAuto.src = "imagenes/caricono.png"; // Asegúrate que esté en la misma carpeta

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

  const tamaño = 35; // tamaño del ícono
  ctx.drawImage(iconoAuto, x - tamaño / 2, y - tamaño / 2, tamaño, tamaño);

  ctx.font = "10px Arial";
  ctx.fillStyle = "#000";
  ctx.fillText(v.id, x + 10, y);
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
