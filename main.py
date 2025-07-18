from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn, threading, asyncio, json, logging

from LLM_model import generar_respuesta #Modelo openai
from config import Simulacion #Operaciones basicas

app = FastAPI() #Api
sim = Simulacion() #Operaciones
connected_websockets = [] 

estado_semaforo = "rojo"  # Estado inicial

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

#----------------Botones basicos---------------------------------

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

#----------------Botones extras---------------------------------

@app.post("/semaforo")
async def cambiar_semaforo(estado: str):
    global estado_semaforo
    if estado in ["verde", "amarillo", "rojo"]:
        estado_semaforo = estado
        await notificar_todos({"accion": "cambiar_semaforo", "estado": estado})
        return {"status": f"Semáforo cambiado a {estado}"}
    return {"error": "Estado inválido"}


@app.get("/estado_semaforo")
def obtener_estado():
    return {"estado": estado_semaforo}

#-----------------------NLP------------------------------

#Modelo para recibir un prompt
class PromptRequest(BaseModel):
    prompt: str              #instruccion 
    max_tokens: int = 150    #limite de tokens 

#Endpoint que interpreta las instrucciones en lenguaje natural 
@app.post("/nlp")
async def responder(req: PromptRequest):
    params = generar_respuesta(req.prompt, req.max_tokens)

    if "error" in params:
        raise HTTPException(status_code=422, detail=params["content"])

    accion = params.get("accion", "none")
    numCars = params.get("numCars", 10)
    trafico = params.get("trafico", "moderado")
    semaforo = params.get("semaforo", None)

    sim.set_config(numCars, trafico)

    # Notificación global
    await notificar_todos({
        "accion": accion,
        "numCars": numCars,
        "trafico": trafico
    })

    # Ejecutar acción
    if accion == "start" and not sim.running:
        t = threading.Thread(target=sim.iniciar_simulacion)
        t.start()
    elif accion == "stop":
        sim.detener_simulacion()
    elif accion == "reload":
        t = threading.Thread(target=sim.reiniciar_simulacion)
        t.start()

    # Si hay cambio de semáforo → Notificar con formato correcto
    global estado_semaforo
    if semaforo:
        estado_semaforo = semaforo
        await notificar_todos({
            "accion": "cambiar_semaforo",
            "estado": estado_semaforo
        })
        logging.info(f"Semáforo cambiado a: {estado_semaforo}")

    return {
        "status": f"Acción '{accion}' ejecutada",
        "numCars": sim.numCars,
        "trafico": sim.trafico,
        "semaforo": estado_semaforo
    }



#-----------------------Conexion Websocket------------------------------

#Endpoint que realiza la conexion
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)
    logging.info("Cliente WebSocket conectado")

    try:
        while True:
            text = await websocket.receive_text()
            logging.info(f"Comando recibido: {text}")

            try:
                # Si viene JSON, interpretamos los parámetros
                data = json.loads(text)
                accion = data.get("accion", "").lower()
                numCars = data.get("numCars")
                trafico = data.get("trafico")

                # Aplicar configuración si corresponde
                if numCars:
                    sim.set_config(numCars, sim.trafico)
                if trafico:
                    sim.set_config(sim.numCars, trafico)

                # Ejecutar acción
                if accion in ["start", "stop", "reload"]:
                    await notificar_todos(data)
                    if accion == "start" and not sim.running:
                        t = threading.Thread(target=sim.iniciar_simulacion)
                        t.start()
                    elif accion == "stop":
                        sim.detener_simulacion()
                    elif accion == "reload":
                        t = threading.Thread(target=sim.reiniciar_simulacion)
                        t.start()
                elif accion == "ajustar":
                    await notificar_todos({"accion": "ajustar", "numCars": numCars, "trafico": trafico})
                else:
                    await websocket.send_text(json.dumps({"error": f"Acción desconocida: {accion}"}))

            except json.JSONDecodeError:
                # Si no es JSON, interpretar como texto simple
                cmd = text.lower()
                if cmd in ["start", "stop", "reload"]:
                    await notificar_todos({"accion": cmd})
                    if cmd == "start" and not sim.running:
                        t = threading.Thread(target=sim.iniciar_simulacion)
                        t.start()
                    elif cmd == "stop":
                        sim.detener_simulacion()
                    elif cmd == "reload":
                        t = threading.Thread(target=sim.reiniciar_simulacion)
                        t.start()
                else:
                    await websocket.send_text(json.dumps({"error": "Formato no válido. Usa JSON o comando básico."}))

    except WebSocketDisconnect:
        connected_websockets.remove(websocket)
        logging.info("Cliente desconectado")

# Enviar a todos los clientes conectados
async def notificar_todos(data: dict):
    
    for ws in connected_websockets.copy():
        try:
            await ws.send_text(json.dumps(data))
        except:
            connected_websockets.remove(ws)


# Sirve archivos estáticos HTML + JS debe ir en /static)
app.mount("/", StaticFiles(directory="static", html=True), name="static")