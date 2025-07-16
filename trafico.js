let running = false;
let animationId;
const cars = [];
const carRoutes = [];
const carSpeeds = [];
const semaforos = [];

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

  // Fondo y niebla
  scene.background = new THREE.Color(0xa0a0a0);
  scene.fog = new THREE.Fog(0xa0a0a0, 50, 200);

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

  // Rutas posibles
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

  // Escalar velocidad según condición de tráfico
  let velocidadBase;
  switch (trafico) {
    case "fluido":
      velocidadBase = 0.1;
      break;
    case "moderado":
      velocidadBase = 0.06;
      break;
    case "congestionado":
      velocidadBase = 0.03;
      break;
    default:
      velocidadBase = 0.06;
  }

  // Autos
  const colores = [0xff4444, 0x44ff44, 0x4488ff, 0xffff44];

  for (let i = 0; i < numCars; i++) {
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

// Eventos
document.getElementById("play-button").addEventListener("click", playSim);
document.getElementById("stop-button").addEventListener("click", stopSim);
document.getElementById("reload-button").addEventListener("click", reloadSim);

// Iniciar
init();
