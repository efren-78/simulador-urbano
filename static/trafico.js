let running = false;
let animationId;
const cars = [];
const carRoutes = [];
const carSpeeds = [];
const semaforos = [];
let carModel = null;
let calles = {};
let scene, camera, renderer, controls;
const clock = new THREE.Clock();
let zoomLevel = 100;
let rutasAutos = {};
const callesMeshes = [];

// ----- CARGA DE RECURSOS -----
//Carpeta /json
async function cargarCalles() {
  try {
    const response = await fetch('json/rutas.json');
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    calles = await response.json();
    console.log('Calles cargadas:', calles);
    return true;
  } catch (error) {
    console.error('Error cargando calles:', error);
    return false;
  }
}

//Carpeta /json
async function cargarRutasAutos() {
  try {
    const response = await fetch('json/rutas_autos.json');
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    rutasAutos = await response.json();
    console.log('Rutas de autos cargadas:', rutasAutos);
    return true;
  } catch (error) {
    console.error('Error cargando rutas de autos:', error);
    return false;
  }
}

//Carpeta /models
async function cargarModeloCar() {
  return new Promise((resolve, reject) => {
    const loader = new THREE.GLTFLoader();
    loader.load('models/car.glb', (gltf) => {
      console.log('Modelo GLB cargado');
      const model = gltf.scene;
      model.scale.set(3.5, 3.5, 3.5);
      resolve(model);
    }, undefined, reject);
  });
}


// ----- CREACIÓN DE ELEMENTOS -----
//Esta funcion ya no se usa a menos que se quiera una calle fija
/*function crearCalleLarga(width, length, rotationY = 0, position = { x: 0, z: 0 }) {
  const geometry = new THREE.PlaneGeometry(width, length);
  const material = new THREE.MeshPhongMaterial({ color: 0x2c2c2c });
  const calle = new THREE.Mesh(geometry, material);
  calle.rotation.x = -Math.PI / 2;
  calle.rotation.z = rotationY;
  calle.position.set(position.x, 0, position.z);
  scene.add(calle);
}*/

//Semaforo simple
//Corregir posicion, falta modelado 3d
function crearSemaforo(position, initialState = "red") {
  const color = initialState === "green" ? 0x00ff00 : 0xff0000;
  const geometry = new THREE.BoxGeometry(4, 4, 4);
  const material = new THREE.MeshPhongMaterial({ color });
  const semaforo = new THREE.Mesh(geometry, material);
  semaforo.position.set(position.x, 1, position.z);
  semaforo.userData = { state: initialState };
  scene.add(semaforo);
  semaforos.push(semaforo);
}


function crearAutos(cantidad, velocidadBase) {
  const rutasKeys = Object.keys(rutasAutos);

  for (let i = 0; i < cantidad; i++) {
    const rutaSeleccionada = rutasKeys[i % rutasKeys.length];
    const callesDeRuta = rutasAutos[rutaSeleccionada]
      .map(c => calles[c])
      .filter(calle => calle); // Filtra calles inexistentes
    const puntos = callesDeRuta.flat();

    const clone = carModel.clone(true);
    clone.position.set(puntos[0].x, 0.5, puntos[0].y);
    clone.userData = { ruta: puntos, index: 0, t: 0 };
    cars.push(clone);
    carRoutes.push(puntos);
    carSpeeds.push(velocidadBase + Math.random() * 0.02);
    scene.add(clone);
  }
}

function dibujarCallesDesdeJSON() {
  // Eliminar las calles anteriores
  callesMeshes.forEach(mesh => scene.remove(mesh));
  callesMeshes.length = 0;

  Object.keys(calles).forEach(calleKey => {
    const puntos = calles[calleKey];
    if (puntos.length < 2) return;

    const p1 = puntos[0];
    const p2 = puntos[1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const longitud = Math.sqrt(dx * dx + dy * dy);
    const ancho = 1;

    const angulo = Math.atan2(dy, dx);
    const posX = (p1.x + p2.x) / 2;
    const posZ = (p1.y + p2.y) / 2;

    // Calle amarilla
    const geometryAmarilla = new THREE.PlaneGeometry(longitud, ancho);
    const materialAmarilla = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide
    });

    const meshAmarillo = new THREE.Mesh(geometryAmarilla, materialAmarilla);
    meshAmarillo.rotation.x = -Math.PI / 2;
    meshAmarillo.rotation.z = -angulo;
    meshAmarillo.position.set(posX, 0.01, posZ);
    scene.add(meshAmarillo);
    callesMeshes.push(meshAmarillo);

    // Borde lateral negro (ambos lados)
    const offset = 1.9; // Distancia lateral del borde desde el centro
    const offsetX = -Math.sin(angulo) * offset;
    const offsetZ = Math.cos(angulo) * offset;

    const geometryBorde = new THREE.PlaneGeometry(longitud, 3); // Borde delgado
    const materialBorde = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide
    });

    // Borde derecho
    const bordeDerecho = new THREE.Mesh(geometryBorde, materialBorde);
    bordeDerecho.rotation.x = -Math.PI / 2;
    bordeDerecho.rotation.z = -angulo;
    bordeDerecho.position.set(posX + offsetX, 0.011, posZ + offsetZ);
    scene.add(bordeDerecho);
    callesMeshes.push(bordeDerecho);

    // Borde izquierdo
    const bordeIzquierdo = new THREE.Mesh(geometryBorde, materialBorde);
    bordeIzquierdo.rotation.x = -Math.PI / 2;
    bordeIzquierdo.rotation.z = -angulo;
    bordeIzquierdo.position.set(posX - offsetX, 0.011, posZ - offsetZ);
    scene.add(bordeIzquierdo);
    callesMeshes.push(bordeIzquierdo);
  });
}




// ----- Animacion -----
function animate() {
  if (!running) return;
  const delta = clock.getDelta();

  actualizarSemaforos();
  moverAutos(delta);

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

// -----Funcionalidad de objetos-----
function actualizarSemaforos() {
  const time = performance.now() * 0.001;
  let state = "red";
  if (time % 10 < 4) state = "green";
  else if (time % 10 < 5) state = "yellow";

  semaforos.forEach(semaforo => {
    let color = 0xff0000;
    if (state === "green") color = 0x00ff00;
    else if (state === "yellow") color = 0xffff00;
    semaforo.material.color.setHex(color);
    semaforo.userData.state = state;
  });
}

function moverAutos(delta) {
  cars.forEach((car, i) => {
    const puntos = car.userData.ruta;
    const index = car.userData.index;
    const speed = carSpeeds[i];
    let detener = false;

    semaforos.forEach(semaforo => {
      const dist = car.position.distanceTo(semaforo.position);
      if (dist < 3 && semaforo.userData.state === "red") detener = true;
    });

    if (!detener) {
      let p1 = puntos[index];
      let p2 = puntos[index + 1];
      if (!p2) {
        car.userData.index = 0;
        car.userData.t = 0;
        p1 = puntos[0];
        p2 = puntos[1];
      }
      car.userData.t += speed * delta * 60;
      if (car.userData.t >= 1) {
        car.userData.index++;
        car.userData.t = 0;
      }
      const x = THREE.MathUtils.lerp(p1.x, p2.x, car.userData.t);
      const z = THREE.MathUtils.lerp(p1.y, p2.y, car.userData.t);
      car.position.set(x, 0.5, z);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      car.rotation.y = -angle;
    }
  });
}

function calcularVelocidadBase(nivel) {
  switch (nivel.toLowerCase()) {
    case "fluido": return 0.001;
    case "moderado": return 0.0006;
    case "congestionado": return 0.0003;
    default: return 0.001;
  }
}

// ----- Operaciones basicas -----
function playSim() {
  if (!running) {
    running = true;
    clock.start();
    animate(); //Reanuda simulacion
  }
}

function stopSim() {
  running = false;
  cancelAnimationFrame(animationId); //Detiene simulacion
}

function reloadSim() {
  stopSim();
  cars.forEach((car, i) => {
    const puntos = carRoutes[i];
    car.position.set(puntos[0].x, 0.5, puntos[0].y);
    car.userData.index = 0;
    car.userData.t = 0;
  });
  renderer.render(scene, camera);
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

// ----- Inicializacion -----
async function init() {
  await cargarCalles();
  await cargarRutasAutos();
  carModel = await cargarModeloCar();


  scene = new THREE.Scene();


  const loader = new THREE.TextureLoader();
loader.load(
  'imagenes/Cielo4.png',
  function (texture) {
    console.log('✅ Imagen cargada correctamente');
    scene.background = texture;
  },
  undefined,
  function (err) {
    console.error('❌ Error cargando la imagen', err);
  }
);



  const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load('imagenes/suelo.png');

groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(10, 10); // Repetir la textura en el suelo

const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture
});

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  groundMaterial
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);



  const canvas = document.getElementById("mapaCanvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 100, 100);
  camera.lookAt(0, 0, 0);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(20, 40, 20);
  scene.add(light);

  dibujarCallesDesdeJSON();
  

  crearSemaforo({ x: -90, z: 0 }, "green");
  crearSemaforo({ x: -5, z: -80 }, "red");

  const numCars = 5; // Lo ajusta backend después
  const trafico = "moderado";
  crearAutos(numCars, calcularVelocidadBase(trafico));

  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', init);

// ----- Eventos -----
document.getElementById("play-button").addEventListener("click", () => {
  fetch("http://localhost:8000/start").then(res => res.json()).then(() => playSim());
});
document.getElementById("stop-button").addEventListener("click", () => {
  fetch("http://localhost:8000/stop").then(res => res.json()).then(() => stopSim());
});
document.getElementById("reload-button").addEventListener("click", () => {
  fetch("http://localhost:8000/reload").then(res => res.json()).then(() => reloadSim());
});

//document.getElementById("button-main").addEventListener("click", enviarPrompt);
document.getElementById("send-button").addEventListener("click", enviarPrompt)

// ----- Conexion websocket -----
async function sincronizarEstado() {
  try {
    const estado = await fetch("http://localhost:8000/estado").then(r => r.json());
    console.log("Estado sincronizado:", estado);

    ajustarCantidadAutos(estado.numCars);
    ajustarTrafico(estado.trafico);
    if (estado.running) playSim();
  } catch (err) {
    console.error("Error sincronizando estado:", err);
  }
}

sincronizarEstado();

// Enviar configuración al backend
async function configurarSiNecesario() {
  try {
    // Consultar estado actual
    const estado = await fetch("http://localhost:8000/estado").then(r => r.json());
    console.log("Estado actual:", estado);

    // Si ya hay simulación corriendo, NO mandar configuración
    if (estado.running) {
      console.log("Simulación en curso, no se reconfigura.");
      return;
    }

    // Si no hay simulación activa, configurar con localStorage
    const numCars = localStorage.getItem("config_numCars") || "10";
    const trafico = localStorage.getItem("config_trafico") || "moderado";

    if (!numCars || !trafico) {
      alert("No se ha configurado la simulación. Redirigiendo...");
      window.location.href = "index2.html";
    } else {
      await fetch("http://localhost:8000/configurar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numCars: parseInt(numCars),
          trafico: trafico
        })
      });
      console.log("Configuración aplicada desde trafico.js");
    }
  } catch (err) {
    console.error("Error verificando estado:", err);
  }
}

configurarSiNecesario();

const socket = new WebSocket("ws://localhost:8000/ws");
socket.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  console.log("Mensaje WS:", msg);

  if (msg.numCars) ajustarCantidadAutos(msg.numCars);
  if (msg.trafico) ajustarTrafico(msg.trafico);
  if (msg.accion === "start") playSim();
  else if (msg.accion === "stop") stopSim();
  else if (msg.accion === "reload") reloadSim();
};

// Ajustar cantidad de autos
function ajustarCantidadAutos(cantidad) {
  cars.forEach(car => scene.remove(car));
  cars.length = 0;
  carRoutes.length = 0;
  carSpeeds.length = 0;
  crearAutos(cantidad, calcularVelocidadBase("moderado"));
}

// Ajustar tráfico
function ajustarTrafico(nivel) {
  const velocidadBase = calcularVelocidadBase(nivel);
  for (let i = 0; i < carSpeeds.length; i++) {
    carSpeeds[i] = velocidadBase + Math.random() * 0.02;
  }
}

// ----- ZOOM -----
function setCameraZoom(newZoom) {
  zoomLevel = Math.max(40, Math.min(350, newZoom));
  camera.position.set(0, zoomLevel, zoomLevel);
  camera.lookAt(0, 0, 0);
}
document.getElementById("zoom-in").addEventListener("click", () => setCameraZoom(zoomLevel - 15));
document.getElementById("zoom-out").addEventListener("click", () => setCameraZoom(zoomLevel + 20));
