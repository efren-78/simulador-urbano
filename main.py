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

#-----Operaciones basicas-----

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

#-----Operaciones extra-----

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

#------NLP------

#Modelo para recibir un prompt
class PromptRequest(BaseModel):
    prompt: str              #instruccion 
    max_tokens: int = 150    #limite de tokens 

#Endpoint que interpreta las instrucciones en lenguaje natural 

# ------NLP------
@app.post("/nlp")
async def responder(req: PromptRequest):
    params = generar_respuesta(req.prompt, req.max_tokens)

    if "error" in params:
        raise HTTPException(status_code=422, detail=params["content"])

    accion = params.get("accion", "none")
    numCars = params.get("numCars", 10)
    trafico = params.get("trafico", "moderado")
    semaforo = params.get("semaforo", None)
    calle = params.get("calle", None)
    tipo_accidente = params.get("tipo_accidente", "leve")  # ✅ Añadir estas líneas
    duracion_accidente = params.get("duracion_accidente", 15)
    ubicacion_accidente = params.get("ubicacion_accidente", "")

    # Actualiza configuración general
    sim.set_config(numCars, trafico)

    # Notificación global
    await notificar_todos({
        "accion": accion,
        "numCars": numCars,
        "trafico": trafico
    })
    
    # Ejecutar acciones principales
    if accion == "start" and not sim.running:
        t = threading.Thread(target=sim.iniciar_simulacion)
        t.start()
    elif accion == "stop":
        sim.detener_simulacion()
    elif accion == "reload":
        t = threading.Thread(target=sim.reiniciar_simulacion)
        t.start()

    # Semáforo
    global estado_semaforo
    if semaforo:
        estado_semaforo = semaforo
        await notificar_todos({
            "accion": "cambiar_semaforo",
            "estado": estado_semaforo
        })
        logging.info(f"Semáforo cambiado a: {estado_semaforo}")

    # Manejo de bloqueos
    if accion == "bloquear" and calle:
        await notificar_todos({
            "accion": "bloquear",
            "calle": calle
        })
        logging.info(f"Bloqueo solicitado en calle: {calle}")
        return {"status": f"Calle '{calle}' bloqueada", "calle": calle}

    elif accion == "desbloquear" and calle:
        await notificar_todos({
            "accion": "desbloquear",
            "calle": calle
        })
        logging.info(f"Bloqueo eliminado en calle: {calle}")
        return {"status": f"Calle '{calle}' desbloqueada", "calle": calle}

    elif accion == "accidente":
        await notificar_todos({
            "accion": "accidente",
            "tipo": tipo_accidente,
            "duracion": duracion_accidente,
            "ubicacion": ubicacion_accidente
        })
        
        asyncio.create_task(limpiar_accidente_automatico(duracion_accidente, ubicacion_accidente))
        
        return {
            "status": f"Accidente {tipo_accidente} simulado en {ubicacion_accidente} por {duracion_accidente}min",
            "tipo": tipo_accidente,
            "duracion": duracion_accidente,
            "ubicacion": ubicacion_accidente
        }

    elif accion == "clima":
        tipo = params.get("tipo_clima", "soleado")
        intensidad = params.get("intensidad_clima", "leve")
        duracion = params.get("duracion_clima", 30)
        
        await notificar_todos({
            "accion": "clima",
            "tipo": tipo,
            "intensidad": intensidad,
            "duracion": duracion
        })
        
        # Programar retorno a clima normal si no es soleado
        if tipo != "soleado":
            asyncio.create_task(restaurar_clima_automatico(duracion))
        
        return {
            "status": f"Clima {tipo} ({intensidad}) establecido por {duracion}min",
            "tipo_clima": tipo,
            "intensidad_clima": intensidad,
            "duracion_clima": duracion
        }

    # Respuesta final
    return {
        "status": f"Acción '{accion}' ejecutada",
        "numCars": sim.numCars,
        "trafico": sim.trafico,
        "semaforo": estado_semaforo,
        "calle": calle
    }

async def limpiar_accidente_automatico(duracion_minutos: int, ubicacion: str):
    await asyncio.sleep(duracion_minutos * 60)  # Convertir a segundos
    await notificar_todos({
        "accion": "limpiar_accidente", 
        "ubicacion": ubicacion
    })


async def restaurar_clima_automatico(duracion_minutos: int):
    await asyncio.sleep(duracion_minutos * 60)
    await notificar_todos({
        "accion": "clima",
        "tipo": "soleado",
        "intensidad": "leve",
        "duracion": 0
    })
    
#-----Conexion Websocket-----

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