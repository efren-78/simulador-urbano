import time
import threading

class Simulacion:
    #inicializa los valores por defecto
    def __init__(self):
        self.numCars = 10
        self.trafico = "moderado"
        self.running = False
        self.lock = threading.Lock()
    
    #Establece los parámetros de configuración de la simulación
    def set_config(self, numCars, trafico):
        self.numCars = numCars
        self.trafico = trafico
        print(f"Configuración: {numCars} autos, tráfico {trafico}") #imprime la configuración actual 

    #Metodo para inicializar la simulación
    def iniciar_simulacion(self, pasos=200, delay=0.2):
        #activa la simulación 
        with self.lock:
            self.running = True 

        print(f"Simulación iniciada con {self.numCars} autos y tráfico {self.trafico}")

        #recorre cada paso hasta el número definido 
        for i in range(pasos):
            #en cada paso verifica si la simulacion ha sido interrumpida
            with self.lock:
                if not self.running:
                    print("Simulación interrumpida")
                    break
            #print(f"Paso {i+1}/{pasos}")

            time.sleep(delay)

        print("Simulación finalizada")

    #Metodo para detener la simulacion 
    def detener_simulacion(self):
        with self.lock:
            self.running = False
        print("Simulación detenida")

    #Metido para reiniciar la simulación
    def reiniciar_simulacion(self, pasos=200, delay=0.2):
        print("Simulación recargada")
        self.detener_simulacion()
        self.iniciar_simulacion(pasos, delay)