# Simulador Urbano con SUMO (NeuroOctopus)

NeuroOctopus es un proyecto de simulación de tráfico urbano a pequeña escala, controlado mediante comandos en lenguaje natural. El sistema permite generar y gestionar eventos que alteran la circulación utilizando un LLM de OpenAI.  

Con NeuroOctopus puedes controlar:  
- 🚗 **Autos:** iniciar, detener, añadir o eliminar vehículos en la simulación.  
- 🚦 **Semáforos:** cambiar estados de luces, modificar ciclos y tiempos.  
- 🛑 **Bloqueos:** activar o eliminar bloqueos en calles específicas.  
- 🌐 **Tráfico:** ajustar el flujo, velocidad y densidad del tráfico en tiempo real.  

---

## Requisitos


Instala las dependencias necesarias:

pip install -r requirements.txt


Y si no funciona intenta con:
- python -m pip install -r requirements.txt


Para correr el codigo inicializa el FastApi con el comando:
- uvicorn main:app  --reload


### Recordatorio
Para que funcione se debe tener en un archivo .env la declaracion de nuestra ApiKey:
- OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"