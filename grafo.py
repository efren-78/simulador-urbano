import json

class Grafo:
    def __init__(self):
        self.calles = {}  # Diccionario: nombre_calle -> lista de coordenadas
        self.adyacencias = {}
        
    # Cargar calles de archivo json
    def cargar_calles(self, archivo):
        with open(archivo, 'r') as f:
            data = json.load(f)
            self.calles = data
        for segmento in data.values():
            if len(segmento) != 2:
                continue

            # Convertir los puntos a tuplas (x,y)
            p1 = tuple (segmento[0].values())
            p2 = tuple (segmento[1].values())

            # Crear relaciones bidireccionales
            self.adyacencias.setdefault(p1, set()).add(p2)
            self.adyacencias.setdefault(p2, set()).add(p1)

    # Retorna coordenadas
    def obtener_coordenadas(self, nombre_calle):
        return self.calles.get(nombre_calle, [])

    # Retorna nombre de calles
    def obtener_nombres(self):
        return list(self.calles.keys())

    def vecinos(self, nodo):
        return self.adyacencias.get(nodo, set())

    def nodos(self):
        return list(self.adyacencias.keys())

    def contiene(self, nodo):
        return nodo in self.adyacencias

    def mostrar_adyacencias(self):
        for nodo, vecinos in self.adyacencias.items():
            print(f"{nodo} -> {list(vecinos)}")

    def calles_formato_json(self):
        resultado = []
        for nombre, puntos in self.calles.items():
            coords = [[p["x"], p["y"]] for p in puntos]
            resultado.append({
                "nombre": nombre,
                "coords": coords
            })
        return resultado

def ruta_a_coordenadas(grafo: Grafo, ruta: list):
    coordenadas = []

    for nombre_calle in ruta:
        segmento = grafo.obtener_coordenadas(nombre_calle)
        if not segmento or len(segmento) != 2:
            continue

        p1 = tuple(segmento[0].values())
        p2 = tuple(segmento[1].values())

        if not coordenadas:
            coordenadas.append(p1)

        if coordenadas[-1] != p1:
            coordenadas.append(p1)
        
        coordenadas.append(p2)

    return coordenadas
