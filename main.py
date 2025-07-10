from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from LLM_model import generar_respuesta
import threading

# Simulación local 3D
from config import Simulacion  

# NLP
#from LLM_model import generar_respuesta

app = FastAPI()
sim = Simulacion()  # Clase que controlará flags como running, config, etc.
pasos = 200
delay = 0.2
# Middleware para frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración enviada desde el frontend
class Configuracion(BaseModel):
    numCars: int
    trafico: str

# Estado interno
config_actual = {
    "numCars": 10,
    "trafico": "moderado"
}

"""----------- Simulación -----------"""
#Endpoint para guardar congiguracion
@app.post("/configurar")
def configurar_simulacion(config: Configuracion):
    config_actual["numCars"] = config.numCars
    config_actual["trafico"] = config.trafico
    sim.set_config(config.numCars, config.trafico)  # Método que debes implementar en Simulacion3D
    return {"status": "Configuración aplicada", "config": config_actual}

#Endpoint para iniciar simulacion
@app.get("/start")
def start():
    if not sim.running:
        t = threading.Thread(target=sim.iniciar_simulacion)
        t.start()
        return {"status": "Simulación iniciada"}
    else:
        return {"status": "Simulación ya en ejecución"}


@app.get("/stop")
def stop():
    if sim.running:
        sim.detener_simulacion()
        return {"status": "Simulación detenida"}
    return {"status": "No hay simulación activa para detener"}


@app.get("/reload")
def reload():
    sim.reiniciar_simulacion()
    return {"status": "Simulación reiniciada"}


"""----------- NLP -----------"""

class PromptRequest(BaseModel):
    prompt: str
    max_tokens: int = 150

@app.post("/nlp")
def responder(req: PromptRequest):
    try:
        params = generar_respuesta(req.prompt, req.max_tokens)

        if "error" in params:
            raise HTTPException(status_code=422, detail=params["content"])

        sim.set_config(
            numCars=int(params.get("numCars", 10)),
            trafico=params.get("trafico", "moderado")
        )

        accion = params.get("accion", "").lower()

        if accion == "start":
            sim.start(pasos, delay)
        elif accion == "stop":
            sim.stop()
        elif accion == "reload":
            sim.reload(pasos, delay)
        else:
            print(f"Acción desconocida: {accion}")

        return {
            "status": f"Acción '{accion}' ejecutada con {sim.numCars} autos y tráfico {sim.trafico}",
            "params": params
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error NLP: {e}")