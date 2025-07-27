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
let modoAgregarBloqueo = false;
let modoEliminarBloqueo = false;
const bloqueos = [];
const bloqueoMeshes = [];

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
  const colores = {
    red: 0xff0000,
    yellow: 0xffff00,
    green: 0x00ff00
  };

  const grupo = new THREE.Group();

  // Poste
  const poste = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  poste.position.y = 4;
  grupo.add(poste);

  // Caja del semáforo
  const caja = new THREE.Mesh(
    new THREE.BoxGeometry(1, 3, 1),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );
  caja.position.y = 6;
  grupo.add(caja);

  // Luces (esferas)
  const estados = ["red", "yellow", "green"];
  estados.forEach((estado, i) => {
    const luz = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshStandardMaterial({
        color: colores[estado],
        emissive: initialState === estado ? colores[estado] : 0x000000
      })
    );
    luz.position.set(0, 6.9 - i * 0.9, 0.6); // Posiciones verticales dentro de la caja
    luz.name = estado;
    grupo.add(luz);
  });

  grupo.position.set(position.x, 0, position.z);
  grupo.scale.set(5, 5, 5); // ⬅️ Aumenta el tamaño 5 veces
  grupo.userData.state = initialState;

  scene.add(grupo);
  semaforos.push(grupo);
}



function createCar(color) {
  const carGroup = new THREE.Group();

  // Cuerpo del coche
  const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 2);
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 1;
  body.castShadow = true;
  carGroup.add(body);

  // Techo
  const roofGeometry = new THREE.BoxGeometry(2.5, 1, 1.8);
  const roofMaterial = new THREE.MeshLambertMaterial({ color: color });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.set(0, 2, 0);
  roof.castShadow = true;
  carGroup.add(roof);

  // Ruedas
  const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
  const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });

  const positions = [
    { x: 1.3, y: 0.4, z: 1.2 },
    { x: 1.3, y: 0.4, z: -1.2 },
    { x: -1.3, y: 0.4, z: 1.2 },
    { x: -1.3, y: 0.4, z: -1.2 }
  ];

  positions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(pos.x, pos.y, pos.z);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    carGroup.add(wheel);
  });
carGroup.scale.set(2, 2, 2); // Escala el auto 1.5 veces más grande

  return {
    group: carGroup
  };
}

function crearAutos(cantidad, velocidadBase) {
  const rutasKeys = Object.keys(rutasAutos);
  const colores = [0xFF0000, 0x0000FF, 0x00FF00, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFA500, 0x800080];

  for (let i = 0; i < cantidad; i++) {
    const rutaSeleccionada = rutasKeys[i % rutasKeys.length];
    const callesDeRuta = rutasAutos[rutaSeleccionada]
      .map(c => calles[c])
      .filter(calle => calle); // Asegura que existan las calles
    const puntos = callesDeRuta.flat();
    if (puntos.length < 2) continue;

    const color = colores[i % colores.length];
    const auto = createCar(color); // usa el auto hecho con geometría simple
    auto.group.position.set(puntos[0].x, 0.5, puntos[0].y); // posición inicial

    auto.group.userData = {
      ruta: puntos,
      index: 0,
      t: 0
    };

    cars.push(auto.group);
    carRoutes.push(puntos);
    carSpeeds.push(velocidadBase + Math.random() * 0.02);
    scene.add(auto.group);
  }
}


//Obstruccion en calles
function crearBloqueo(scene, position, radio = 5) {
  const geometry = new THREE.CircleGeometry(radio, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0xffaa00, opacity: 0.5, transparent: true });
  const bloqueo = new THREE.Mesh(geometry, material);
  bloqueo.rotation.x = -Math.PI / 2;
  bloqueo.position.set(position.x, 0.01, position.z);
  scene.add(bloqueo);

  bloqueos.push({ position, radio });
  bloqueoMeshes.push(bloqueo);
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

  const colores = {
    red: 0xff0000,
    yellow: 0xffff00,
    green: 0x00ff00
  };

  semaforos.forEach(semaforo => {
    const estados = ["red", "yellow", "green"];
    estados.forEach(color => {
      const luz = semaforo.getObjectByName(color);
      if (luz && luz.material && luz.material.emissive) {
        luz.material.emissive.setHex(color === state ? colores[color] : 0x000000);
      }
    });
    semaforo.userData.state = state;
  });
}



function moverAutos(delta) {
  cars.forEach((car, i) => {
    const puntos = car.userData.ruta;
    const index = car.userData.index;
    const speed = carSpeeds[i];
    let detener = false;

    // Verificar semáforos
    semaforos.forEach(semaforo => {
      const dist = car.position.distanceTo(semaforo.position);
      if (dist < 3 && semaforo.userData.state === "red") detener = true;
    });

    // Verificar bloqueos
    bloqueos.forEach(b => {
      const dist = car.position.distanceTo(new THREE.Vector3(b.position.x, 0, b.position.z));
      if (dist < b.radio) detener = true;
    });

    // Verificar si la ruta del auto tiene bloqueo
    if (rutaTieneBloqueo(puntos)) {
      detener = true;

      // Si no tiene temporizador, lo creamos
      if (!car.userData.waitStart) {
        car.userData.waitStart = performance.now();
      } else {
        const elapsed = (performance.now() - car.userData.waitStart) / 1000; // en segundos
        if (elapsed >= 3) {
          cambiarRutaAuto(car);
          car.userData.waitStart = null; // reiniciamos temporizador
        }
      }
    } else {
      // Si ya no hay bloqueo, limpiamos el temporizador
      car.userData.waitStart = null;
    }


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

//----- Operaciones extra -----
function rutaTieneBloqueo(ruta) {
  return ruta.some(punto => {
    return bloqueos.some(b => {
      const dist = new THREE.Vector3(punto.x, 0, punto.y)
        .distanceTo(new THREE.Vector3(b.position.x, 0, b.position.z));
      return dist < b.radio;
    });
  });
}

function cambiarRutaAuto(car) {
  const rutasKeys = Object.keys(rutasAutos);
  const rutasDisponibles = rutasKeys.filter(key => {
    const callesDeRuta = rutasAutos[key].map(c => calles[c]).flat();
    return !rutaTieneBloqueo(callesDeRuta);
  });

  if (rutasDisponibles.length > 0) {
    const nuevaRutaKey = rutasDisponibles[Math.floor(Math.random() * rutasDisponibles.length)];
    const nuevaRuta = rutasAutos[nuevaRutaKey].map(c => calles[c]).flat();
    car.userData.ruta = nuevaRuta;
    car.userData.index = 0;
    car.userData.t = 0;
    console.log(`Auto reasignado a ruta: ${nuevaRutaKey}`);
  } else {
    console.warn("No hay rutas alternativas disponibles");
  }
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


  scene = new THREE.Scene();


  const loader = new THREE.TextureLoader();
  loader.load(
    'imagenes/cielo4.png',
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
  const groundTexture = textureLoader.load('imagenes/pasto.jpg');

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
ground.userData.type = "ground";



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
  

  crearSemaforo({ x: -92, z: 0 }, "green");
  crearSemaforo({ x: -5, z: -82 }, "red");

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

document.getElementById("add-bloqueo").addEventListener("click", () => {
  modoAgregarBloqueo = true;
  modoEliminarBloqueo = false;
  console.log("Modo: agregar bloqueo");
});

document.getElementById("remove-bloqueo").addEventListener("click", () => {
  modoEliminarBloqueo = true;
  modoAgregarBloqueo = false;
  console.log("Modo: eliminar bloqueo");
});

document.getElementById("clear-bloqueos").addEventListener("click", () => {
  bloqueos.length = 0;
  bloqueoMeshes.forEach(mesh => scene.remove(mesh));
  bloqueoMeshes.length = 0;
  console.log("Todos los bloqueos eliminados");
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.getElementById("mapaCanvas").addEventListener("click", (event) => {
  const rect = event.target.getBoundingClientRect();
  const canvas = event.target;
  mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;


  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (modoAgregarBloqueo) {
    // Agregar bloqueo solo en el suelo
    const suelo = intersects.find(obj => obj.object.userData.type === "ground");

    if (suelo) {
      const punto = suelo.point;
      crearBloqueo(scene, { x: punto.x, z: punto.z }, 6);
      console.log(`Bloqueo agregado en X=${punto.x.toFixed(2)}, Z=${punto.z.toFixed(2)}`);
    }
    modoAgregarBloqueo = false;
  }

  if (modoEliminarBloqueo) {
    // Eliminar si se clickea un bloqueo
    const bloqueoHit = intersects.find(obj => bloqueoMeshes.includes(obj.object));

    if (bloqueoHit) {
      const index = bloqueoMeshes.indexOf(bloqueoHit.object);
      if (index !== -1) {
        scene.remove(bloqueoMeshes[index]);
        bloqueoMeshes.splice(index, 1);
        bloqueos.splice(index, 1);
        console.log(`Bloqueo eliminado en índice ${index}`);
      }
    }
    modoEliminarBloqueo = false;
  }
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
