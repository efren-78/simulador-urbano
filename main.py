from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn, threading, asyncio, json

from LLM_model import generar_respuesta #Modelo openai
from config import Simulacion #Operaciones basicas

app = FastAPI() #Api
sim = Simulacion() #Operaciones
connected_websockets = [] 

#Configuracion del CORS para permitir peticiones
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

#----------------Control medio botones---------------------------------

#Endpoint que inicializa la simulación 
@app.get("/start")
def start():
    if not sim.running:
        t = threading.Thread(target=sim.iniciar_simulacion)
        t.start()
        return {"status": "Simulación iniciada"}
    else:
        return {"status": "La simulación ya está en ejecución"}

#Endpoint que detiene la simulación 
@app.get("/stop")
def stop():
    if sim.running:
        sim.detener_simulacion()
        return {"status": "Simulación detenida"}
    else:
        return {"status": "No hay simulación activa"}

#Endpoint que reinicia la simulación 
@app.get("/reload")
def reload():
    t = threading.Thread(target=sim.reiniciar_simulacion)
    t.start()
    return {"status": "Simulación recargada"}

#Endpoint que consulta el estado de la simulación 
@app.get("/estado")
def estado():
    return {
        "running": sim.running,
        "numCars": sim.numCars,
        "trafico": sim.trafico
    }

#-----------------------NLP------------------------------

#Modelo para recibir un prompt
class PromptRequest(BaseModel):
    prompt: str              #instruccion 
    max_tokens: int = 150    #limite de tokens 

#Endpoint que interpreta las instrucciones en lenguaje natural 
@app.post("/nlp")
async def responder(req: PromptRequest):
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

    await notificar_todos({
        "accion": accion,
        "numCars": numCars,
        "trafico": trafico
    })


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
        return {"status": f"Acción desconocida: '{accion}'"}


    #respuesta
    return {
        "status": f"Acción '{accion}' ejecutada",
        "numCars": sim.numCars,
        "trafico": sim.trafico
    }

#-----------------------Conexion Websocket------------------------------

#Endpoint que realiza la conexion
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)
    print("Cliente WebSocket conectado")

    try:
        while True:
            text = await websocket.receive_text()
            print(f"Recibido: {text}")
            if text.lower() == "start":
                await notificar_todos({"accion": "start"})
            elif text.lower() == "stop":
                await notificar_todos({"accion": "stop"})
            elif text.lower() == "reload":
                await notificar_todos({"accion": "reload"})
            else:
                await websocket.send_text("Comando no reconocido.")
    except WebSocketDisconnect:
        connected_websockets.remove(websocket)
        print("Cliente desconectado")

# Enviar a todos los clientes conectados
async def notificar_todos(data: dict):
    
    for ws in connected_websockets.copy():
        try:
            await ws.send_text(json.dumps(data))
        except:
            connected_websockets.remove(ws)


# Sirve archivos estáticos HTML + JS debe ir en /static)
app.mount("/", StaticFiles(directory="static", html=True), name="static")