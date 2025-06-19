import traci #Libreria para controlar SUMO
import time
import sumolib
from mapa import extraer_vehiculos

# Ruta a sumocfgco
sumo_cfg = "mapa.sumocfg"

# Comando para lanzar SUMO
sumo_cmd = ["sumo-gui", "-c", sumo_cfg]

class Simulacion:

    #Constructor
    def __init__(self):
        self.running = False #Estado de la simulacion
        self.step = 0 #Contador de pasos simulados 
        self.historial = []

    #Funcion que inicia la simulacion en SUMO-GUI
    def start(self, pasos, delay):
        if not self.running:
            traci.start(sumo_cmd)
            self.running = True
            print("Simulación iniciada")

            for _ in range(pasos):
                if traci.simulation.getMinExpectedNumber() == 0:
                    print("No quedan vehículos.")
                    break
                traci.simulationStep()
                self.step += 1

                # Extraer datos desde mapa.py
                self.historial = extraer_vehiculos()  # llamas a la función importada de mapa.py

                time.sleep(delay)
                

    #Funcion que detiene la simulacion
    def stop(self):
        if self.running:
            traci.close()
            self.running = False
            print("Simulacion Detenida")

    #Funcion que recarga la simulacion
    def reload(self, pasos, delay): #si la simulacion esta activa la apaga y vuelve a reiniciarla y la activa nuevamente 
        if self.running:
            traci.close()
        self.step = 0 #Reiniciar el contador
        self.start(pasos, delay)
        print("Simulacion reiniciada")
