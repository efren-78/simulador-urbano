const API_URL = "http://localhost:8000";

const callesCanvas = document.getElementById("callesCanvas");
const callesCtx = callesCanvas.getContext("2d");

const autosCanvas = document.getElementById("autosCanvas");
const autosCtx = autosCanvas.getContext("2d");

// Variables globales de transformación
let escala = 1;
let offsetX = 0;
let offsetY = 0;

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

function calcularLimites(calles) {
  minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
  calles.forEach(calle => {
    calle.puntos.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
  });
}

function calcularTransformacion() {
  const margen = 20;
  const anchoDatos = maxX - minX;
  const altoDatos = maxY - minY;

  const escalaX = (callesCanvas.width - margen * 2) / anchoDatos;
  const escalaY = (callesCanvas.height - margen * 2) / altoDatos;

  escala = Math.min(escalaX, escalaY);
  offsetX = -minX * escala + margen;
  offsetY = -minY * escala + margen;
}

function dibujarCalles() {
  fetch(`${API_URL}/calles`)
    .then(res => res.json())
    .then(data => {
      calcularLimites(data);
      calcularTransformacion();

      data.forEach(calle => {
        const puntos = calle.puntos;
        if (puntos.length < 2) return;

        const camino = puntos.map(p => ({
          x: p.x * escala + offsetX,
          y: (maxY - p.y) * escala + offsetY
        }));

        // Calle base negra (línea gruesa)
        callesCtx.beginPath();
        callesCtx.moveTo(camino[0].x, camino[0].y);
        for (let i = 1; i < camino.length; i++) {
          callesCtx.lineTo(camino[i].x, camino[i].y);
        }
        callesCtx.strokeStyle = "#000";
        callesCtx.lineWidth = 20;
        callesCtx.stroke();

        // Línea central amarilla (más delgada)
        callesCtx.beginPath();
        callesCtx.moveTo(camino[0].x, camino[0].y);
        for (let i = 1; i < camino.length; i++) {
          callesCtx.lineTo(camino[i].x, camino[i].y);
        }
        callesCtx.strokeStyle = "#FFD700";
        callesCtx.lineWidth = 5;
        callesCtx.stroke();
      });
    })
    .catch(err => console.error("Error al dibujar calles:", err));
}


const iconoCar1 = new Image();
iconoCar1.src = "imagenes/caricono.png"; 

const iconoCar2 = new Image();
iconoCar2.src = "imagenes/caricono2.png"; 

const iconoCar3 = new Image();
iconoCar3.src = "imagenes/caricono3.png";

const iconoCar4 = new Image();
iconoCar3.src = "imagenes/caricono4.png";

const iconoCar5 = new Image();
iconoCar5.src = "imagenes/caricono5.png";

const iconoCar6 = new Image();
iconoCar6.src = "imagenes/caricono6.png";

const iconosVehiculos = [iconoCar1, iconoCar2, iconoCar3, iconoCar4, iconoCar5, iconoCar6];

const vehiculosConIconos = new Map();

function asignarIcono(v, index) {
  // Verificamos si el vehículo ya tiene un ícono asignado
  if (!vehiculosConIconos.has(v.id)) {
    // Asignamos un ícono según el índice
    const iconoSeleccionado = iconosVehiculos[index % iconosVehiculos.length];
    vehiculosConIconos.set(v.id, iconoSeleccionado);
  }
}

function actualizarVehiculos() {
  fetch(`${API_URL}/vehiculos`)
    .then(res => res.json())
    .then(data => {
      // Limpiar solo el canvas de autos
      autosCtx.clearRect(0, 0, autosCanvas.width, autosCanvas.height);

      data.forEach((v, index) => {
        // Asignar el ícono al vehículo si no lo tiene
        asignarIcono(v, index);

        const x = v.posicion.x * escala + offsetX;
        const y = (maxY - v.posicion.y) * escala + offsetY;
        const anchoIcono = 60;  // Ancho del ícono
        const altoIcono = 40;   // Alto del ícono

      // Obtener el ícono asignado desde el mapa
        const iconoSeleccionado = vehiculosConIconos.get(v.id);

// Dibujar el ícono correspondiente
autosCtx.drawImage(iconoSeleccionado, x - anchoIcono / 2, y - altoIcono / 2, anchoIcono, altoIcono);

autosCtx.font = "10px Arial";
autosCtx.fillStyle = "#000";
autosCtx.fillText(v.id, x + 10, y);
      });
    })
    .catch(err => console.error("Error al obtener vehículos:", err));
}




// Iniciar dibujo de calles
dibujarCalles();

// Actualizar vehículos cada segundo
setInterval(actualizarVehiculos, 1000);

// Botones de control (igual que antes)
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
