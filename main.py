from control import Simulacion #importa la clase Simulacion
from mapa import extraer_calles, extraer_vehiculos
from typing import Union
from fastapi import FastAPI
import threading
from fastapi.middleware.cors import CORSMiddleware

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

#Endpoint de iniciar simulacion
@simulacion.get("/start")
def start():
    if not sim.running:
        t = threading.Thread(target=sim.start, args=(100, 1))  # pasos, delay
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
    return {"status": "Simulación no estaba en ejecucion"}

#Endpoint de recargar simulacion
@simulacion.get("/reload")
def reload():
    if sim.running:
       sim.stop()
    sim.reload(100, 1)
    return {"status": "Simulación reiniciada"}
    
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

    
