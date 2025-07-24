    import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
    import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

    let scene, camera, renderer;
    let running = false;
    let animationId;

    const cars = [];
    let rutas = {};
    let rutasAutos = {};
    let zoomLevel = 100;
    const minZoom = 40, maxZoom = 350;

    const loader = new GLTFLoader();

    // --- Inicialización ---
    function init() {
      const canvas = document.getElementById("mapaCanvas");
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xa0d0ff);

      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;

      camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(0, zoomLevel, zoomLevel);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
      renderer.setSize(width, height);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
      dirLight.position.set(30, 100, 30);
      scene.add(dirLight);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(400, 400),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);

      cargarDatos();

      window.addEventListener("resize", () => {
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        renderer.render(scene, camera);
      });

      renderer.render(scene, camera);
    }

    // --- Dibujar calles como líneas ---
    function dibujarCalles() {
      for (const calle in rutas) {
        const puntos = rutas[calle];
        for (let i = 0; i < puntos.length - 1; i++) {
          const start = puntos[i], end = puntos[i + 1];
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(start.x, 0.1, start.y),
            new THREE.Vector3(end.x, 0.1, end.y)
          ]);
          const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
          const line = new THREE.Line(geometry, material);
          scene.add(line);
        }
      }
    }

    // --- Crear auto GLB siguiendo ruta compuesta ---
    function crearAutoConRuta(nombreRuta) {
      const calles = rutasAutos[nombreRuta];
      if (!calles) return;

      let ruta = [];
      calles.forEach(nombreCalle => {
        const puntos = rutas[nombreCalle];
        if (puntos) ruta = ruta.concat(puntos.map(p => ({ x: p.x, z: p.y })));
      });

      if (ruta.length < 2) return;

      const tempCar = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1, 4),
        new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
      );
      tempCar.position.set(ruta[0].x, 0.5, ruta[0].z);
      scene.add(tempCar);

      const auto = {
        model: tempCar,
        ruta,
        index: 0,
        isTemp: true
      };
      cars.push(auto);

      loader.load('imagenes/car.glb', gltf => {
        const car = gltf.scene;
        car.scale.set(3.5, 3.5, 3.5);
        car.position.set(ruta[0].x, 0.5, ruta[0].z);
        car.rotation.y = tempCar.rotation.y;
        scene.remove(tempCar);
        scene.add(car);
        auto.model = car;
        auto.isTemp = false;
      });
    }

    // --- Movimiento de autos ---
    const velocidad = 0.5;
    function moverAuto(auto) {
      if (auto.index >= auto.ruta.length - 1) {
        auto.index = 0;
      }

      const pos = auto.model.position;
      const destino = auto.ruta[auto.index + 1];
      const dx = destino.x - pos.x;
      const dz = destino.z - pos.z;
      const distancia = Math.sqrt(dx * dx + dz * dz);

      if (distancia < 0.5) {
        auto.index++;
        return;
      }

      const angulo = Math.atan2(dx, dz);
      auto.model.rotation.y = angulo;

      pos.x += (dx / distancia) * velocidad;
      pos.z += (dz / distancia) * velocidad;
    }

    // --- Loop de animación ---
    function animate() {
      if (!running) return;
      animationId = requestAnimationFrame(animate);
      cars.forEach(moverAuto);
      renderer.render(scene, camera);
    }

    // --- Comandos ---
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
      cars.forEach(c => c.index = 0);
      renderer.render(scene, camera);
    }

    // --- Zoom ---
    function setCameraZoom(newZoom) {
      zoomLevel = Math.max(minZoom, Math.min(maxZoom, newZoom));
      camera.position.set(0, zoomLevel, zoomLevel);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }

    
    // --- Cargar rutas y autos ---
    function cargarDatos() {
      fetch('rutas.json')
        .then(res => res.json())
        .then(data => {
          rutas = data;
          dibujarCalles();
          return fetch('rutas_autos.json');
        })
        .then(res => res.json())
        .then(data => {
          rutasAutos = data;

          crearAutoConRuta("rutaA");
          crearAutoConRuta("rutaB");
          crearAutoConRuta("rutaC");
          crearAutoConRuta("rutaD");
          crearAutoConRuta("rutaE");
        })
        .catch(err => console.error("Error al cargar rutas:", err));
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