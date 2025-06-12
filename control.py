import traci #para controlar SUMO
import subprocess #Permite ejecutar comandos, se puede usar para procesos de sumo
import os #permite interactuar con el sistema de sumo (leer rutas, vehiculos, archivos, etc.)

# step() Avanza un paso de simulacion 
# load () carga un nuevo escenario 
# traci.start(["sumo","-c","archivo"]) inicia la simulacion 
# getIDList Listas (calles, vehiculos, semaforos, carriles)
# getPosition(vehID) obtiene la posicion de un vehiculo 
# getSpeed(vehID) obtiene la velocidad de un vehiculo 
# setRedYellowGreenState(tlsID,state) cambia el semaforo 

SUMO = "sumo-gui" #abre la simulacion con interfaz
ARCH ="mapa.sumocfg" #nombre del archivo

class Simulacion:
    def __init__(self):
        self.running = False #inidica si la simulacion esta activa
        self.step = 0 #cuenta el numero de pasos simulados 

    def start(self):
        if not self.running:
            traci.start(SUMO, "-c", ARCH) #unsa -c para indicar el archivo
            self.running = True
            self.step = 0
            print("Simulacion iniciada")

    def stop(self):
        if self.running:
            traci.close()
            self.running = False
            print("Simulacion Detenida")

    def reload(self): #si la simulacion esta activa la apaga y vuelve a reiniciarla y la activa nuevamente 
        if self.running:
            traci.close()
        traci.start([SUMO, "-c",ARCH])
        self.running = True
        self.step = 0
        print("Simulacion reiniciada")

    def estado(self): 
        if self.running:
            traci.simulacionStep()
            self.step += 1
            vehiculos = traci.vehiculo.getIDList() # getIDList() es una funcion de traci que muestra toda la lista de los vehiculos en la simulacion 
            
