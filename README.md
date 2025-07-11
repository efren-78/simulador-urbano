# 🏙️ Simulador Urbano con SUMO (NeuroOctopus)
NeuroOctopus es un proyecto de simulación de tráfico urbano a pequeña escala, controlado por comandos en lenguaje natural. El sistema permite generar eventos que alteren la circulación a base de un LLM de OpenAI


## 📦 Requisitos

### 🔧 Python

Instala las dependencias necesarias:
- pip install -r requirements.txt

Y si no funciona intenta con:
- python -r pip install requirements.txt


Para correr el codigo inicializa el FastApi con el comando:
- uvicorn main:app  --reload
