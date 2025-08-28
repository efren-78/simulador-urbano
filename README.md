# Simulador Urbano con SUMO (NeuroOctopus)

NeuroOctopus es un proyecto de simulación de tráfico urbano a pequeña escala, controlado mediante comandos en lenguaje natural. El sistema permite generar y gestionar eventos que alteran la circulación utilizando un LLM de OpenAI.  

Con NeuroOctopus puedes controlar:  
- 🚗 **Autos:** iniciar, detener, añadir o eliminar vehículos en la simulación.  
- 🚦 **Semáforos:** cambiar estados de luces, modificar ciclos y tiempos.  
- 🛑 **Bloqueos:** activar o eliminar bloqueos en calles específicas.  
- 🌐 **Tráfico:** ajustar el flujo, velocidad y densidad del tráfico en tiempo real.  
- 🚨 **Accidentes:** simular colisiones vehiculares y gestionar sus consecuencias.
- 🌧️ **Condiciones Climáticas:** modificar el clima (lluvia, noche, niebla, soleado.).
- 👁️ **Vista y Perspectiva:** cambiar ángulos de cámara, vistas aéreas y perspectivas de visualización.


---

## Requisitos
### 🔧 Python
Instala las dependencias necesarias con:

-   pip install -r requirements.txt

Si tienes problemas, intenta con:

-  python -m pip install -r requirements.txt


## 🚀 Ejecución
Para iniciar el servidor FastAPI:

-  uvicorn main:app --reload

## 🔐 Configuración
Asegúrate de tener un archivo .env en la raíz del proyecto con tu clave de API de OpenAI:

OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"


### 📚 Documentación
Una guia de comandos disponibles en lenguaje natural para controlar el simulador: 

*Agrega 10 autos
*Lluvia intensa casua accidente en SanAura
*Vista siguiendo auto
*Lluvia intensa por 5 minutos
*stop
*play


