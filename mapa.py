import sumolib
import traci



#Funcion que extrae los nodos y bordes del archivo net de SUMO
def extraer_calles(archivo_net="SumoRed.net.xml"):
    net = sumolib.net.readNet(archivo_net)

    calles = []
    for edge in net.getEdges():
        shape = edge.getShape()  # lista de (x, y)
        if shape:
            puntos = [{"x": x, "y": y} for x, y in shape]
        else:
            from_coord = edge.getFromNode().getCoord()
            to_coord = edge.getToNode().getCoord()
            puntos = [
                {"x": from_coord[0], "y": from_coord[1]},
                {"x": to_coord[0], "y": to_coord[1]}
            ]
        
        calles.append({
            "id": edge.getID(),
            "puntos": puntos
        })

    return calles

#Funcion que extrae vehiculos y caracteristicas de SUMO
def extraer_vehiculos():
    
    datos = []
    for vehiculo_id in traci.vehicle.getIDList():
        posicion = traci.vehicle.getPosition(vehiculo_id)
        velocidad = traci.vehicle.getSpeed(vehiculo_id)
        datos.append({
            "id": vehiculo_id,
            "posicion": {"x": posicion[0], "y": posicion[1]},
            "velocidad": velocidad
        })
    
    return datos


def extraer_nodos(archivo_net="SumoRed.net.xml"):
    net = sumolib.net.readNet(archivo_net)

    nodos = []
    for nodo in net.getNodes():
        coord = nodo.getCoord()
        nodos.append({
            "id": nodo.getID(),
            "x": coord[0],
            "y": coord[1]
        })

    return nodos
