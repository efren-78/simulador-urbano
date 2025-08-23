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

let currentView = "top"; // top | street | follow | dron
let followCar = null; // auto a seguir (por ahora null)

let mostrarNombresCalles = false;
let grafoCalles = new Map();

// ----- CARGA DE RECURSOS -----
//Calles
async function cargarCalles() {
  try {
    const response = await fetch("json/rutas.json");
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    calles = await response.json();
    console.log("Calles cargadas:", calles);
    return true;
  } catch (error) {
    console.error("Error cargando calles:", error);
    return false;
  }
}

//Rutas a base de las calles previas
async function cargarRutasAutos() {
  try {
    const response = await fetch("json/rutas_autos.json");
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    rutasAutos = await response.json();
    console.log("Rutas de autos cargadas:", rutasAutos);
    return true;
  } catch (error) {
    console.error("Error cargando rutas de autos:", error);
    return false;
  }
}

// ----- CONSTRUCCION DE CALLES COMO GRAFO ------
function clave(p) {
  return `${p.x},${p.y}`;
}

function construirGrafo() {
  grafoCalles.clear(); // Reiniciar

  Object.keys(calles).forEach((calleKey) => {
    const puntos = calles[calleKey];

    for (let i = 0; i < puntos.length - 1; i++) {
      const p1 = puntos[i];
      const p2 = puntos[i + 1];

      const k1 = clave(p1);
      const k2 = clave(p2);

      if (!grafoCalles.has(k1)) grafoCalles.set(k1, []);
      if (!grafoCalles.has(k2)) grafoCalles.set(k2, []);

      grafoCalles.get(k1).push({ destino: k2, coord: p2 });
      grafoCalles.get(k2).push({ destino: k1, coord: p1 }); // Bidireccional
    }
  });

  console.log("Grafo construido:", grafoCalles);
  console.log("Nodos en grafo:", grafoCalles.size);
}

// ----- CREACIÓN DE ELEMENTOS -----
function crearEscuela(posicion = { x: 0, z: 0 }, escala = 1) {
  const grupo = new THREE.Group();

  // Edificio (paredes azules)
  const edificio = new THREE.Mesh(
    new THREE.BoxGeometry(10, 6, 6),
    new THREE.MeshPhongMaterial({ color: 0x3366cc }) // azul
  );
  edificio.position.y = 3;
  grupo.add(edificio);

  // Techo rojo
  const techo = new THREE.Mesh(
    new THREE.ConeGeometry(7, 3, 4),
    new THREE.MeshPhongMaterial({ color: 0xcc3333 }) // rojo
  );
  techo.position.y = 7.5;
  techo.rotation.y = Math.PI / 4;
  grupo.add(techo);

  // Puerta amarilla
  const puerta = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2.5, 0.2),
    new THREE.MeshPhongMaterial({ color: 0xffcc00 }) // amarillo
  );
  puerta.position.set(0, 1.25, 3.1);
  grupo.add(puerta);

  // Ventanas blancas
  function crearVentana(x, y, z) {
    const ventana = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    ventana.position.set(x, y, z);
    grupo.add(ventana);
  }

  crearVentana(-3, 4, 3.05);
  crearVentana(3, 4, 3.05);
  crearVentana(-3, 4, -3.05);
  crearVentana(3, 4, -3.05);

  // Posicionar y escalar el grupo completo
  grupo.position.set(posicion.x, 0, posicion.z);
  grupo.scale.set(3, 3, 3); // ESCALA UNIFORME
  scene.add(grupo);
}

//Semaforo simple
function crearSemaforo(position, initialState = "red") {
  const colores = {
    red: 0xff0000,
    yellow: 0xffff00,
    green: 0x00ff00,
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
        emissive: initialState === estado ? colores[estado] : 0x000000,
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

//Carro simple
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
    { x: -1.3, y: 0.4, z: -1.2 },
  ];

  positions.forEach((pos) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(pos.x, pos.y, pos.z);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    carGroup.add(wheel);
  });
  carGroup.scale.set(2, 2, 2); // Escala el auto 1.5 veces más grande

  return {
    group: carGroup,
  };
}

//Multiples autos
function crearAutos(cantidad, velocidadBase) {
  const rutasKeys = Object.keys(rutasAutos);
  const colores = [
    0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500,
    0x800080,
  ];

  for (let i = 0; i < cantidad; i++) {
    const rutaSeleccionada = rutasKeys[i % rutasKeys.length];

    // Obtener calles de la ruta, solo si existen en calles
    const callesDeRuta = rutasAutos[rutaSeleccionada]
      .map((nombreCalle) => calles[nombreCalle])
      .filter((calle) => calle && calle.length > 0);

    // Aplanar puntos de todas las calles para formar la ruta completa
    const puntos = callesDeRuta.flat();

    if (puntos.length < 2) {
      console.warn(
        `Ruta '${rutaSeleccionada}' tiene menos de 2 puntos. Auto no creado.`
      );
      continue; // No crear auto si la ruta no tiene puntos suficientes
    }

    const color = colores[i % colores.length];
    const auto = createCar(color);

    // Posición inicial en el primer punto de la ruta
    auto.group.position.set(puntos[0].x, 0.5, puntos[0].y);

    auto.group.userData = {
      ruta: puntos,
      index: 0,
      t: 0,
    };

    cars.push(auto.group);
    carRoutes.push(puntos);
    carSpeeds.push(velocidadBase + Math.random() * 0.02);
    scene.add(auto.group);
  }
}

function dibujarCalles() {
  // Eliminar las calles anteriores
  callesMeshes.forEach((mesh) => scene.remove(mesh));
  callesMeshes.length = 0;

  Object.keys(calles).forEach((calleKey) => {
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
      side: THREE.DoubleSide,
    });

    const meshAmarillo = new THREE.Mesh(geometryAmarilla, materialAmarilla);
    meshAmarillo.rotation.x = -Math.PI / 2;
    meshAmarillo.rotation.z = -angulo;
    meshAmarillo.position.set(posX, 0.01, posZ);
    scene.add(meshAmarillo);
    callesMeshes.push(meshAmarillo);

    // Borde lateral negro (ambos lados)
    const offset = 1.9;
    const offsetX = -Math.sin(angulo) * offset;
    const offsetZ = Math.cos(angulo) * offset;

    const geometryBorde = new THREE.PlaneGeometry(longitud, 3);
    const materialBorde = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
    });

    const bordeDerecho = new THREE.Mesh(geometryBorde, materialBorde);
    bordeDerecho.rotation.x = -Math.PI / 2;
    bordeDerecho.rotation.z = -angulo;
    bordeDerecho.position.set(posX + offsetX, 0.011, posZ + offsetZ);
    scene.add(bordeDerecho);
    callesMeshes.push(bordeDerecho);

    const bordeIzquierdo = new THREE.Mesh(geometryBorde, materialBorde);
    bordeIzquierdo.rotation.x = -Math.PI / 2;
    bordeIzquierdo.rotation.z = -angulo;
    bordeIzquierdo.position.set(posX - offsetX, 0.011, posZ - offsetZ);
    scene.add(bordeIzquierdo);
    callesMeshes.push(bordeIzquierdo);

    if (mostrarNombresCalles) {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const context = canvas.getContext("2d");

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = "bold 100px 'Times New Roman', serif";
      context.textAlign = "center";
      context.textBaseline = "middle";

      context.lineWidth = 8;
      context.strokeStyle = "black";
      context.strokeText(calleKey, canvas.width / 2, canvas.height / 2);

      context.fillStyle = "white";
      context.fillText(calleKey, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      texture.minFilter = THREE.LinearFilter;

      const materialText = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      });
      const sprite = new THREE.Sprite(materialText);
      sprite.scale.set(20, 5, 1);
      sprite.position.set(posX, 2.5, posZ);
      sprite.rotation.z = -angulo;

      scene.add(sprite);
      callesMeshes.push(sprite);
    }
  });
}

// ----- ANIMACION -----
function animate() {
  if (!running) return;
  const delta = clock.getDelta();

  actualizarSemaforos();

  actualizarSemaforos();
  moverAutos(delta);

  updateCamera();

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

// -----FUNCIONALIDAD DE OBJETOS-----
function actualizarSemaforos() {
  const time = performance.now() * 0.001;
  let state = "red";
  if (time % 10 < 4) state = "green";
  else if (time % 10 < 5) state = "yellow";

  const colores = {
    red: 0xff0000,
    yellow: 0xffff00,
    green: 0x00ff00,
  };

  semaforos.forEach((semaforo) => {
    const estados = ["red", "yellow", "green"];
    estados.forEach((color) => {
      const luz = semaforo.getObjectByName(color);
      if (luz && luz.material && luz.material.emissive) {
        luz.material.emissive.setHex(
          color === state ? colores[color] : 0x000000
        );
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

    if (!puntos || puntos.length < 2) return;

    // Verificar semáforos
    semaforos.forEach((semaforo) => {
      const dist = car.position.distanceTo(semaforo.position);
      if (dist < 3 && semaforo.userData.state === "red") detener = true;
    });

    // Verificar bloqueos
    bloqueos.forEach((b) => {
      const dist = car.position.distanceTo(
        new THREE.Vector3(b.position.x, 0, b.position.z)
      );
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
      car.userData.waitStart = null; // limpiar si ya no hay bloqueo
    }

    // Verificar colisiones entre autos
    verificarColisiones(car);

    if (!detener) {
      // Si ya llegó al final de su ruta, asignar una nueva
      if (index >= puntos.length - 1) {
        const posActual = { x: car.position.x, y: car.position.z };
        const siguienteInterseccion = obtenerInterseccionAleatoria(
          car.position
        );
        const nuevaRuta = calcularRutaDesde(posActual, siguienteInterseccion);

        if (nuevaRuta && nuevaRuta.length >= 2) {
          car.userData.ruta = nuevaRuta;
          car.userData.index = 0;
          car.userData.t = 0;
        } else {
          console.warn("No se pudo generar nueva ruta, auto detenido.");
          return;
        }
      }

      let p1 = puntos[car.userData.index];
      let p2 = puntos[car.userData.index + 1];
      if (!p1 || !p2) return; // seguridad extra

      // Movimiento a lo largo del segmento
      car.userData.t += speed * delta * 60;
      if (car.userData.t >= 1) {
        car.userData.index++;
        car.userData.t = 0;
      }

      // Recalcular p1 y p2 si avanzó de segmento
      p1 = puntos[car.userData.index];
      p2 = puntos[car.userData.index + 1];
      if (!p1 || !p2) return;

      const x = THREE.MathUtils.lerp(p1.x, p2.x, car.userData.t);
      const z = THREE.MathUtils.lerp(p1.y, p2.y, car.userData.t);
      car.position.set(x, 0.5, z);

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      car.rotation.y = -angle;

      if (
        !car.userData.ruta ||
        car.userData.index >= car.userData.ruta.length - 1
      ) {
        reasignarRutaAuto(car);
      }
    }
  });
}

// ----- FUNCIONALIDADES EXTRA -----

function calcularVelocidadBase(nivel) {
  switch (nivel.toLowerCase()) {
    case "fluido":
      return 0.001;
    case "moderado":
      return 0.0006;
    case "congestionado":
      return 0.0003;
    default:
      return 0.001;
  }
}

function verificarColisiones(car) {
  cars.forEach((otroAuto) => {
    if (car !== otroAuto) {
      const distancia = car.position.distanceTo(otroAuto.position);
      if (distancia < 2) {
        // Si están demasiado cerca
        car.userData.waitStart = performance.now(); // Detener el auto temporalmente
      }
    }
  });
}

//Obstruccion en calles
function crearBloqueo(scene, position, radio = 5) {
  const geometry = new THREE.CircleGeometry(radio, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    opacity: 0.5,
    transparent: true,
  });
  const bloqueo = new THREE.Mesh(geometry, material);
  bloqueo.rotation.x = -Math.PI / 2;
  bloqueo.position.set(position.x, 0.01, position.z);
  scene.add(bloqueo);

  bloqueos.push({ position, radio });
  bloqueoMeshes.push(bloqueo);
}

function reportarBloqueoBackend(position, radio = 5) {
  fetch("http://localhost:8000/bloqueo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x: position.x, z: position.z, radio: radio }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Error al reportar el bloqueo al backend");
    })
    .catch((err) => console.error("Error de red al reportar bloqueo:", err));
}

function agregarBloqueo(scene, position, radio = 5) {
  crearBloqueo(scene, position, radio);
  reportarBloqueoBackend(position, radio);
}

// ----- FUNCIONALIDADES DEL GRAFO -----
function calcularRutaDesde(posActual, destino) {
  const inicioClave = encontrarNodoMasCercano(posActual);
  const destinoClave = encontrarNodoMasCercano(destino);

  if (!grafoCalles.has(inicioClave) || !grafoCalles.has(destinoClave))
    return null;

  const visitados = new Set();
  const cola = [[inicioClave]];

  while (cola.length > 0) {
    const camino = cola.shift();
    const nodo = camino[camino.length - 1];

    if (nodo === destinoClave) {
      // Convertir claves a puntos {x, y}
      return camino.map((clave) => {
        const [x, y] = clave.split(",").map(Number);
        return { x, y };
      });
    }

    if (!visitados.has(nodo)) {
      visitados.add(nodo);

      const vecinos = grafoCalles.get(nodo);
      vecinos.forEach((vecino) => {
        if (!visitados.has(vecino.destino)) {
          cola.push([...camino, vecino.destino]);
        }
      });
    }
  }

  return null; // No se encontró camino
}

// Función para obtener una intersección aleatoria adyacente
function obtenerInterseccionAleatoria(posicion) {
  const interseccionesCercanas = [];

  grafoCalles.forEach((vecinos, claveNodo) => {
    const [x, y] = claveNodo.split(",").map(Number);
    const dist = Math.sqrt((x - posicion.x) ** 2 + (y - posicion.z) ** 2);
    if (dist < 30) {
      interseccionesCercanas.push(claveNodo);
    }
  });

  if (interseccionesCercanas.length > 0) {
    return interseccionesCercanas[
      Math.floor(Math.random() * interseccionesCercanas.length)
    ];
  }

  return null;
}

function encontrarNodoMasCercano(pos) {
  let minDist = Infinity;
  let nodoCercano = null;

  for (const clave of grafoCalles.keys()) {
    const [x, y] = clave.split(",").map(Number);
    const dist = Math.hypot(pos.x - x, pos.y - y);
    if (dist < minDist) {
      minDist = dist;
      nodoCercano = clave;
    }
  }

  return nodoCercano;
}

function reasignarRutaAuto(car) {
  // Obtener las claves de rutas disponibles
  const rutasKeys = Object.keys(rutasAutos);

  // Filtrar rutas que NO tengan bloqueo
  const rutasDisponibles = rutasKeys.filter((key) => {
    // Para cada calle en la ruta, juntar todos los puntos en un solo array
    const callesDeRuta = rutasAutos[key]
      .map((calleNombre) => calles[calleNombre])
      .flat();
    return !rutaTieneBloqueo(callesDeRuta);
  });

  if (rutasDisponibles.length === 0) {
    console.warn("No hay rutas alternativas disponibles para asignar.");
    return false; // No se pudo asignar ruta
  }

  // Elegir una ruta aleatoria de las disponibles
  const nuevaRutaKey =
    rutasDisponibles[Math.floor(Math.random() * rutasDisponibles.length)];

  // Obtener la ruta en puntos (lista de {x,y})
  const nuevaRuta = rutasAutos[nuevaRutaKey]
    .map((calleNombre) => calles[calleNombre])
    .flat();

  // Asignar la ruta al auto
  car.userData.ruta = nuevaRuta;
  car.userData.index = 0; // reiniciar índice de ruta
  car.userData.t = 0; // reiniciar progreso en segmento

  console.log(`Auto reasignado a la ruta ${nuevaRutaKey}`);
  return true;
}

// ----- OPERACIONES BASICAS -----
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

//----- OPERACIONES EXTRA -----
function rutaTieneBloqueo(ruta) {
  return ruta.some((punto) => {
    return bloqueos.some((b) => {
      const dist = new THREE.Vector3(punto.x, 0, punto.y).distanceTo(
        new THREE.Vector3(b.position.x, 0, b.position.z)
      );
      return dist < b.radio;
    });
  });
}

function cambiarRutaAuto(car) {
  const rutasKeys = Object.keys(rutasAutos);
  const rutasDisponibles = rutasKeys.filter((key) => {
    const callesDeRuta = rutasAutos[key].map((c) => calles[c]).flat();
    return !rutaTieneBloqueo(callesDeRuta);
  });

  if (rutasDisponibles.length > 0) {
    const nuevaRutaKey =
      rutasDisponibles[Math.floor(Math.random() * rutasDisponibles.length)];
    const nuevaRuta = rutasAutos[nuevaRutaKey].map((c) => calles[c]).flat();
    car.userData.ruta = nuevaRuta;
    car.userData.index = 0;
    car.userData.t = 0;
    console.log(`Auto reasignado a ruta: ${nuevaRutaKey}`);
  } else {
    console.warn("No hay rutas alternativas disponibles");
  }
}

// ----- PROCESAMIENTO DE PROMPTEO-----
async function enviarPrompt() {
  const inputValue = document.getElementById("instruction-input").value.trim();
  if (!inputValue) return console.warn("No hay instrucción para enviar.");

  try {
    const response = await fetch("http://localhost:8000/nlp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: inputValue, max_tokens: 150 }),
    });

    const data = await response.json();
    console.log("Respuesta backend NLP:", data);

    const accion = data.status?.toLowerCase() || "";

    if (accion.includes("start")) playSim();
    else if (accion.includes("stop")) stopSim();
    else if (accion.includes("reload")) reloadSim();
    else if (
      accion.includes("bloqueo") &&
      data.x !== undefined &&
      data.z !== undefined
    ) {
      const pos = { x: data.x, z: data.z };
      agregarBloqueo(scene, pos, data.radio || 5); // usa radio recibido o por defecto 5
    }
  } catch (error) {
    console.error("Error al enviar prompt:", error);
  }
}

// -----  INICIALIZACION -----
async function init() {
  await cargarCalles();
  await cargarRutasAutos();

  // Construir el grafo de calles
  construirGrafo();

  scene = new THREE.Scene();

  const loader = new THREE.TextureLoader();
  loader.load(
    "imagenes/cielo4.png",
    function (texture) {
      console.log("Imagen cargada correctamente");
      scene.background = texture;
    },
    undefined,
    function (err) {
      console.error(" Error cargando la imagen", err);
    }
  );

  const textureLoader = new THREE.TextureLoader();
  const groundTexture = textureLoader.load("imagenes/pasto.jpg");

  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(10, 10); // Repetir la textura en el suelo

  const groundMaterial = new THREE.MeshStandardMaterial({
    map: groundTexture,
  });

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 200),
    groundMaterial
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  ground.userData.type = "ground";

  const canvas = document.getElementById("mapaCanvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 100, 100);
  camera.lookAt(0, 0, 0);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(20, 40, 20);
  scene.add(light);

  //dibujarCallesDesdeJSON();
  dibujarCalles();

  crearSemaforo({ x: -92, z: 0 }, "green");
  crearSemaforo({ x: -5, z: -82 }, "red");
  crearEscuela({ x: -40, z: -40 });

  const numCars = 10; // Lo ajusta backend después
  const trafico = "moderado";
  crearAutos(numCars, calcularVelocidadBase(trafico));

  renderer.render(scene, camera);
}

window.addEventListener("DOMContentLoaded", init);

window.addEventListener("DOMContentLoaded", () => {
  const btnToggleNombres = document.getElementById("btnToggleNombres");

  btnToggleNombres.addEventListener("click", () => {
    mostrarNombresCalles = !mostrarNombresCalles;
    const spanTexto = document.getElementById("btnTexto");
    spanTexto.textContent = mostrarNombresCalles
      ? "Ocultar nombre de calles"
      : "Mostrar nombre de calles";
    dibujarCalles();
  });
});

// ----- CONTROL DE VISTAS ----- //
function updateCamera() {
  switch (currentView) {
    case "top": // Vista cenital con zoom y movimiento
      camera.position.set(camX, zoomLevel, camZ);
      camera.lookAt(camX, 0, camZ - 100);
      break;

    case "street": // Vista nivel calle
      camera.position.set(-30, 5, 30);
      camera.lookAt(0, 0, 0);
      break;

    case "follow": // Seguir auto
      if (cars && cars.length > 0) {
        if (!followCar) followCar = cars[0];
        const carPos = followCar.position;
        camera.position.set(carPos.x - 10, 8, carPos.z + 5);
        camera.lookAt(carPos.x, carPos.y, carPos.z);
      }
      break;

    case "dron": // Vista aérea inclinada
      camera.position.set(50, 130, 140);
      camera.lookAt(50, 30, 50);
      break;
  }
}


// Para cambiar manualmente el auto que seguimos
let followIndex = 0;
function siguienteAuto() {
  if (cars.length > 0) {
    followIndex = (followIndex + 1) % cars.length;
    followCar = cars[followIndex];
    currentView = "follow";
    console.log("Siguiendo auto:", followIndex);
  }
}

// ----- Eventos -----
document.getElementById("play-button").addEventListener("click", () => {
  fetch("http://localhost:8000/start")
    .then((res) => res.json())
    .then(() => playSim());
});
document.getElementById("stop-button").addEventListener("click", () => {
  fetch("http://localhost:8000/stop")
    .then((res) => res.json())
    .then(() => stopSim());
});
document.getElementById("reload-button").addEventListener("click", () => {
  fetch("http://localhost:8000/reload")
    .then((res) => res.json())
    .then(() => reloadSim());
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
  bloqueoMeshes.forEach((mesh) => scene.remove(mesh));
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
    const suelo = intersects.find(
      (obj) => obj.object.userData.type === "ground"
    );

    if (suelo) {
      const punto = suelo.point;
      crearBloqueo(scene, { x: punto.x, z: punto.z }, 6);
      console.log(
        `Bloqueo agregado en X=${punto.x.toFixed(2)}, Z=${punto.z.toFixed(2)}`
      );
    }
    modoAgregarBloqueo = false;
  }

  if (modoEliminarBloqueo) {
    // Eliminar si se clickea un bloqueo
    const bloqueoHit = intersects.find((obj) =>
      bloqueoMeshes.includes(obj.object)
    );

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
document.getElementById("send-button").addEventListener("click", enviarPrompt);

// ----- Conexion websocket -----
async function sincronizarEstado() {
  try {
    const estado = await fetch("http://localhost:8000/estado").then((r) =>
      r.json()
    );
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
    const estado = await fetch("http://localhost:8000/estado").then((r) =>
      r.json()
    );
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
          trafico: trafico,
        }),
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

  if (msg.accion === "bloqueo" && msg.x !== undefined && msg.z !== undefined) {
    const posicion = { x: msg.x, z: msg.z };
    crearBloqueo(scene, posicion, msg.radio || 5);
  }
};

// Ajustar cantidad de autos
function ajustarCantidadAutos(cantidad) {
  console.log("⏫ Ajustando cantidad de autos a:", cantidad);

  cars.forEach((car) => scene.remove(car));
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
document
  .getElementById("zoom-in")
  .addEventListener("click", () => setCameraZoom(zoomLevel - 15));
document
  .getElementById("zoom-out")
  .addEventListener("click", () => setCameraZoom(zoomLevel + 20));

// ----- Movimiento lateral de la cámara -----
let camX = 0;
let camZ = 100; // posición inicial
function moverCamara(dx, dz) {
  camX += dx;
  camZ += dz;
  camera.position.set(camX, zoomLevel, camZ);
  camera.lookAt(camX, 0, camZ - 100); // ajusta para que siga viendo al frente
}

document
  .getElementById("move-left")
  .addEventListener("click", () => moverCamara(-10, 0));
document
  .getElementById("move-right")
  .addEventListener("click", () => moverCamara(10, 0));
document
  .getElementById("move-up")
  .addEventListener("click", () => moverCamara(0, -10));
document
  .getElementById("move-down")
  .addEventListener("click", () => moverCamara(0, 10));
