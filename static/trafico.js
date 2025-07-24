import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

let scene, camera, renderer;
let running = false;
let animationId;

const autos = [];
const rutasCurvas = {};
const semaforos = [];
const loader = new THREE.TextureLoader();

let zoomLevel = 100; 
const minZoom = 40;
const maxZoom = 350;

// --- Función para crear línea desplazada (bordes de calle) ---
function crearLineaDesplazada(curve, offset, color) {
  const points = [];
  const divisions = 50;

  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions;
    const pt = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    // Normal en XZ plane (horizontal)
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const displacedPt = pt.clone().addScaledVector(normal, offset);
    points.push(displacedPt);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}

// --- Función para crear superficie entre bordes ---
function crearSuperficieCalle(curve, ancho) {
  const divisions = 100;
  const izquierda = [], derecha = [];

  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions;
    const pt = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    izquierda.push(pt.clone().addScaledVector(normal, ancho / 2));
    derecha.push(pt.clone().addScaledVector(normal, -ancho / 2));
  }

  const vertices = [];
  for (let i = 0; i < divisions; i++) {
    vertices.push(
      izquierda[i].x, izquierda[i].y, izquierda[i].z,
      derecha[i].x, derecha[i].y, derecha[i].z,
      izquierda[i + 1].x, izquierda[i + 1].y, izquierda[i + 1].z,

      derecha[i].x, derecha[i].y, derecha[i].z,
      derecha[i + 1].x, derecha[i + 1].y, derecha[i + 1].z,
      izquierda[i + 1].x, izquierda[i + 1].y, izquierda[i + 1].z,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
}

// --- Crear auto con textura y velocidad variable ---
function crearAuto(nombreRuta, icono = 'car1.png', velocidadBase = 0.001) {
  loader.load(`imagenes/${icono}`, texture => {
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 1;

    scene.add(mesh);

    autos.push({
      mesh,
      ruta: rutasCurvas[nombreRuta],
      progreso: Math.random(),
      velocidad: velocidadBase + Math.random() * 0.0015
    });
  });
}

// --- Crear semáforo ---
function crearSemaforo(position, initialState = "red") {
  const color = initialState === "green" ? 0x00ff00 : 0xff0000;
  const geometry = new THREE.BoxGeometry(0.5, 2, 0.5);
  const material = new THREE.MeshPhongMaterial({ color });
  const semaforo = new THREE.Mesh(geometry, material);
  semaforo.position.set(position.x, 1, position.z);
  semaforo.userData = { state: initialState };
  scene.add(semaforo);
  semaforos.push(semaforo);
}

// --- Calcular velocidad base según tráfico ---
function calcularVelocidadBase(nivel) {
  switch (nivel.toLowerCase()) {
    case "fluido": return 0.002;  
    case "moderado": return 0.001;
    case "congestionado": return 0.0005;
    default: return 0.001;
  }
}

// --- Ajustar cantidad de autos ---
function ajustarCantidadAutos(cantidad) {
  autos.forEach(auto => scene.remove(auto.mesh));
  autos.length = 0;

  const velocidadBase = calcularVelocidadBase(localStorage.getItem("config_trafico") || "moderado");
  const iconos = ['car4.png', 'car2.png', 'car3.png'];
  const nombresRutas = Object.keys(rutasCurvas);

  for (let i = 0; i < cantidad; i++) {
    const rutaNombre = nombresRutas[i % nombresRutas.length];
    const icono = iconos[i % iconos.length];
    crearAuto(rutaNombre, icono, velocidadBase);
  }

  console.log(`Se ajustaron ${cantidad} autos en la simulación`);
}

// --- Ajustar velocidades según tráfico ---
function ajustarTrafico(nivel) {
  const velocidadBase = calcularVelocidadBase(nivel);
  autos.forEach(auto => {
    auto.velocidad = velocidadBase + Math.random() * 0.0015;
  });
  console.log(`Velocidad ajustada según tráfico: ${nivel}`);
}

// --- Play, Stop, Reload ---
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
  autos.forEach(auto => auto.progreso = Math.random());
  renderer.render(scene, camera);
}

// --- Animación con semáforos y autos ---
function animate() {
  if (!running) return;

  const time = performance.now() * 0.001;
  const cycle = Math.floor(time) % 10 < 5 ? "green" : "red";

  semaforos.forEach(semaforo => {
    const desiredColor = cycle === "green" ? 0x00ff00 : 0xff0000;
    if (semaforo.userData.state !== cycle) {
      semaforo.material.color.setHex(desiredColor);
      semaforo.userData.state = cycle;
    }
  });

  autos.forEach(auto => {
    // Control detención cerca semáforo rojo
    let detener = false;
    semaforos.forEach(semaforo => {
      const dist = auto.mesh.position.distanceTo(semaforo.position);
      if (dist < 5 && semaforo.userData.state === "red") {
        detener = true;
      }
    });

    if (!detener) {
      auto.progreso += auto.velocidad;
      if (auto.progreso > 1) auto.progreso = 0;
    }

    const pos = auto.ruta.getPointAt(auto.progreso);
    const nextPos = auto.ruta.getPointAt((auto.progreso + 0.01) % 1);
    auto.mesh.position.copy(pos);
    auto.mesh.lookAt(nextPos);
  });

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

// --- Control de zoom ---
function setCameraZoom(newZoom) {
  zoomLevel = Math.max(minZoom, Math.min(maxZoom, newZoom));
  camera.position.set(0, zoomLevel, zoomLevel);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

// --- Inicialización ---
function init() {
  const canvas = document.getElementById("mapaCanvas");

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(0, zoomLevel, zoomLevel);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  scene.add(new THREE.AmbientLight(0xffffff, 1));

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshPhongMaterial({ color: 0xcccccc })
  );
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);

  window.simulation = { scene, camera, renderer };

  fetch('rutas.json')
    .then(res => res.json())
    .then(data => {
      for (const nombre in data) {
        const ruta = data[nombre];
        rutasCurvas[nombre] = new THREE.CatmullRomCurve3(
          ruta.map(p => new THREE.Vector3(p.x, 0, p.y))
        );
      }

      for (const nombre in rutasCurvas) {
        const curve = rutasCurvas[nombre];
        crearSuperficieCalle(curve, 20);
        crearLineaDesplazada(curve, 4, 0x000000);
        crearLineaDesplazada(curve, -4, 0x000000);
        crearLineaDesplazada(curve, 0, 0xffff00);
      }

      // Crear semáforos: ajusta posiciones según tu mapa
      crearSemaforo(new THREE.Vector3(0, 0, 0), "green");
      crearSemaforo(new THREE.Vector3(20, 0, 20), "red");

      // Leer configuración inicial
      const numCars = parseInt(localStorage.getItem("config_numCars")) || 10;
      const trafico = localStorage.getItem("config_trafico") || "moderado";

      ajustarCantidadAutos(numCars);
      ajustarTrafico(trafico);
    })
    .catch(err => console.error("Error al cargar rutas.json:", err));

  // Ajustar cámara al cambiar tamaño ventana
  window.addEventListener("resize", () => {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  });

  renderer.render(scene, camera);
}

// --- NLP: enviar prompt al backend y ejecutar acciones ---
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

// --- Event Listeners para botones y controles ---
document.getElementById("play-button").addEventListener("click", () => {
  fetch("http://localhost:8000/start")
    .then(res => res.json())
    .then(data => {
      console.log(data.status);
      playSim();
    });
});

document.getElementById("stop-button").addEventListener("click", () => {
  fetch("http://localhost:8000/stop")
    .then(res => res.json())
    .then(data => {
      console.log(data.status);
      stopSim();
    });
});

document.getElementById("reload-button").addEventListener("click", () => {
  fetch("http://localhost:8000/reload")
    .then(res => res.json())
    .then(data => {
      console.log(data.status);
      reloadSim();
    });
});

document.getElementById("zoom-in").addEventListener("click", () => {
  setCameraZoom(zoomLevel - 15);
});

document.getElementById("zoom-out").addEventListener("click", () => {
  setCameraZoom(zoomLevel + 20);
});

document.getElementById("send-button").addEventListener("click", enviarPrompt);

// --- Comunicación WebSocket para recibir comandos y configuraciones ---
const socket = new WebSocket("ws://localhost:8000/ws");

socket.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  console.log("Mensaje WebSocket:", msg);

  if (msg.numCars !== undefined) ajustarCantidadAutos(msg.numCars);
  if (msg.trafico) ajustarTrafico(msg.trafico);

  if (msg.accion === "start") playSim();
  else if (msg.accion === "stop") stopSim();
  else if (msg.accion === "reload") reloadSim();

  if (msg.accion === "cambiar_semaforo" && msg.estado) {
    // Cambiar semáforos según msg.estado (implementa lógica si quieres)
    semaforos.forEach(semaforo => {
      if (semaforo.userData.state !== msg.estado) {
        const color = msg.estado === "green" ? 0x00ff00 : 0xff0000;
        semaforo.material.color.setHex(color);
        semaforo.userData.state = msg.estado;
      }
    });
  }
};

// --- Enviar comando desde input por WebSocket ---
function enviarComando() {
  const input = document.getElementById("input").value;
  socket.send(input.trim().toLowerCase());
}

// --- Enviar configuración inicial al backend ---
const numCars = localStorage.getItem("config_numCars") || "10";
const trafico = localStorage.getItem("config_trafico") || "moderado";

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
  .then(data => console.log("Configuración enviada", data));
}

// --- Inicializar todo ---
init();