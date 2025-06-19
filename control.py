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

import threading

class Simulacion:
    def __init__(self):
        self.running = False
        self.step = 0
        self._stop_event = threading.Event()
        self._thread = None

    def _run_simulacion(self, pasos, delay):
        try:
            for _ in range(pasos):
                if self._stop_event.is_set():
                    print("Simulación detenida por evento.")
                    break
                if traci.simulation.getMinExpectedNumber() == 0:
                    print("No quedan vehículos.")
                    break
                traci.simulationStep()
                self.step += 1
                #print(f"Paso {self.step} ejecutado.")
                time.sleep(delay)
        finally:
           
            self.running = False
            print("Simulación terminada o detenida.")#

    def start(self, pasos, delay):
        if not self.running:
            traci.start(sumo_cmd)
            self.running = True
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run_simulacion, args=(pasos, delay))
            self._thread.start()
            print("Simulación iniciada en hilo separado")

    def stop(self):
        if self.running:
            self._stop_event.set()
            self._thread.join()  # Espera a que el hilo termine
            traci.close()
            self.running = False
            print("Simulación detenida")

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


    def cerrar_calle(self, calle_id="E1", ruta_alternativa=["E0", "E2", "E3", "E4"]):
        if self.running:
            print(f"⚠️  ¡Atención! La calle {calle_id} está cerrada.")

        # Identificar vehículos actualmente en rutas que incluyan la calle cerrada
        vehiculos = traci.vehicle.getIDList()
        for v in vehiculos:
            ruta_actual = traci.vehicle.getRoute(v)
            if calle_id in ruta_actual:
                print(f"Redirigiendo vehículo {v} a ruta alternativa...")
                traci.vehicle.setRoute(v, ruta_alternativa)
            else:
             print("La simulación no está activa.")


    def mostrar_menu(self):
        print(" Menu :D ")
        print("----------------------------------")
        print("1. Iniciar simulacion")
        print("2. Detener Simulacion")
        print("3. Reiniciar simulacion")
        print("4. Mostrar estado del trafico")
        print("5. Salir")
        print("6. Simular cierre de calle E1")  # <- si agregaste la función de cierre

    
