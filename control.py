import traci #Libreria para controlar SUMO
import time
#import subprocess #Permite ejecutar comandos, se puede usar para procesos de sumo
#import os #permite interactuar con el sistema de sumo (leer rutas, vehiculos, archivos, etc.)

# step() Avanza un paso de simulacion 
# load () carga un nuevo escenario 
# traci.start(["sumo","-c","archivo"]) inicia la simulacion 
# getIDList Listas (calles, vehiculos, semaforos, carriles)
# getPosition(vehID) obtiene la posicion de un vehiculo 
# getSpeed(vehID) obtiene la velocidad de un vehiculo 
# setRedYellowGreenState(tlsID,state) cambia el semaforo 

# Ruta a sumocfgco
sumo_cfg = "mapa.sumocfg"

# Comando para lanzar SUMO
sumo_cmd = ["sumo-gui", "-c", sumo_cfg]

class Simulacion:

    #Constructor
    def __init__(self):
        self.running = False #Estado de la simulacion
        self.step = 0 #Contador de pasos simulados 

    #Funcion que inicia la simulacion en SUMO-GUI
    def start(self, pasos, delay):
        if not self.running:
            traci.start(sumo_cmd)
            self.running = True
            print("Simulación iniciada")

            try:
                for _ in range(pasos):
                    if traci.simulation.getMinExpectedNumber() == 0:
                        print("No quedan vehículos.")
                        break
                    traci.simulationStep()
                    self.step += 1
                    print(f"Paso {self.step} ejecutado.")
                    time.sleep(delay)
            except KeyboardInterrupt:
                print("\nSimulación interrumpida por el usuario con Ctrl+C.")
                print("_____________________________________________________")
            finally:
                self.mostrar_menu()


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

    #Funcion que muestra el estado de trafico(vehiculos,bicis,etc)
    def estado(self): 
        if self.running:
            vehiculos = traci.vehicle.getIDList()
            tipos = traci.vehicletype.getIDList()
            print(f"Paso {self.step}")
            print(f"Vehiculo {vehiculos}")
            print(f"Tipo de vehiculos: {tipos}")

        else:
            print("La simulacion no esta en ejecucion")

    #Funcion para mostrar el menu 
    def mostrar_menu(self): #define una funcion para mostrar el menu 
        print(" Menu :D ")
        print("----------------------------------")
        print("1. Iniciar simulacion")
        print("2. Detener Simulacion")
        print("3. Reiniciar simulacion")
        print("4. Mostrar estado del trafico")
        print("5. Salir")
            
