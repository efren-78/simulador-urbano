// ----- GRAFO Y DIJKSTRA -----

class Grafo {
  constructor() {
    this.nodos = new Map(); // { nodoId: { conexiones: { destino: peso } } }
  }

  agregarArista(origen, destino, peso) {
    if (!this.nodos.has(origen)) this.nodos.set(origen, { conexiones: {} });
    if (!this.nodos.has(destino)) this.nodos.set(destino, { conexiones: {} });
    this.nodos.get(origen).conexiones[destino] = peso;
    this.nodos.get(destino).conexiones[origen] = peso; // Bidireccional
  }

  dijkstra(inicio, fin) {
    const dist = {};
    const prev = {};
    const visitados = new Set();

    for (const nodo of this.nodos.keys()) {
      dist[nodo] = Infinity;
      prev[nodo] = null;
    }
    dist[inicio] = 0;

    while (visitados.size < this.nodos.size) {
      // Seleccionar el nodo con menor distancia no visitado
      let nodoActual = null;
      let minDist = Infinity;
      for (const nodo of this.nodos.keys()) {
        if (!visitados.has(nodo) && dist[nodo] < minDist) {
          nodoActual = nodo;
          minDist = dist[nodo];
        }
      }

      if (!nodoActual) break; // Sin nodos restantes
      if (nodoActual === fin) break;

      visitados.add(nodoActual);

      const conexiones = this.nodos.get(nodoActual).conexiones;
      for (const vecino in conexiones) {
        const peso = conexiones[vecino];
        const nuevaDist = dist[nodoActual] + peso;
        if (nuevaDist < dist[vecino]) {
          dist[vecino] = nuevaDist;
          prev[vecino] = nodoActual;
        }
      }
    }

    // Reconstruir el camino
    const camino = [];
    let nodo = fin;
    while (nodo) {
      camino.unshift(nodo);
      nodo = prev[nodo];
    }
    return camino;
  }
}

// ----- CONSTRUIR GRAFO DESDE CALLES.JSON -----
function construirGrafo(calles) {
  const grafo = new Grafo();

  Object.entries(calles).forEach(([nombre, puntos]) => {
    if (puntos.length === 2) {
      const p1 = `${puntos[0].x},${puntos[0].y}`;
      const p2 = `${puntos[1].x},${puntos[1].y}`;
      const dx = puntos[1].x - puntos[0].x;
      const dy = puntos[1].y - puntos[0].y;
      const peso = Math.sqrt(dx * dx + dy * dy);
      grafo.agregarArista(p1, p2, peso);
    }
  });

  return grafo;
}

// ----- BLOQUEAR CALLE -----
function bloquearCalle(grafo, puntoA, puntoB) {
  const nodoA = `${puntoA.x},${puntoA.y}`;
  const nodoB = `${puntoB.x},${puntoB.y}`;
  if (grafo.nodos.has(nodoA)) {
    delete grafo.nodos.get(nodoA).conexiones[nodoB];
  }
  if (grafo.nodos.has(nodoB)) {
    delete grafo.nodos.get(nodoB).conexiones[nodoA];
  }
}

// ----- RECONSTRUIR RUTA PARA UN AUTO -----
function recalcularRuta(car, grafo, destinoFinal) {
  const posicionActual = `${Math.round(car.position.x)},${Math.round(car.position.z)}`;
  const destino = `${destinoFinal.x},${destinoFinal.y}`;

  const camino = grafo.dijkstra(posicionActual, destino);

  if (camino.length > 1) {
    const puntos = camino.map(n => {
      const [x, y] = n.split(",").map(Number);
      return { x, y };
    });
    car.userData.ruta = puntos;
    car.userData.index = 0;
    car.userData.t = 0;
    console.log("Nueva ruta asignada:", camino);
  } else {
    console.warn("No hay ruta disponible");
  }
}

export { Grafo, construirGrafo, bloquearCalle, recalcularRuta };
