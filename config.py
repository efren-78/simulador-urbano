import time
import threading

class Simulacion:
    def __init__(self):
        self.numCars = 10
        self.trafico = "moderado"
        self.running = False
        self.lock = threading.Lock()

    def set_config(self, numCars, trafico):
        self.numCars = numCars
        self.trafico = trafico
        print(f"Configuración: {numCars} autos, tráfico {trafico}")

    def iniciar_simulacion(self, pasos=200, delay=0.2):
        with self.lock:
            self.running = True

        print(f"Simulación iniciada con {self.numCars} autos y tráfico {self.trafico}")

        for i in range(pasos):
            with self.lock:
                if not self.running:
                    print("Simulación interrumpida")
                    break
            #print(f"Paso {i+1}/{pasos}")
            time.sleep(delay)

        print("Simulación finalizada")

    def detener_simulacion(self):
        with self.lock:
            self.running = False
        print("Simulación detenida")

    def reiniciar_simulacion(self, pasos=200, delay=0.2):
        print("Simulación recargada")
        self.detener_simulacion()
        self.iniciar_simulacion(pasos, delay)
