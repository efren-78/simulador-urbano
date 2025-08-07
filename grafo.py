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