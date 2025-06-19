const API_URL = "http://localhost:8000";
const canvas = document.getElementById("mapaCanvas");
const ctx = canvas.getContext("2d");

// Escala por si necesitas hacer zoom o centrar (ajústalo si tus coordenadas son grandes)
const escala = 1;
const offsetX = 0;
const offsetY = 0;

// Función que consulta y dibuja vehículos
function actualizarVehiculos() {
  fetch(`${API_URL}/vehiculos`)
    .then(res => res.json())
    .then(data => {
      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      data.forEach(v => {
        const x = v.pos.x * escala + offsetX;
        const y = v.pos.y * escala + offsetY;

        // Dibujar cada vehículo
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "blue";
        ctx.fill();
        ctx.strokeText(v.id, x + 7, y);  // opcional: muestra el ID
      });
    })
    .catch(err => console.error("Error al obtener vehículos:", err));
}

function dibujarCalles() {
  fetch(`${API_URL}/calles`)
    .then(res => res.json())
    .then(data => {
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


dibujarCalles();

setInterval(actualizarVehiculos, 1000);

// Control de botones
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



