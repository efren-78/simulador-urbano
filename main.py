from control import Simulacion #importa la clase Simulacion
from mapa import extraer_calles, extraer_vehiculos, extraer_nodos
from typing import Union
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from LLM_model import generar_respuesta
import threading
from pydantic import BaseModel
from LLM_model import generar_respuesta

simulacion = FastAPI() #crea una instancia del API
sim = Simulacion() #crea una instancia de la clase

# CORS para conexion desde el frontend
simulacion.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pasos = 600
delay = 0.3

"""-------Operaciones basicas de la simulacion-------"""
#Endpoint de iniciar simulacion
@simulacion.get("/start")
def start():
    if not sim.running:
        t = threading.Thread(target=sim.start, args=(pasos, delay))  # pasos, delay
        t.start()
        return {"status": "Simulación iniciada"}
    else:
        return {"status": "Ya en ejecución"}

#Endpoint de detener simulacion
@simulacion.get("/stop")
def stop():
    if sim.running:
        sim.stop()
        return {"status": "Simulación detenida"}
    return {"status": "Simulación no esta en ejecucion para detenerse"}

#Endpoint de recargar simulacion
@simulacion.get("/reload")
def reload():
    if sim.running:
        sim.stop()
        sim.reload(pasos, delay)
        return {"status": "Simulación reiniciada finalizada"}
    return {"status": "Simulación no esta en ejecucion para reiniciarse"}
    
"""-------Extraccion de datos-------"""
#Endpoint de extraccion de vehiculos de SUMO
@simulacion.get("/vehiculos")
def vehiculos():
    if not sim.running:
        return {"error": "La simulación no está en ejecución"}
    return extraer_vehiculos()

#Endpoint de extraccion de calles de SUMO
@simulacion.get("/calles")
def calles():
    return extraer_calles()

#Endpoint de extraccion de nodos 
@simulacion.get("/nodos")
def nodos():
    return extraer_nodos()


"""-------NLP-------"""
class PromptRequest(BaseModel):
    prompt: str
    max_tokens: int = 150

#Endpoint nlp del deepseek
"""@simulacion.post("/nlp")
def responder(req: PromptRequest):
    try:
        result = generar_respuesta(req.prompt, req.max_tokens)
        return {"respuesta": result}
    except requests.HTTPError as http_err:
        raise HTTPException(status_code=502, detail=f"Error en la API externa: {http_err}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {e}")
"""

#Endpoint de modelo LLM
@simulacion.post("/nlp")
def responder(req: PromptRequest):
    try:
        result = generar_respuesta(req.prompt, req.max_tokens)
        return {"respuesta": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {e}")