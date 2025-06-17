# interfaz.py
import tkinter as tk
from tkinter import simpledialog, messagebox
from control import Simulacion

# Inicializa simulación
sim = Simulacion()

# Colores de tráfico
COLOR_BG = "#0b1c35"
COLOR_BTN = "#1e2e4a"
COLOR_TEXT = "white"

# Ventana principal
root = tk.Tk()
root.title("Tráfico Urbano")
root.geometry("1200x700")
root.configure(bg=COLOR_BG)

# Panel lateral izquierdo
sidebar = tk.Frame(root, width=250, bg=COLOR_BG)
sidebar.pack(side="left", fill="y")

# Logo y título
logo = tk.Label(sidebar, text="🚗", font=("Arial", 60), bg=COLOR_BG, fg=COLOR_TEXT)
logo.pack(pady=(30, 0))
titulo = tk.Label(sidebar, text="Tráfico\nUrbano", font=("Arial", 18, "bold"), bg=COLOR_BG, fg=COLOR_TEXT)
titulo.pack(pady=(0, 30))

# Función para crear botones
def crear_boton(texto, comando):
    return tk.Button(sidebar, text=texto, font=("Arial", 12), bg=COLOR_BTN, fg=COLOR_TEXT, relief="flat", height=2, command=comando)

# Funciones para los botones
def iniciar_simulacion():
    try:
        pasos = simpledialog.askinteger("Inicio", "¿Cuántos pasos debe durar la simulación?", parent=root)
        delay = simpledialog.askfloat("Inicio", "¿Cuánto delay entre pasos (en segundos)?", parent=root)
        if pasos is not None and delay is not None:
            sim.start(pasos, delay)
    except Exception as e:
        messagebox.showerror("Error", f"Datos inválidos: {e}")

def pausar_simulacion():
    sim.stop()

def reiniciar_simulacion():
    try:
        pasos = simpledialog.askinteger("Reinicio", "¿Cuántos pasos para el reinicio?", parent=root)
        delay = simpledialog.askfloat("Reinicio", "¿Delay entre pasos (en segundos)?", parent=root)
        if pasos is not None and delay is not None:
            sim.reload(pasos, delay)
    except Exception as e:
        messagebox.showerror("Error", f"Datos inválidos: {e}")

def mostrar_estado():
    sim.estado()

def salir():
    sim.stop()
    root.quit()

# Botones conectados
btn_guardar = crear_boton("▶ Iniciar Simulación", iniciar_simulacion)
btn_guardar.pack(fill="x", padx=20, pady=5)

btn_guardadas = crear_boton("⏸️ Pausar Simulación", pausar_simulacion)
btn_guardadas.pack(fill="x", padx=20, pady=5)

btn_historial = crear_boton("↻ Reiniciar simulación", reiniciar_simulacion)
btn_historial.pack(fill="x", padx=20, pady=5)

btn_estado = crear_boton("📊 Estado del Tráfico", mostrar_estado)
btn_estado.pack(fill="x", padx=20, pady=5)

btn_ajustes = crear_boton("📥 Salir", salir)
btn_ajustes.pack(fill="x", padx=20, pady=5)

# Tráfico en tiempo real
tr_label = tk.Label(sidebar, text="\nTráfico en tiempo real", font=("Arial", 12, "bold"), bg=COLOR_BG, fg=COLOR_TEXT)
tr_label.pack(pady=(40, 5))

tk.Label(sidebar, text="❌ Congestión Alta", bg=COLOR_BTN, fg="red", font=("Arial", 11)).pack(fill="x", padx=20, pady=2)
tk.Label(sidebar, text="🟠 Tráfico Moderado", bg=COLOR_BTN, fg="orange", font=("Arial", 11)).pack(fill="x", padx=20, pady=2)
tk.Label(sidebar, text="✅ Tráfico Fluido", bg=COLOR_BTN, fg="lightgreen", font=("Arial", 11)).pack(fill="x", padx=20, pady=2)

# Panel principal
main_frame = tk.Frame(root, bg="white")
main_frame.pack(side="right", expand=True, fill="both")

# Barra superior
top_bar = tk.Frame(main_frame, bg=COLOR_BG, height=50)
top_bar.pack(side="top", fill="x")

entry = tk.Entry(top_bar, font=("Arial", 12), width=50)
entry.pack(side="left", padx=10, pady=10)

btn_enviar = tk.Button(top_bar, text="➤", font=("Arial", 12))
btn_enviar.pack(side="left")

# Botones de control
for icon in ["⏵", "⏸", "⏹"]:
    tk.Button(top_bar, text=icon, font=("Arial", 12), bg=COLOR_BG, fg=COLOR_TEXT, relief="flat").pack(side="right", padx=5)

# Estado inferior
estado = tk.Label(main_frame, text="Zona Seleccionada: Rutas alternas", font=("Arial", 11), bg=COLOR_BG, fg=COLOR_TEXT)
estado.pack(side="bottom", fill="x")

root.mainloop()
