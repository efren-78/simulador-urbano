class Simulacion:
    def __init__(self):
        self.running = False
        self.config = {"numCars": 10, "trafico": "moderado"}

    def set_config(self, numCars, trafico):
        self.config = {"numCars": numCars, "trafico": trafico}

    def iniciar_simulacion(self):
        self.running = True
        # Aquí no corres SUMO, solo activas un flag
        # Puedes guardar logs, crear archivo de salida, etc.
    
    def detener_simulacion(self):
        self.running = False

    def reiniciar_simulacion(self):
        self.detener_simulacion()
        self.iniciar_simulacion()
