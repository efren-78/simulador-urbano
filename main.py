from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from LLM_model import generar_respuesta
from config import Simulacion
import threading

app = FastAPI()
sim = Simulacion()

#configuracion del CORS para permitir peticiones (cualquier origen, método y encabezado)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#modelo para configurar la simulación (no. de autos y nivel de tráfico) 
class Configuracion(BaseModel):
    numCars: int
    trafico: str

# endpoint para configurar la simulación manualmente 
@app.post("/configurar")
def configurar_simulacion(config: Configuracion):
    sim.set_config(config.numCars, config.trafico)
    return {"status": "Configuración aplicada", "numCars": sim.numCars, "trafico": sim.trafico}

#inicializa la simulación 
@app.get("/start")
def start():
    if not sim.running:
        t = threading.Thread(target=sim.iniciar_simulacion)
        t.start()
        return {"status": "Simulación iniciada"}
    else:
        return {"status": "La simulación ya está en ejecución"}

#detiene la simulación 
@app.get("/stop")
def stop():
    if sim.running:
        sim.detener_simulacion()
        return {"status": "Simulación detenida"}
    else:
        return {"status": "No hay simulación activa"}

#reinicia la simulación 
@app.get("/reload")
def reload():
    t = threading.Thread(target=sim.reiniciar_simulacion)
    t.start()
    return {"status": "Simulación recargada"}

#consulta el estado de la simulación 
@app.get("/estado")
def estado():
    return {
        "running": sim.running,
        "numCars": sim.numCars,
        "trafico": sim.trafico
    }



#----------------NLP---------------------------------

#Modelo para recibir un prompt
class PromptRequest(BaseModel):
    prompt: str              #instruccion 
    max_tokens: int = 150    #limite de tokens 

#interpreta las instrucciones en lenguaje natural 
@app.post("/nlp")
def responder(req: PromptRequest):
    params = generar_respuesta(req.prompt, req.max_tokens)

    #valida si hubo error 
    if "error" in params:
        raise HTTPException(status_code=422, detail=params["content"])

    #validar y extraer valores
    try:
        numCars = int(params.get("numCars", 10))  #valor por defecto 10
    except ValueError:
        raise HTTPException(status_code=400, detail="numCars no es un número válido.")

    trafico = params.get("trafico", "moderado") #valor por defecto moderado 
    accion = str(params.get("accion", "")).strip().lower().replace('"', '').replace("'", '')

    #aplica la configuracion
    sim.set_config(numCars, trafico)

    #ejecuta la accion 
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

    #respuesta
    return {
        "status": f"Acción '{accion}' ejecutada",
        "numCars": sim.numCars,
        "trafico": sim.trafico
    }
