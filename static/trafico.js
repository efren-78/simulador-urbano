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
let nodos = {};
let callesConNodos = {};
let grafo = {};

let accidentesActivos = new Map(); // Mapa de accidentes activos
const efectosAccidente = {
    leve: { 
        radio: 15, 
        reduccionVelocidad: 0.5, 
        color: 0xffff00,
        humoIntensity: 0.3
    },
    moderado: { 
        radio: 25, 
        reduccionVelocidad: 0.7, 
        color: 0xff9900,
        humoIntensity: 0.6
    },
    grave: { 
        radio: 40, 
        reduccionVelocidad: 0.9, 
        color: 0xff0000,
        humoIntensity: 0.9
    }
};

let climaActual = {
    tipo: "soleado",
    intensidad: "leve",
    duracion: 0
};

const efectosClima = {
    soleado: { 
        colorAmbiente: 0xffffff, 
        intensidadLuz: 1.0,
        visibilidad: 1.0,
        factorVelocidad: 1.0
    },
    lluvia: {
        leve: { colorAmbiente: 0xcccccc, intensidadLuz: 0.8, visibilidad: 0.9, factorVelocidad: 0.9 },
        moderado: { colorAmbiente: 0xaaaaaa, intensidadLuz: 0.6, visibilidad: 0.7, factorVelocidad: 0.8 },
        fuerte: { colorAmbiente: 0x888888, intensidadLuz: 0.4, visibilidad: 0.5, factorVelocidad: 0.7 }
    },
    niebla: {
        leve: { colorAmbiente: 0xdddddd, intensidadLuz: 0.7, visibilidad: 0.8, factorVelocidad: 0.95 },
        moderado: { colorAmbiente: 0xbbbbbb, intensidadLuz: 0.5, visibilidad: 0.6, factorVelocidad: 0.9 },
        fuerte: { colorAmbiente: 0x999999, intensidadLuz: 0.3, visibilidad: 0.4, factorVelocidad: 0.85 }
    },
    noche: {
        leve: { colorAmbiente: 0x444444, intensidadLuz: 0.3, visibilidad: 0.6, factorVelocidad: 0.9 },
        moderado: { colorAmbiente: 0x333333, intensidadLuz: 0.2, visibilidad: 0.4, factorVelocidad: 0.8 },
        fuerte: { colorAmbiente: 0x222222, intensidadLuz: 0.1, visibilidad: 0.3, factorVelocidad: 0.7 }
    }
};

// Efectos de partículas
let sistemaParticulasLluvia = null;
let sistemaParticulasNiebla = null;

let vistasConfig = {
    cenital: { position: new THREE.Vector3(0, 150, 100), lookAt: new THREE.Vector3(0, 0, 0) },
    aerea: { position: new THREE.Vector3(50, 200, 150), lookAt: new THREE.Vector3(50, 0, 50) },
    dron: { position: new THREE.Vector3(0, 100, 50), lookAt: new THREE.Vector3(0, 0, 0) },
    siguiendo: { offset: new THREE.Vector3(-10, 5, 5) },
    primera_persona: { offset: new THREE.Vector3(0, 2, 0) },
    conductor: { offset: new THREE.Vector3(0, 1.5, 0.5) }
};

let autoSeguimiento = null;
let vistaActual = "cenital";

// ----- CARGA DE RECURSOS -----
//Intersecciones
async function cargarNodos() {
  try {
    const response = await fetch("json/nodos.json");
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    nodos = data.nodos;
    console.log("Nodos cargados:", nodos);
    return true;
  } catch (error) {
    console.error("Error cargando nodos:", error);
    return false;
  }
}

//Aristas
async function cargarCalles() {
  try {
    const response = await fetch("json/calles.json");
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    callesConNodos = data.calles;
    
    for (const calle in callesConNodos) {
      callesConNodos[calle].estado = "abierta";
    }
    
    console.log("Calles con nodos cargadas:", callesConNodos);
    return true;
  } catch (error) {
    console.error("Error cargando calles:", error);
    return false;
  }
}

//Rutass
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

// ----- CREACION DE GRAFO -----
function construirGrafo() {
  const grafo = {};
  
  for (const nodoId in nodos) {
    grafo[nodoId] = [];
  }
  
  for (const calleNombre in callesConNodos) {
    const calle = callesConNodos[calleNombre];
    const inicio = calle.nodoInicio;
    const fin = calle.nodoFin;
    
    if (!grafo[inicio].includes(fin)) grafo[inicio].push(fin);
    if (!grafo[fin].includes(inicio)) grafo[fin].push(inicio);
  }
  
  return grafo;
}

// ----- CREACION DE OBJETOS -----
//Escuela
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
  grupo.position.set(posicion.x+50, 0, posicion.z+50);
  grupo.scale.set(4.5, 4.5, 4.5); // ESCALA UNIFORME
  scene.add(grupo);
}

//Semaforo simple
//Corregir posicion, falta modelado 3d
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
  //bien
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
console.log("Datos de rutasAutos:", rutasAutos);
console.log("Datos de calles:", calles);

function crearAutos(cantidad, velocidadBase) {
  const rutasKeys = Object.keys(rutasAutos);

  const colores = [
    0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500,
    0x800080,
  ];

  for (let i = 0; i < cantidad; i++) {
    const rutaSeleccionada = rutasKeys[i % rutasKeys.length];
    const rutaCalles = rutasAutos[rutaSeleccionada];
    
    // Convertir ruta de nombres de calles a nodos
    const rutaNodos = convertirRutaCallesANodos(rutaCalles);
    
    if (!rutaNodos || rutaNodos.length < 2) {
      console.error("No se pudo convertir la ruta a nodos:", rutaCalles);
      continue;
    }
    
    // Convertir ruta de nodos a coordenadas
    const puntos = convertirRutaNodosACoordenadas(rutaNodos);
    
    if (puntos.length < 2) {
      console.error("No se pudo generar puntos para la ruta:", rutaNodos);
      continue;
    }

    const color = colores[i % colores.length];
    const auto = createCar(color);
    
    // Posición inicial (primer punto de la ruta)
    auto.group.position.set(puntos[0].x, 0.5, puntos[0].y);
    
    auto.group.userData = {
      ruta: puntos,
      index: 0,
      t: 0,
      rutaOriginal: puntos, // Guardar la ruta original para posibles reset
    };

    cars.push(auto.group);
    carRoutes.push(puntos);
    carSpeeds.push(velocidadBase + Math.random() * 0.02);
    scene.add(auto.group);
  }
}

// ----- FUNCIONES PARA GRAFO ------
function encontrarCalleEntreNodos(nodoA, nodoB) {
  for (const calleNombre in callesConNodos) {
    const calle = callesConNodos[calleNombre];
    if ((calle.nodoInicio === nodoA && calle.nodoFin === nodoB) ||
        (calle.nodoInicio === nodoB && calle.nodoFin === nodoA)) {
      return calleNombre;
    }
  }
  return null;
}

function convertirRutaNodosACoordenadas(rutaNodos) {
  const puntosRuta = [];
  
  for (let i = 0; i < rutaNodos.length - 1; i++) {
    const nodoActual = rutaNodos[i];
    const nodoSiguiente = rutaNodos[i + 1];
    
    // Encontrar la calle que conecta estos nodos
    const calleNombre = encontrarCalleEntreNodos(nodoActual, nodoSiguiente);
    if (!calleNombre) continue;
    
    const calle = callesConNodos[calleNombre];
    const puntosCalle = calle.puntos;
    
    // Determinar la dirección de la calle
    const esMismaDireccion = calle.nodoInicio === nodoActual && calle.nodoFin === nodoSiguiente;
    
    if (esMismaDireccion) {
      // Agregar puntos en orden normal
      puntosRuta.push(...puntosCalle.map(p => ({ ...p, nombre: calleNombre })));
    } else {
      // Agregar puntos en orden inverso
      puntosRuta.push(...puntosCalle.slice().reverse().map(p => ({ ...p, nombre: calleNombre })));
    }
  }
  
  return puntosRuta;
}

function convertirRutaCallesANodos(rutaCalles) {
  const rutaNodos = [];
  
  for (let i = 0; i < rutaCalles.length; i++) {
    const calleActual = rutaCalles[i];
    const calle = callesConNodos[calleActual];
    
    if (!calle) continue;
    
    if (i === 0) {
      // Primera calle: agregar ambos nodos
      rutaNodos.push(calle.nodoInicio);
      rutaNodos.push(calle.nodoFin);
    } else {
      // Calles subsiguientes: solo agregar el nodo final
      // Verificar si el nodo inicial ya está en la ruta (conexión)
      const ultimoNodo = rutaNodos[rutaNodos.length - 1];
      
      if (calle.nodoInicio === ultimoNodo) {
        rutaNodos.push(calle.nodoFin);
      } else if (calle.nodoFin === ultimoNodo) {
        rutaNodos.push(calle.nodoInicio);
      } else {
        console.error("No hay conexión entre calles en la ruta:", rutaCalles);
        return null;
      }
    }
  }
  
  return rutaNodos;
}
/*
function verificarConexiones() {
  console.log("=== VERIFICACIÓN DE CONEXIONES ENTRE CALLES ===");
  
  // Verificar cada ruta
  for (const rutaNombre in rutasAutos) {
    const rutaCalles = rutasAutos[rutaNombre];
    console.log(`\nAnalizando ruta: ${rutaNombre} = ${rutaCalles.join(" → ")}`);
    
    let esValida = true;
    let mensajeError = "";
    
    for (let i = 0; i < rutaCalles.length - 1; i++) {
      const calleActual = rutaCalles[i];
      const calleSiguiente = rutaCalles[i + 1];
      
      const calleA = callesConNodos[calleActual];
      const calleB = callesConNodos[calleSiguiente];
      
      if (!calleA || !calleB) {
        esValida = false;
        mensajeError = `Calle no encontrada: ${!calleA ? calleActual : calleSiguiente}`;
        break;
      }
      
      // Verificar si comparten algún nodo
      const nodosComunes = [
        calleA.nodoInicio, calleA.nodoFin
      ].filter(nodo => 
        nodo === calleB.nodoInicio || nodo === calleB.nodoFin
      );
      
      console.log(`  ${calleActual} → ${calleSiguiente}: ${nodosComunes.length > 0 ? "CONECTADA" : "DESCONECTADA"} ${nodosComunes.length > 0 ? "(nodo: " + nodosComunes[0] + ")" : ""}`);
      
      if (nodosComunes.length === 0) {
        esValida = false;
        mensajeError = `No hay conexión entre ${calleActual} y ${calleSiguiente}`;
        break;
      }
    }
    
    console.log(`  RESULTADO: ${esValida ? "VÁLIDA" : "INVÁLIDA"} ${!esValida ? "(" + mensajeError + ")" : ""}`);
  }
}*/

function actualizarVisualCalles() {
  dibujarCallesDesdeJSON();
}

function encontrarRutaAlternativa(nodoOrigen, nodoDestino, callesBloqueadas = []) {
  const visitados = new Set();
  const cola = [[nodoOrigen]];
  
  while (cola.length > 0) {
    const ruta = cola.shift();
    const nodoActual = ruta[ruta.length - 1];
    
    if (nodoActual === nodoDestino) return ruta;
    
    if (!visitados.has(nodoActual)) {
      visitados.add(nodoActual);
      
      const vecinos = grafo[nodoActual] || [];
      for (const vecino of vecinos) {
        // Verificar si la calle que conecta estos nodos está bloqueada
        const calle = encontrarCalleEntreNodos(nodoActual, vecino);
        if (calle && callesBloqueadas.includes(calle)) continue;
        
        if (!visitados.has(vecino)) {
          cola.push([...ruta, vecino]);
        }
      }
    }
  }
  
  return null;
}

function crearBloqueoEnCalle(nombreCalle) {
    // Convertir a formato consistente (ej: minúsculas, sin espacios extras)
    const calleNormalizada = nombreCalle.trim().toLowerCase();
    
    // Verificar si la calle existe en tu sistema
    const calleExiste = Object.keys(callesConNodos).some(
        calle => calle.toLowerCase() === calleNormalizada
    );
    
    if (!calleExiste) {
        console.error("Calle no encontrada:", nombreCalle);
        mostrarError(`Calle "${nombreCalle}" no existe en el sistema`);
        return false;
    }
    
    // Resto de tu implementación actual...
    callesConNodos[nombreCalle].estado = "cerrada";
    actualizarVisualCalles();
    return true;
}

function desbloquearCalle(nombreCalle) {
  if (callesConNodos[nombreCalle]) {
    callesConNodos[nombreCalle].estado = "abierta";
    actualizarVisualCalles();
    console.log("Calle desbloqueada:", nombreCalle);
    return true;
  }
  return false;
}

let mostrarNodosDebug = true; // Cambiar a true para ver nodos durante desarrollo
let mostrarNombresCalles = true; // Para mostrar nombres de calles
let mostrarIdsNodos = true; // Para mostrar u ocultar IDs de nodos

function dibujarCallesDesdeJSON() {
    // Eliminar las calles anteriores
    callesMeshes.forEach((mesh) => scene.remove(mesh));
    callesMeshes.length = 0;

    Object.keys(callesConNodos).forEach((calleKey) => {
        const calle = callesConNodos[calleKey];
        const puntos = calle.puntos;
        if (puntos.length < 2) return;

        const p1 = puntos[0];
        const p2 = puntos[1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const longitud = Math.sqrt(dx * dx + dy * dy);
        const ancho = 20;

        const angulo = Math.atan2(dy, dx);
        const posX = (p1.x + p2.x) / 2;
        const posZ = (p1.y + p2.y) / 2;

        const colorCalle = calle.estado === "cerrada" ? 0xff0000 : 0x000000;
        const colorBorde = calle.estado === "cerrada" ? 0x990000 : 0xffff00;

        // Calle
        const geometryCalle = new THREE.PlaneGeometry(longitud, ancho);
        const materialCalle = new THREE.MeshBasicMaterial({
            color: colorCalle,
            side: THREE.DoubleSide,
        });
        const meshCalle = new THREE.Mesh(geometryCalle, materialCalle);
        meshCalle.rotation.x = -Math.PI / 2;
        meshCalle.rotation.z = -angulo;
        meshCalle.position.set(posX, 0.01, posZ);
        meshCalle.userData = { tipo: "calle", nombre: calleKey };
        scene.add(meshCalle);
        callesMeshes.push(meshCalle);

        // Bordes laterales
        const offset = 1.9;
        const offsetX = -Math.sin(angulo) * offset;
        const offsetZ = Math.cos(angulo) * offset;

        const geometryBorde = new THREE.PlaneGeometry(longitud, 1);
        const materialBorde = new THREE.MeshBasicMaterial({ 
            color: colorBorde, 
            side: THREE.DoubleSide 
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

        // DIBUJAR NOMBRES DE CALLES - AQUÍ ESTÁ EL CAMBIO
        if (mostrarNombresCalles) {
            const canvas = document.createElement("canvas");
            canvas.width = 512;
            canvas.height = 128;
            const context = canvas.getContext("2d");

            // Fondo transparente
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Configurar texto
            context.font = "bold 70px 'Arial', sans-serif";
            context.textAlign = "center";
            context.textBaseline = "middle";

            // Contorno negro para mejor legibilidad
            context.lineWidth = 8;
            context.strokeStyle = "#000000";
            context.strokeText(calleKey, canvas.width / 2, canvas.height / 2);

            // Texto principal (color según estado)
            context.fillStyle = calle.estado === "cerrada" ? "#ff6666" : "#ffffff";
            context.fillText(calleKey, canvas.width / 2, canvas.height / 2);

            // Crear textura
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            texture.minFilter = THREE.LinearFilter;

            // Crear sprite
            const materialText = new THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true,
                opacity: 0.9
            });
            
            const sprite = new THREE.Sprite(materialText);
            sprite.scale.set(25, 6, 1);
            sprite.position.set(posX, 5, posZ); // Más alto para mejor visibilidad
            sprite.rotation.z = -angulo; // Rotar según dirección de la calle
            
            // Pequeño ajuste de posición para mejor centrado
            const offsetAltura = Math.sin(angulo) * 2;
            const offsetAnchura = Math.cos(angulo) * 2;
            sprite.position.x += offsetAnchura;
            sprite.position.z += offsetAltura;

            scene.add(sprite);
            callesMeshes.push(sprite);
        }
    });

    // DIBUJAR NODOS DE DEBUG (separado, no afecta los nombres)
    if (mostrarNodosDebug) {
        for (const nodoId in nodos) {
            const nodo = nodos[nodoId];
            const sizeNodo = 22;

            const geometryNodo = new THREE.PlaneGeometry(sizeNodo, sizeNodo);
            const materialNodo = new THREE.MeshBasicMaterial({
                color: 0x333333,
                side: THREE.DoubleSide,
            });

            const meshNodo = new THREE.Mesh(geometryNodo, materialNodo);
            meshNodo.rotation.x = -Math.PI / 2;
            meshNodo.position.set(nodo.x, 0.015, nodo.y);
            scene.add(meshNodo);
            callesMeshes.push(meshNodo);

            // Texto con ID de nodo
            if (mostrarIdsNodos) {
                const canvas = document.createElement("canvas");
                canvas.width = 256;
                canvas.height = 128;
                const context = canvas.getContext("2d");
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.font = "bold 40px Arial";
                context.fillStyle = "white";
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.fillText(nodoId, canvas.width / 2, canvas.height / 2);

                const texture = new THREE.CanvasTexture(canvas);
                const materialText = new THREE.SpriteMaterial({ 
                    map: texture, 
                    transparent: true 
                });
                const sprite = new THREE.Sprite(materialText);
                sprite.scale.set(10, 5, 1);
                sprite.position.set(nodo.x, 3, nodo.y);
                scene.add(sprite);
                callesMeshes.push(sprite);
            }
        }
    }
}

// ----- Animacion -----
function animate() {
  if (!running) return;
  const delta = clock.getDelta();

  actualizarSemaforos();

  actualizarSemaforos();
  moverAutos(delta);
  animarAccidentes();
  animarEfectosClima();

  updateCamera();

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
    const speed = carSpeeds[i] * (car.userData.factorAccidente || 1);
    let detener = false;

    // Verificar semáforos
    semaforos.forEach((semaforo) => {
      const dist = car.position.distanceTo(semaforo.position);
      if (dist < 3 && semaforo.userData.state === "red") detener = true;
    });
    
    // Verificar si la calle actual está bloqueada (USANDO EL NUEVO SISTEMA)
    const calleActual = puntos[index]?.nombre;
    if (calleActual && callesConNodos[calleActual]?.estado === "cerrada") {
      detener = true;
      if (!car.userData.waitStart) car.userData.waitStart = performance.now();
      else if ((performance.now() - car.userData.waitStart) / 1000 > 3) {
        cambiarRutaAuto(car); // ¡ESTA ES LA LÍNEA CLAVE!
        car.userData.waitStart = null;
      }
    } else {
      car.userData.waitStart = null;
    }

    if (!detener) {
      let p1 = puntos[index],
        p2 = puntos[index + 1] || puntos[0];
      car.userData.t += speed * delta * 60;
      if (car.userData.t >= 1) {
        car.userData.index = (car.userData.index + 1) % puntos.length;
        car.userData.t = 0;
      }
      const x = THREE.MathUtils.lerp(p1.x, p2.x, car.userData.t);
      const z = THREE.MathUtils.lerp(p1.y, p2.y, car.userData.t);
      car.position.set(x, 0.5, z);
      car.rotation.y = -Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }
  });
}

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
  const puntoActual = car.userData.ruta[car.userData.index];
  
  // Encontrar el nodo más cercano al auto
  let nodoCercano = null;
  let distanciaMinima = Infinity;
  
  for (const nodoId in nodos) {
    const nodo = nodos[nodoId];
    const distancia = Math.sqrt(
      Math.pow(car.position.x - nodo.x, 2) + 
      Math.pow(car.position.z - nodo.y, 2)
    );
    
    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      nodoCercano = nodoId;
    }
  }
  
  if (!nodoCercano) return;
  
  // Encontrar el nodo destino (último nodo de la ruta original)
  const rutaOriginal = car.userData.ruta;
  const ultimoPunto = rutaOriginal[rutaOriginal.length - 1];
  
  let nodoDestino = null;
  distanciaMinima = Infinity;
  
  for (const nodoId in nodos) {
    const nodo = nodos[nodoId];
    const distancia = Math.sqrt(
      Math.pow(ultimoPunto.x - nodo.x, 2) + 
      Math.pow(ultimoPunto.y - nodo.y, 2)
    );
    
    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      nodoDestino = nodoId;
    }
  }
  
  if (!nodoDestino) return;
  
  // Encontrar calles bloqueadas
  const callesBloqueadas = Object.keys(callesConNodos).filter(
    calle => callesConNodos[calle].estado === "cerrada"
  );
  
  // Encontrar ruta alternativa
  const rutaNodos = encontrarRutaAlternativa(nodoCercano, nodoDestino, callesBloqueadas);
  
  if (!rutaNodos || rutaNodos.length === 0) {
    console.log("No se encontró ruta alternativa");
    return;
  }
  
  // Convertir ruta de nodos a coordenadas
  const nuevaRutaCoordenadas = convertirRutaNodosACoordenadas(rutaNodos);
  
  if (nuevaRutaCoordenadas.length === 0) {
    console.log("No se pudo convertir la ruta de nodos a coordenadas");
    return;
  }
  
  // Encontrar el punto más cercano en la nueva ruta
  let indiceMasCercano = 0;
  distanciaMinima = Infinity;
  
  nuevaRutaCoordenadas.forEach((p, i) => {
    const dx = p.x - car.position.x;
    const dz = p.y - car.position.z;
    const dist = dx * dx + dz * dz;
    if (dist < distanciaMinima) {
      distanciaMinima = dist;
      indiceMasCercano = i;
    }
  });
  
  // Actualizar la ruta del auto
  car.userData.ruta = nuevaRutaCoordenadas;
  car.userData.index = indiceMasCercano;
  car.userData.t = 0;
  
  console.log("Ruta cambiada a:", rutaNodos);
}

// -----Procesamiento de prompteo-----
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
  } catch (error) {
    console.error("Error al enviar prompt:", error);
  }
}

// ----- Inicializacion -----
async function init() {
  //Cargar datos
  await cargarNodos();
  await cargarCalles();
  await cargarRutasAutos();

  // Construir grafo
  grafo = construirGrafo();
  console.log("Grafo construido:", grafo);

  //verificarConexiones();

  // Verificar si las rutas se cargaron correctamente (ya no necesitas cargarlas de nuevo)
  if (Object.keys(rutasAutos).length === 0) {
    console.error("No se pudieron cargar las rutas de autos correctamente.");
    return;
  }

  scene = new THREE.Scene();

  const loader = new THREE.TextureLoader();
  loader.load(
    "imagenes/cielo4.png",
    function (texture) {
      console.log("✅ Imagen cargada correctamente");
      scene.background = texture;
    },
    undefined,
    function (err) {
      console.error("❌ Error cargando la imagen", err);
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
    new THREE.PlaneGeometry(300, 260),
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

  dibujarCallesDesdeJSON();

  crearSemaforo({ x: -92, z: 0 }, "green");
  crearSemaforo({ x: -5, z: -82 }, "red");
  crearEscuela({ x: -40, z: -40 });

  const numCars = 5; // Lo ajusta backend después
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
    dibujarCallesDesdeJSON();
  });
});

function updateCamera() {
    switch(vistaActual) {
        case "siguiendo":
        case "primera_persona":
        case "conductor":
            if (autoSeguimiento) {
                actualizarVistaSiguienteAuto();
            }
            break;
        default:
            // Las vistas estáticas se mantienen
            break;
    }
}

function actualizarVistaSiguienteAuto() {
    if (!autoSeguimiento) return;
    
    const carPos = autoSeguimiento.position;
    const carRotation = autoSeguimiento.rotation;
    
    switch(vistaActual) {
        case "siguiendo":
            camera.position.set(
                carPos.x + vistasConfig.siguiendo.offset.x,
                carPos.y + vistasConfig.siguiendo.offset.y,
                carPos.z + vistasConfig.siguiendo.offset.z
            );
            camera.lookAt(carPos.x, carPos.y, carPos.z);
            break;
            
        case "primera_persona":
            // Vista desde el frente del auto
            const offsetX = Math.sin(carRotation.y) * 2;
            const offsetZ = Math.cos(carRotation.y) * 2;
            camera.position.set(
                carPos.x - offsetX,
                carPos.y + 1.8,
                carPos.z - offsetZ
            );
            camera.lookAt(
                carPos.x - Math.sin(carRotation.y) * 5,
                carPos.y,
                carPos.z - Math.cos(carRotation.y) * 5
            );
            break;
            
        case "conductor":
            // Vista desde el asiento del conductor
            camera.position.set(
                carPos.x,
                carPos.y + 1.5,
                carPos.z + 0.5
            );
            camera.rotation.y = carRotation.y;
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
  // Desbloquear todas las calles
  for (const calleNombre in callesConNodos) {
    callesConNodos[calleNombre].estado = "abierta";
  }
  
  // Limpiar bloqueos circulares (si decides mantenerlos)
  bloqueos.length = 0;
  bloqueoMeshes.forEach((mesh) => scene.remove(mesh));
  bloqueoMeshes.length = 0;
  
  actualizarVisualCalles();
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
    // Buscar si se clickeó una calle
    const calleHit = intersects.find(obj => 
      obj.object.userData && obj.object.userData.tipo === "calle"
    );

    if (calleHit) {
      const nombreCalle = calleHit.object.userData.nombre;
      crearBloqueoEnCalle(nombreCalle);
      
      // También enviar al backend si es necesario
      fetch("http://localhost:8000/bloquear-calle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calle: nombreCalle })
      });
    }
    modoAgregarBloqueo = false;
  }

  if (modoEliminarBloqueo) {
    // Similar para desbloquear
    const calleHit = intersects.find(obj => 
      obj.object.userData && obj.object.userData.tipo === "calle"
    );

    if (calleHit) {
      const nombreCalle = calleHit.object.userData.nombre;
      desbloquearCalle(nombreCalle);
      
      fetch("http://localhost:8000/desbloquear-calle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calle: nombreCalle })
      });
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
  if (msg.accion === "start") {
    playSim();
  } else if (msg.accion === "stop") {
    stopSim();
  } else if (msg.accion === "reload") {
    reloadSim();
  } else if (msg.accion === "bloquear" && msg.calle) {
    crearBloqueoEnCalle(msg.calle);
    mostrarNotificacion(`Calle ${msg.calle} bloqueada`);
  } 
  else if (msg.accion === "desbloquear" && msg.calle) {
      desbloquearCalle(msg.calle);
      mostrarNotificacion(`Calle ${msg.calle} desbloqueada`);
  }
  else if (msg.accion === "accidente") {
      simularAccidente(msg.tipo, msg.ubicacion, msg.duracion);
  }
  else if (msg.accion === "limpiar_accidente") {
      limpiarAccidente(msg.ubicacion);
  }
  else if (msg.accion === "clima") {
      cambiarClima(msg.tipo, msg.intensidad, msg.duracion);
  }
  else if (msg.accion === "vista") {
      cambiarVista(msg.tipo, msg.auto_id, msg.ubicacion);
  }
};

// Ajustar cantidad de autos
function ajustarCantidadAutos(cantidad) {
  console.log("Ajustando cantidad de autos a:", cantidad);

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

// ---------------------- BLOQUEO / DESBLOQUEO ----------------------

function actualizarVisualCalles() {
  callesMeshes.forEach((mesh) => {
    const nombre = mesh.userData.nombre;
    if (!nombre) return;
    mesh.material.color.setHex(
      calles[nombre].estado === "cerrada" ? 0xff0000 : 0x000000
    );
  });
}

// ----- Accidente -----

function simularAccidente(tipo, ubicacion, duracionMinutos) {
    // Buscar la ubicación en el grafo
    const coordenadas = buscarUbicacionEnGrafo(ubicacion);
    if (!coordenadas) {
        console.error("Ubicación de accidente no encontrada:", ubicacion);
        return;
    }

    const efecto = efectosAccidente[tipo];
    const accidenteId = `accidente_${Date.now()}`;
    
    // Crear visualización del accidente
    const geometria = new THREE.CylinderGeometry(efecto.radio, efecto.radio, 2, 32);
    const material = new THREE.MeshPhongMaterial({ 
        color: efecto.color, 
        transparent: true, 
        opacity: 0.6 
    });
    
    const meshAccidente = new THREE.Mesh(geometria, material);
    meshAccidente.position.set(coordenadas.x, 1, coordenadas.y);
    meshAccidente.rotation.x = Math.PI / 2;
    scene.add(meshAccidente);
    
    // Efecto de partículas (humo)
    const humo = crearEfectoHumo(tipo, coordenadas);
    scene.add(humo);
    
    // Guardar referencia
    accidentesActivos.set(accidenteId, {
        mesh: meshAccidente,
        humo: humo,
        tipo: tipo,
        ubicacion: ubicacion,
        coordenadas: coordenadas,
        reduccionVelocidad: efecto.reduccionVelocidad,
        tiempoFin: Date.now() + (duracionMinutos * 60000)
    });
    
    // Aplicar efectos a autos
    aplicarEfectoAccidenteAutos(coordenadas, efecto.radio, efecto.reduccionVelocidad);
    
    mostrarNotificacion(`Accidente ${tipo} simulado en ${ubicacion}`);
}

// MEJORA la función de búsqueda:
function buscarUbicacionEnGrafo(ubicacionTexto) {
    if (!ubicacionTexto || typeof ubicacionTexto !== 'string') {
        console.error("Texto de ubicación inválido");
        return null;
    }

    const textoNormalizado = ubicacionTexto.toLowerCase()
        .trim()
        .replace(/avenida|av\.?/gi, '')
        .replace(/calle|cll\.?/gi, '')
        .replace(/\./g, '')
        .trim();

    console.log("Buscando ubicación para:", textoNormalizado);

    // 1. Búsqueda exacta
    for (const nombreCalle in callesConNodos) {
        const nombreNormalizado = nombreCalle.toLowerCase();
        if (nombreNormalizado === textoNormalizado) {
            console.log("Encontrado por nombre exacto:", nombreCalle);
            return obtenerPuntoMedioCalle(nombreCalle);
        }
    }

    // 2. Búsqueda parcial (AÑADE ESTO)
    for (const nombreCalle in callesConNodos) {
        const nombreNormalizado = nombreCalle.toLowerCase();
        if (nombreNormalizado.includes(textoNormalizado) || 
            textoNormalizado.includes(nombreNormalizado)) {
            console.log("Encontrado por coincidencia parcial:", nombreCalle);
            return obtenerPuntoMedioCalle(nombreCalle);
        }
    }

    console.error("Ubicación no encontrada:", ubicacionTexto);
    return null;
}

function aplicarEfectoAccidenteAutos(epicentro, radio, reduccion) {
    cars.forEach(auto => {
        const posAuto = new THREE.Vector3(auto.position.x, 0, auto.position.z);
        const posEpicentro = new THREE.Vector3(epicentro.x, 0, epicentro.y);
        const distancia = posAuto.distanceTo(posEpicentro);
        
        if (distancia < radio) {
            const factor = 1 - (reduccion * (1 - distancia/radio));
            auto.userData.factorAccidente = factor;
            
            if (distancia < radio * 0.3) {
                cambiarRutaAuto(auto);
            }
        }
    });
}

function limpiarAccidente(ubicacion) {
    for (const [id, accidente] of accidentesActivos.entries()) {
        if (accidente.ubicacion === ubicacion) {
            scene.remove(accidente.mesh);
            scene.remove(accidente.humo);
            
            // Limpiar efectos en autos
            cars.forEach(auto => {
                if (auto.userData.factorAccidente) {
                    auto.userData.factorAccidente = 1;
                }
            });
            
            accidentesActivos.delete(id);
            mostrarNotificacion(`Accidente en ${ubicacion} ha sido limpiado`);
        }
    }
}

function obtenerPuntoMedioCalle(nombreCalle) {
    const calle = callesConNodos[nombreCalle];
    if (!calle || !calle.puntos || calle.puntos.length === 0) {
        console.error("Calle no encontrada o sin puntos:", nombreCalle);
        return null;
    }

    const puntos = calle.puntos;
    const puntoMedioIndex = Math.floor(puntos.length / 2);
    
    return {
        x: puntos[puntoMedioIndex].x,
        y: puntos[puntoMedioIndex].y,
        calle: nombreCalle
    };
}

// Alternativa sin textura:
function crearEfectoHumo(tipo, coordenadas) {
    const geometry = new THREE.SphereGeometry(3, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: tipo === 'grave' ? 0x333333 : 0x888888,
        transparent: true,
        opacity: 0.6
    });
    
    const humo = new THREE.Mesh(geometry, material);
    humo.position.set(coordenadas.x, 3, coordenadas.y);
    humo.userData.offsetY = 0;
    
    return humo;
}


// AÑADE en tu función animate() o en moverAutos():
function animarAccidentes() {
    accidentesActivos.forEach((accidente, id) => {
        // Animación de humo
        if (accidente.humo) {
            accidente.humo.userData.offsetY += 0.05;
            accidente.humo.position.y = 3 + Math.sin(accidente.humo.userData.offsetY) * 2;
            accidente.humo.material.opacity = 0.4 + Math.sin(accidente.humo.userData.offsetY * 0.5) * 0.2;
        }
        
        // Limpieza automática por tiempo
        if (Date.now() > accidente.tiempoFin) {
            limpiarAccidente(accidente.ubicacion);
        }
    });
}

//----- CLIMA -----
function cambiarClima(tipo, intensidad, duracionMinutos) {
    // Detener efectos anteriores
    detenerEfectosClima();
    
    // Actualizar estado
    climaActual = { tipo, intensidad, duracion: duracionMinutos };
    
    // Aplicar efectos visuales
    aplicarEfectosVisualesClima(tipo, intensidad);
    
    // Aplicar efectos de gameplay
    aplicarEfectosGameplayClima(tipo, intensidad);
    
    // Crear efectos de partículas
    if (tipo === "lluvia") {
        crearLluvia(intensidad);
    } else if (tipo === "niebla") {
        crearNiebla(intensidad);
    }
    
    mostrarNotificacion(`Clima cambiado a: ${tipo} ${intensidad}`);
    
    // Programar restauración si no es soleado
    if (tipo !== "soleado" && duracionMinutos > 0) {
        setTimeout(() => {
            cambiarClima("soleado", "leve", 0);
        }, duracionMinutos * 60000);
    }
}

function aplicarEfectosVisualesClima(tipo, intensidad) {
    const efecto = efectosClima[tipo][intensidad] || efectosClima[tipo].leve;
    
    // Cambiar ambiente
    scene.background = new THREE.Color(efecto.colorAmbiente);
    
    // Ajustar luz
    if (scene.light) {
        scene.light.intensity = efecto.intensidadLuz;
    }
    
    // Añadir fog/niebla
    if (tipo === "niebla" || tipo === "lluvia") {
        scene.fog = new THREE.FogExp2(efecto.colorAmbiente, 0.01 * (1.5 - efecto.visibilidad));
    } else {
        scene.fog = null;
    }
    
    // Efecto de noche
    if (tipo === "noche") {
        // Activar luces de calles y autos
        activarIluminacionNocturna();
    } else {
        desactivarIluminacionNocturna();
    }
}

function aplicarEfectosGameplayClima(tipo, intensidad) {
    const efecto = efectosClima[tipo][intensidad] || efectosClima[tipo].leve;
    
    // Ajustar velocidades de autos
    carSpeeds = carSpeeds.map(originalSpeed => 
        originalSpeed * efecto.factorVelocidad
    );
    
    // Reducir distancia de visión para semáforos
    if (tipo === "niebla" || tipo === "lluvia") {
        // Los autos detectan semáforos desde más cerca
    }
}

function crearLluvia(intensidad) {
    const count = intensidad === "leve" ? 500 : intensidad === "moderado" ? 1000 : 2000;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 200;
        positions[i + 1] = Math.random() * 50 + 30;
        positions[i + 2] = (Math.random() - 0.5) * 200;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0x8888ff,
        size: intensidad === "leve" ? 0.1 : intensidad === "moderado" ? 0.15 : 0.2,
        transparent: true,
        opacity: 0.6
    });
    
    sistemaParticulasLluvia = new THREE.Points(geometry, material);
    scene.add(sistemaParticulasLluvia);
    sistemaParticulasLluvia.userData.velocity = intensidad === "leve" ? 0.2 : intensidad === "moderado" ? 0.4 : 0.6;
}

function crearNiebla(intensidad) {
    const density = intensidad === "leve" ? 50 : intensidad === "moderado" ? 100 : 200;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(density * 3);
    
    for (let i = 0; i < density * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 300;
        positions[i + 1] = Math.random() * 20 + 5;
        positions[i + 2] = (Math.random() - 0.5) * 300;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0xdddddd,
        size: intensidad === "leve" ? 2 : intensidad === "moderado" ? 3 : 4,
        transparent: true,
        opacity: 0.3
    });
    
    sistemaParticulasNiebla = new THREE.Points(geometry, material);
    scene.add(sistemaParticulasNiebla);
}

function animarEfectosClima() {
    // Animación de lluvia
    if (sistemaParticulasLluvia) {
        const positions = sistemaParticulasLluvia.geometry.attributes.position.array;
        const velocity = sistemaParticulasLluvia.userData.velocity;
        
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= velocity;
            if (positions[i] < 0) {
                positions[i] = 30 + Math.random() * 20;
                positions[i - 1] = (Math.random() - 0.5) * 200;
                positions[i + 1] = (Math.random() - 0.5) * 200;
            }
        }
        
        sistemaParticulasLluvia.geometry.attributes.position.needsUpdate = true;
    }
    
    // Animación de niebla
    if (sistemaParticulasNiebla) {
        sistemaParticulasNiebla.rotation.y += 0.001;
    }
}

function detenerEfectosClima() {
    if (sistemaParticulasLluvia) {
        scene.remove(sistemaParticulasLluvia);
        sistemaParticulasLluvia = null;
    }
    if (sistemaParticulasNiebla) {
        scene.remove(sistemaParticulasNiebla);
        sistemaParticulasNiebla = null;
    }
    
    scene.fog = null;
}

function activarIluminacionNocturna() {
    // Activar luces de calles, semáforos, y faros de autos
    semaforos.forEach(semaforo => {
        // Intensificar emisión de luz en semáforos
    });
}

function desactivarIluminacionNocturna() {
    // Restaurar valores normales
}

// ----- VISTAS -----
function cambiarVista(tipo, autoId, ubicacion) {
    vistaActual = tipo;
    
    switch(tipo) {
        case "cenital":
            setVistaCenital();
            break;
        case "aerea":
            setVistaAerea(ubicacion);
            break;
        case "dron":
            setVistaDron();
            break;
        case "siguiendo":
            setVistaSiguiendo(autoId);
            break;
        case "primera_persona":
            setVistaPrimeraPersona(autoId);
            break;
        case "conductor":
            setVistaConductor(autoId);
            break;
        default:
            setVistaCenital();
    }
    
    mostrarNotificacion(`Vista cambiada a: ${tipo}${autoId ? ' auto ' + autoId : ''}`);
}

function setVistaCenital() {
    camera.position.set(0, 150, 100);
    camera.lookAt(0, 0, 0);
    autoSeguimiento = null;
}

function setVistaAerea(ubicacion) {
    camera.position.set(50, 200, 150);
    camera.lookAt(50, 0, 50);
    autoSeguimiento = null;
    
    // Si se especifica ubicación, buscar y apuntar allí
    if (ubicacion) {
        const coords = buscarUbicacionEnGrafo(ubicacion);
        if (coords) {
            camera.position.set(coords.x + 50, 150, coords.y + 50);
            camera.lookAt(coords.x, 0, coords.y);
        }
    }
}

function setVistaDron() {
    camera.position.set(0, 100, 50);
    camera.lookAt(0, 0, 0);
    autoSeguimiento = null;
}

function setVistaSiguiendo(autoId) {
    const auto = obtenerAutoPorId(autoId);
    if (auto) {
        autoSeguimiento = auto;
    } else {
        mostrarNotificacion("Auto no encontrado, usando vista cenital");
        setVistaCenital();
    }
}

function setVistaPrimeraPersona(autoId) {
    const auto = obtenerAutoPorId(autoId);
    if (auto) {
        autoSeguimiento = auto;
        // Posición más cercana para vista FPV
    } else {
        mostrarNotificacion("Auto no encontrado, usando vista siguiendo");
        setVistaSiguiendo(0); // Primer auto
    }
}

function setVistaConductor(autoId) {
    const auto = obtenerAutoPorId(autoId);
    if (auto) {
        autoSeguimiento = auto;
        // Vista desde el asiento del conductor
    } else {
        setVistaPrimeraPersona(0); // Primer auto
    }
}

function obtenerAutoPorId(id) {
    if (id !== null && id !== undefined && cars.length > 0) {
        const index = Math.min(Math.max(0, id), cars.length - 1);
        return cars[index];
    }
    return cars[0]; // Primer auto por defecto
}

// Función para ciclo entre vistas
function siguienteVista() {
    const vistas = ["cenital", "aerea", "dron", "siguiendo", "primera_persona", "conductor"];
    const currentIndex = vistas.indexOf(vistaActual);
    const nextIndex = (currentIndex + 1) % vistas.length;
    cambiarVista(vistas[nextIndex], 0, "");
}

// Función para seguir el siguiente auto
function siguienteAuto() {
    if (vistaActual === "siguiendo" || vistaActual === "primera_persona" || vistaActual === "conductor") {
        const currentIndex = cars.indexOf(autoSeguimiento);
        const nextIndex = (currentIndex + 1) % cars.length;
        cambiarVista(vistaActual, nextIndex, "");
    }
}

// Transiciones suaves entre vistas
function transicionSuaveVista(nuevaPosicion, nuevoLookAt, duracion = 2000) {
    const posInicial = camera.position.clone();
    const lookInicial = camera.getWorldDirection(new THREE.Vector3());
    
    const startTime = Date.now();
    
    function animarTransicion() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duracion, 1);
        
        // Interpolación suave
        camera.position.lerpVectors(posInicial, nuevaPosicion, progress);
        
        const currentLook = new THREE.Vector3().lerpVectors(lookInicial, nuevoLookAt, progress);
        camera.lookAt(currentLook);
        
        if (progress < 1) {
            requestAnimationFrame(animarTransicion);
        }
    }
    
    animarTransicion();
}
