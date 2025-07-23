let running = false;
let animationId;
const cars = [];
const carRoutes = [];
const carSpeeds = [];
const semaforos = [];

const rutas = [
  { tipo: "horizontal", z: -10 },
  { tipo: "horizontal", z: 10 },
  { tipo: "vertical", x: -10 },
  { tipo: "vertical", x: 10 },
  { tipo: "diagonal", offset: -30 },
  { tipo: "diagonal", offset: -10 },
  { tipo: "diagonal", offset: 10 },
  { tipo: "diagonal", offset: 30 }
];

function crearCalleLarga(scene, width, length, rotationY = 0, position = { x: 0, z: 0 }) {
  const geometry = new THREE.PlaneGeometry(width, length);
  const material = new THREE.MeshPhongMaterial({ color: 0x2c2c2c });
  const calle = new THREE.Mesh(geometry, material);
  calle.rotation.x = -Math.PI / 2;
  calle.rotation.z = rotationY;
  calle.position.set(position.x, 0, position.z);
  scene.add(calle);
}

function crearSemaforo(scene, position, initialState = "red") {
  const color = initialState === "green" ? 0x00ff00 : 0xff0000;
  const geometry = new THREE.BoxGeometry(0.5, 2, 0.5);
  const material = new THREE.MeshPhongMaterial({ color });
  const semaforo = new THREE.Mesh(geometry, material);
  semaforo.position.set(position.x, 1, position.z);
  semaforo.userData = { state: initialState };
  scene.add(semaforo);
  semaforos.push(semaforo);
}

function init() {
  const canvas = document.getElementById("mapaCanvas");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  // Luz
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(20, 40, 20);
  scene.add(light);

  // Calles horizontales
  for (let i = -20; i <= 20; i += 10) {
    crearCalleLarga(scene, 5, 100, 0, { x: 0, z: i });
  }

  // Calles verticales
  for (let i = -20; i <= 20; i += 10) {
    crearCalleLarga(scene, 5, 100, Math.PI / 2, { x: i, z: 0 });
  }

  // Avenida diagonal
  crearCalleLarga(scene, 5, 140, Math.PI / 4, { x: 0, z: 0 });

  // Semáforos
  crearSemaforo(scene, { x: 0, z: 0 }, "green");
  crearSemaforo(scene, { x: 10, z: -10 }, "red");

  // Leer configuración desde localStorage
  const numCars = parseInt(localStorage.getItem("config_numCars")) || 10;
  const trafico = localStorage.getItem("config_trafico") || "moderado";

  // Escalar velocidad según condición de tráfico
  let velocidadBase = calcularVelocidadBase(trafico);

  // Autos iniciales
  crearAutos(scene, numCars, velocidadBase);

  // Guardar en window para uso global
  window.simulation = { scene, camera, renderer };

  // Ajuste de cámara
  camera.position.set(0, 100, 100);
  camera.lookAt(0, 0, 0);

  // Responder a cambios de tamaño
  window.addEventListener("resize", () => {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  });

  renderer.render(scene, camera);
}

// ✅ Crear autos
function crearAutos(scene, cantidad, velocidadBase) {
  const colores = [0xff4444, 0x44ff44, 0x4488ff, 0xffff44];

  for (let i = 0; i < cantidad; i++) {
    const ruta = rutas[i % rutas.length];
    const color = colores[i % colores.length];
    const carMaterial = new THREE.MeshPhongMaterial({ color });
    const car = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), carMaterial);

    if (ruta.tipo === "horizontal") {
      car.position.set(-50, 0.5, ruta.z);
    } else if (ruta.tipo === "vertical") {
      car.position.set(ruta.x, 0.5, 50);
      car.rotation.y = Math.PI / 2;
    } else if (ruta.tipo === "diagonal") {
      car.position.set(-50 + ruta.offset, 0.5, 50 - ruta.offset);
      car.rotation.y = -Math.PI / 4;
    }

    cars.push(car);
    carRoutes.push(ruta);
    carSpeeds.push(velocidadBase + Math.random() * 0.02);
    scene.add(car);
  }
}

// ✅ Función para calcular velocidad base
function calcularVelocidadBase(nivel) {
  switch (nivel.toLowerCase()) {
    case "fluido": return 0.1;
    case "moderado": return 0.06;
    case "congestionado": return 0.03;
    default: return 0.06;
  }
}

function animate() {
  if (!running) return;

  const { scene, camera, renderer } = window.simulation;

  // Ciclo de semáforos
  const time = performance.now() * 0.001;
  const cycle = Math.floor(time) % 10 < 5 ? "green" : "red";

  semaforos.forEach(semaforo => {
    const desiredColor = cycle === "green" ? 0x00ff00 : 0xff0000;
    if (semaforo.userData.state !== cycle) {
      semaforo.material.color.setHex(desiredColor);
      semaforo.userData.state = cycle;
    }
  });

  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    const route = carRoutes[i];
    const speed = carSpeeds[i];

    let detener = false;
    semaforos.forEach(semaforo => {
      const dist = car.position.distanceTo(semaforo.position);
      if (dist < 3 && semaforo.userData.state === "red") {
        detener = true;
      }
    });

    if (!detener) {
      if (route.tipo === "horizontal") {
        car.position.x += speed;
        if (car.position.x > 50) car.position.x = -50;
      } else if (route.tipo === "vertical") {
        car.position.z -= speed;
        if (car.position.z < -50) car.position.z = 50;
      } else if (route.tipo === "diagonal") {
        car.position.x += speed;
        car.position.z -= speed;
        if (car.position.x > 50 || car.position.z < -50) {
          car.position.x = -50 + route.offset;
          car.position.z = 50 - route.offset;
        }
      }
    }
  }

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

// ✅ Ajustar número de autos dinámicamente
function ajustarCantidadAutos(cantidad) {
  const { scene } = window.simulation;

  // Limpiar autos actuales
  cars.forEach(car => scene.remove(car));
  cars.length = 0;
  carRoutes.length = 0;
  carSpeeds.length = 0;

  const velocidadBase = calcularVelocidadBase(localStorage.getItem("config_trafico") || "moderado");
  crearAutos(scene, cantidad, velocidadBase);
  console.log(`Se ajustaron ${cantidad} autos en la simulación`);
}

// ✅ Ajustar nivel de tráfico dinámicamente
function ajustarTrafico(nivel) {
  const velocidadBase = calcularVelocidadBase(nivel);
  for (let i = 0; i < carSpeeds.length; i++) {
    carSpeeds[i] = velocidadBase + Math.random() * 0.02;
  }
  console.log(`Velocidad ajustada según tráfico: ${nivel}`);
}

// -----Operaciones básicas-----
function playSim() {
  if (!running) {
    running = true;
    animate();
  }
}

function stopSim() {
  running = false;
  cancelAnimationFrame(animationId);
}

function reloadSim() {
  stopSim();
  for (let i = 0; i < cars.length; i++) {
    const route = carRoutes[i];
    if (route.tipo === 'horizontal') cars[i].position.x = -50;
    else if (route.tipo === 'vertical') cars[i].position.z = 50;
    else if (route.tipo === 'diagonal') {
      cars[i].position.x = -50 + route.offset;
      cars[i].position.z = 50 - route.offset;
    }
  }
  window.simulation.renderer.render(window.simulation.scene, window.simulation.camera);
}

// -----Procesamiento de prompteo-----
async function enviarPrompt() {
  const inputValue = document.getElementById("instruction-input").value.trim();
  if (!inputValue) return console.warn("No hay instrucción para enviar.");

  try {
    const response = await fetch("http://localhost:8000/nlp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: inputValue, max_tokens: 150 })
    });
    const data = await response.json();
    console.log("Respuesta backend NLP:", data);

    const accion = data.status?.toLowerCase() || "";
    if (accion.includes("start")) playSim();
    else if (accion.includes("stop")) stopSim();
    else if (accion.includes("reload")) reloadSim();
  } catch (error) {
    console.error("Error al enviar prompt:", error);
  }
}

//-----Eventos-----
// Botones del frontend conectados al backend
document.getElementById("play-button").addEventListener("click", () => {
  fetch("http://localhost:8000/start")
    .then(res => res.json())
    .then(data => {
      console.log(data.status);
      playSim();  // Activar animación solo si backend respondió correctamente
    });
});

document.getElementById("stop-button").addEventListener("click", () => {
  fetch("http://localhost:8000/stop")
    .then(res => res.json())
    .then(data => {
      console.log(data.status);
      stopSim();  // Pausar animación
    });
});

document.getElementById("reload-button").addEventListener("click", () => {
  fetch("http://localhost:8000/reload")
    .then(res => res.json())
    .then(data => {
      console.log(data.status);
      reloadSim();  // Reiniciar animación
    });
});

//document.getElementById("button-main").addEventListener("click", enviarPrompt);
document.getElementById("send-button").addEventListener("click", enviarPrompt)

// Iniciar
init();

// ----- Control de zoom -----
let zoomLevel = 100; 
const minZoom = 40;
const maxZoom = 350;

function setCameraZoom(newZoom) {
  zoomLevel = Math.max(minZoom, Math.min(maxZoom, newZoom));
  // Mantén la relación Y y Z para visión cenital
  window.simulation.camera.position.set(0, zoomLevel, zoomLevel);
  window.simulation.camera.lookAt(0, 0, 0);
  window.simulation.renderer.render(window.simulation.scene, window.simulation.camera);
}

document.getElementById("zoom-in").addEventListener("click", function() {
  setCameraZoom(zoomLevel - 15);
});
document.getElementById("zoom-out").addEventListener("click", function() {
  setCameraZoom(zoomLevel + 20);
});

//-----Comunicacion entre frontend-backend-----s
// Enviar configuración al backend
const numCars = localStorage.getItem("config_numCars") || "10";
const trafico = localStorage.getItem("config_trafico") || "moderado"

if (!numCars || !trafico) {
  alert("No se ha configurado la simulación. Redirigiendo...");
  window.location.href = "index2.html";
} else {
  fetch("http://localhost:8000/configurar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      numCars: parseInt(numCars),
      trafico: trafico
    })
  })
  .then(res => res.json())
  .then(data => console.log("Cnfiguracion enviada", data));
}


const socket = new WebSocket("ws://localhost:8000/ws");

socket.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  console.log("Mensaje WebSocket:", msg);

  if (msg.numCars) ajustarCantidadAutos(msg.numCars);
  if (msg.trafico) ajustarTrafico(msg.trafico);
  if (msg.accion === "start") playSim();
  else if (msg.accion === "stop") stopSim();
  else if (msg.accion === "reload") reloadSim();
  if (msg.accion === "cambiar_semaforo" && msg.estado) cambiarSemaforo(msg.estado);
};




function enviarComando() {
  const input = document.getElementById("input").value;
  socket.send(input.trim().toLowerCase());
}
