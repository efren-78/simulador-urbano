from control import Simulacion #importa la clase Simulacion
from mapa import extraer_calles, extraer_vehiculos, extraer_nodos
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

pasos = 600
delay = 0.3
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




@simulacion.get("/nodos")
def nodos():
    return extraer_nodos()