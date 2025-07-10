from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from LLM_model import generar_respuesta
from config import Simulacion
import threading

app = FastAPI()
sim = Simulacion()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Configuracion(BaseModel):
    numCars: int
    trafico: str

@app.post("/configurar")
def configurar_simulacion(config: Configuracion):
    sim.set_config(config.numCars, config.trafico)
    return {"status": "Configuración aplicada", "numCars": sim.numCars, "trafico": sim.trafico}

@app.get("/start")
def start():
    if not sim.running:
        t = threading.Thread(target=sim.iniciar_simulacion)
        t.start()
        return {"status": "Simulación iniciada"}
    else:
        return {"status": "La simulación ya está en ejecución"}

@app.get("/stop")
def stop():
    if sim.running:
        sim.detener_simulacion()
        return {"status": "Simulación detenida"}
    else:
        return {"status": "No hay simulación activa"}

@app.get("/reload")
def reload():
    t = threading.Thread(target=sim.reiniciar_simulacion)
    t.start()
    return {"status": "Simulación recargada"}

@app.get("/estado")
def estado():
    return {
        "running": sim.running,
        "numCars": sim.numCars,
        "trafico": sim.trafico
    }

#----------------NLP---------------------------------
class PromptRequest(BaseModel):
    prompt: str
    max_tokens: int = 150

@app.post("/nlp")
def responder(req: PromptRequest):
    params = generar_respuesta(req.prompt, req.max_tokens)

    if "error" in params:
        raise HTTPException(status_code=422, detail=params["content"])

    try:
        numCars = int(params.get("numCars", 10))
    except ValueError:
        raise HTTPException(status_code=400, detail="numCars no es un número válido.")

    trafico = params.get("trafico", "moderado")
    accion = str(params.get("accion", "")).strip().lower().replace('"', '').replace("'", '')

    sim.set_config(numCars, trafico)

    if accion == "start":
        if not sim.running:
            t = threading.Thread(target=sim.iniciar_simulacion)
            t.start()
    elif accion == "stop":
        sim.detener_simulacion()
    elif accion == "reload":
        t = threading.Thread(target=sim.reiniciar_simulacion)
        t.start()
    else:
        print(f"Acción desconocida: {accion}")

    return {
        "status": f"Acción '{accion}' ejecutada",
        "numCars": sim.numCars,
        "trafico": sim.trafico
    }
