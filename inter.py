import tkinter as tk
from tkinter import messagebox
import traci
import threading
import time
import os

# Cambia esto si no está en PATH
SUMO_BINARY = "sumo-gui"
CONFIG_FILE = "mapa.sumocfg"

COLOR_BG = "#0D1B2A"
COLOR_BTN = "#1B263B"
COLOR_TEXT = "white"

running = False  # Variable global para controlar la simulación


def iniciar_simulacion():
    global running
    running = True

    def run():
        try:
            traci.start([SUMO_BINARY, "-c", CONFIG_FILE])
            while running and traci.simulation.getMinExpectedNumber() > 0:
                traci.simulationStep()
                vehiculos = traci.vehicle.getIDList()
                label_info.config(text=f"Vehículos en circulación: {len(vehiculos)}")
                time.sleep(0.3)
            traci.close()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    hilo = threading.Thread(target=run)
    hilo.start()


def detener_simulacion():
    global running
    running = False
    try:
        traci.close()
    except Exception:
        pass


# ========== GUI ==========
root = tk.Tk()
root.title("Tráfico Urbano")
root.geometry("1000x600")

# Barra lateral
sidebar = tk.Frame(root, bg=COLOR_BG, width=200)
sidebar.pack(side="left", fill="y")

def crear_boton(texto, comando):
    return tk.Button(sidebar, text=texto, font=("Arial", 12), bg=COLOR_BTN, fg=COLOR_TEXT,
                     relief="flat", height=2, command=comando)

crear_boton("▶ Iniciar Simulación", iniciar_simulacion).pack(fill="x", padx=20, pady=5)
crear_boton("⏸️ Pausar Simulación", detener_simulacion).pack(fill="x", padx=20, pady=5)
crear_boton("📥 Salir", root.destroy).pack(fill="x", padx=20, pady=30)

# Área principal
main_area = tk.Frame(root, bg="white")
main_area.pack(expand=True, fill="both")

label_info = tk.Label(main_area, text="Vehículos en circulación: 0", font=("Arial", 16), bg="white", fg="black")
label_info.pack(pady=20)

root.mainloop()
