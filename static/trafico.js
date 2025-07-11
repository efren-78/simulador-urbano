let running = false;
let animationId;

const canvas = document.getElementById("mapaCanvas");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas });

camera.position.set(0, 20, 30);
camera.lookAt(0, 0, 0);
renderer.setSize(canvas.width, canvas.height);

// Luz
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);

// Carro
const car = new THREE.Mesh(
  new THREE.BoxGeometry(2, 1, 1),
  new THREE.MeshPhongMaterial({ color: 0xff4444 })
);
car.position.set(-10, 0.5, 0);
scene.add(car);

function animate() {
  if (!running) return;

  car.position.x += 0.05;
  if (car.position.x > 10) car.position.x = -10;

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

function stopSim() {
  running = false;
  cancelAnimationFrame(animationId);
}

function playSim() {
  if (!running) {
    running = true;
    animate();
  }
}

function resetSim() {
  stopSim();
  car.position.x = -10;
  renderer.render(scene, camera);
}

const socket = new WebSocket("ws://localhost:8000/ws");

socket.onmessage = function(event) {
  const msg = JSON.parse(event.data);
  console.log("Mensaje WebSocket:", msg);

  if (msg.accion === "start") playSim();
  else if (msg.accion === "stop") stopSim();
  else if (msg.accion === "reload") resetSim();
};

function enviarComando() {
  const input = document.getElementById("input").value;
  socket.send(input.trim().toLowerCase());
}
