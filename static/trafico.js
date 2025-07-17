let running = false;
let animationId;
const cars = [];
const carRoutes = [];
const carSpeeds = [];
const semaforos = [];

const carBodies = [];
let world;

let estadoSemaforoActual = "red";

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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  // === MUNDO FÍSICO ===
  world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);

  // Suelo físico (invisible)
  const suelo = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane()
  });
  suelo.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(suelo);

  // === LUZ ===
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(20, 40, 20);
  scene.add(light);

  // === CALLES ===
  for (let i = -20; i <= 20; i += 10) {
    crearCalleLarga(scene, 5, 100, 0, { x: 0, z: i });
    crearCalleLarga(scene, 5, 100, Math.PI / 2, { x: i, z: 0 });
  }
  crearCalleLarga(scene, 5, 140, Math.PI / 4, { x: 0, z: 0 });

  // === SEMÁFOROS ===
  crearSemaforo(scene, { x: 0, z: 0 }, "green");
  crearSemaforo(scene, { x: 10, z: -10 }, "red");

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

  const carMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 });

  rutas.forEach(ruta => {
    const car = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), carMaterial);
    let pos = new THREE.Vector3();

    if (ruta.tipo === "horizontal") {
      pos.set(-50, 0.5, ruta.z);
    } else if (ruta.tipo === "vertical") {
      pos.set(ruta.x, 0.5, 50);
      car.rotation.y = Math.PI / 2;
    } else if (ruta.tipo === "diagonal") {
      pos.set(-50 + ruta.offset, 0.5, 50 - ruta.offset);
      car.rotation.y = -Math.PI / 4;
    }

    car.position.copy(pos);
    scene.add(car);
    cars.push(car);
    carRoutes.push(ruta);
    carSpeeds.push(0.08 + Math.random() * 0.04);

    // === Cuerpo físico
    const carShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 1));
    const carBody = new CANNON.Body({
      mass: 5,
      shape: carShape,
      position: new CANNON.Vec3(pos.x, pos.y, pos.z)
    });
    world.addBody(carBody);
    carBodies.push(carBody);
  });

  camera.position.set(0, 50, 50);
  camera.lookAt(0, 0, 0);

  window.simulation = { scene, camera, renderer };
}


function animate() {
  if (!running) return;

  const { scene, camera, renderer } = window.simulation;

  // === Actualizar semáforos
  /*const time = performance.now() * 0.001;
  const ciclo = Math.floor(time) % 10 < 5 ? "green" : "red";

  semaforos.forEach(semaforo => {
    const colorDeseado = ciclo === "green" ? 0x00ff00 : 0xff0000;
    if (semaforo.userData.state !== ciclo) {
      semaforo.material.color.setHex(colorDeseado);
      semaforo.userData.state = ciclo;
    }
  });*/

  // === Avanzar física
  world.step(1 / 60);

  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    const body = carBodies[i];
    const ruta = carRoutes[i];
    const velocidad = carSpeeds[i];

    let detener = false;
    for (const semaforo of semaforos) {
      const dist = car.position.distanceTo(semaforo.position);
      if (dist < 3 && semaforo.userData.state === "red") {
        detener = true;
        break;
      }
    }

    if (!detener) {
      if (ruta.tipo === "horizontal") {
        body.velocity.set(velocidad * 60, 0, 0);
        if (body.position.x > 50) body.position.x = -50;
      } else if (ruta.tipo === "vertical") {
        body.velocity.set(0, 0, -velocidad * 60);
        if (body.position.z < -50) body.position.z = 50;
      } else if (ruta.tipo === "diagonal") {
        body.velocity.set(velocidad * 60, 0, -velocidad * 60);
        if (body.position.x > 50 || body.position.z < -50) {
          body.position.x = -50 + ruta.offset;
          body.position.z = 50 - ruta.offset;
        }
      }
    } else {
      body.velocity.set(0, 0, 0);
    }

    // === Sincronizar Three con Cannon
    car.position.copy(body.position);
    car.quaternion.copy(body.quaternion);
  }

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

//--------------------------------Reajustes a base del NLP----------------------------
function ajustarCantidadAutos(cantidad) {
  const { scene } = window.simulation;

  // Eliminar autos anteriores
  cars.forEach(c => scene.remove(c));
  cars.length = 0;
  carRoutes.length = 0;
  carSpeeds.length = 0;

  // Eliminar cuerpos físicos previos
  carBodies.forEach(b => world.removeBody(b));
  carBodies.length = 0;

  const carMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 });
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

  for (let i = 0; i < cantidad; i++) {
    const ruta = rutas[i % rutas.length];
    const car = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), carMaterial);
    let pos = new THREE.Vector3();

    if (ruta.tipo === "horizontal") {
      pos.set(-50, 0.5, ruta.z);
    } else if (ruta.tipo === "vertical") {
      pos.set(ruta.x, 0.5, 50);
      car.rotation.y = Math.PI / 2;
    } else if (ruta.tipo === "diagonal") {
      pos.set(-50 + ruta.offset, 0.5, 50 - ruta.offset);
      car.rotation.y = -Math.PI / 4;
    }

    car.position.copy(pos);
    scene.add(car);
    cars.push(car);
    carRoutes.push(ruta);
    carSpeeds.push(0.08 + Math.random() * 0.04);

    const carShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 1));
    const carBody = new CANNON.Body({
      mass: 5,
      shape: carShape,
      position: new CANNON.Vec3(pos.x, pos.y, pos.z)
    });

    world.addBody(carBody);
    carBodies.push(carBody);
  }
}


function ajustarTrafico(nivel) {
  let baseSpeed;
  switch (nivel.toLowerCase()) {
    case "bajo":
      baseSpeed = 0.12;
      break;
    case "moderado":
      baseSpeed = 0.08;
      break;
    case "alto":
      baseSpeed = 0.04;
      break;
    default:
      baseSpeed = 0.08;
  }

  for (let i = 0; i < carSpeeds.length; i++) {
    carSpeeds[i] = baseSpeed + Math.random() * 0.02;
  }
}

function cambiarSemaforo(estado) {
  estadoSemaforoActual = estado;
  semaforos.forEach(semaforo => {
    semaforo.material.color.setHex(estado === "green" ? 0x00ff00 : 0xff0000);
    semaforo.userData.state = estado;
  });
}


//--------------------------------Operaciones basicas-------------------------------------------
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
  for (let i = 0; i < carBodies.length; i++) {
    const body = carBodies[i];
    const ruta = carRoutes[i];

    if (ruta.tipo === "horizontal") {
      body.position.set(-50, 0.5, ruta.z);
    } else if (ruta.tipo === "vertical") {
      body.position.set(ruta.x, 0.5, 50);
    } else if (ruta.tipo === "diagonal") {
      body.position.set(-50 + ruta.offset, 0.5, 50 - ruta.offset);
    }

    // Detener el movimiento
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
  }

  // Forzar render inmediato
  window.simulation.renderer.render(window.simulation.scene, window.simulation.camera);
}


//----------------------------Procesamiento de prompt-------------------------------------
async function enviarPrompt() {
  const inputValue = document.getElementById("instruction-input").value;

  const response = await fetch("http://localhost:8000/nlp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: inputValue, max_tokens: 150 })
  });

  const data = await response.json();
  console.log("Respuesta backend NLP:", data);

  const accion = data.status.toLowerCase();
  if (accion.includes("start")) playSim();
  else if (accion.includes("stop")) stopSim();
  else if (accion.includes("reload")) reloadSim();
}


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

// Cambiar a verde
document.getElementById("green-button").addEventListener("click", () => {
  fetch("http://localhost:8000/semaforo?estado=verde", { method: "POST" })
    .then(res => res.json())
    .then(data => {
      console.log("Semáforo cambiado a verde:", data.status);
      cambiarSemaforo("green"); // Actualiza la escena
      document.getElementById("green-button").classList.add("active");
      document.getElementById("red-button").classList.remove("active");
    });
});

// Cambiar a rojo
document.getElementById("red-button").addEventListener("click", () => {
  fetch("http://localhost:8000/semaforo?estado=rojo", { method: "POST" })
    .then(res => res.json())
    .then(data => {
      console.log("Semáforo cambiado a rojo:", data.status);
      cambiarSemaforo("red"); // Actualiza la escena
      document.getElementById("red-button").classList.add("active");
      document.getElementById("green-button").classList.remove("active");
    });
});


document.getElementById("send-button").addEventListener("click", enviarPrompt);


init();

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

socket.onmessage = function(event) {
  const msg = JSON.parse(event.data);
  console.log("Mensaje WebSocket:", msg);

  // Ajustar número de autos
  if (msg.numCars) {
    ajustarCantidadAutos(msg.numCars);
  }

  // Ajustar tráfico
  if (msg.trafico) {
    ajustarTrafico(msg.trafico);
  }

  // Control de simulación
  if (msg.accion === "start") playSim();
  else if (msg.accion === "stop") stopSim();
  else if (msg.accion === "reload") reloadSim();

  // Control de semáforos
  if (msg.accion === "cambiar_semaforo" && msg.estado) {
    cambiarSemaforo(msg.estado); // Actualiza la escena 3D
    if (msg.estado === "verde") {
      document.getElementById("green-button").classList.add("active");
      document.getElementById("red-button").classList.remove("active");
    } else if (msg.estado === "rojo") {
      document.getElementById("red-button").classList.add("active");
      document.getElementById("green-button").classList.remove("active");
    }
  }

};



function enviarComando() {
  const input = document.getElementById("input").value;
  socket.send(input.trim().toLowerCase());
}