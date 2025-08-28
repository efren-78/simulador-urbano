# 🏙️  NeuroOctopus: Simulador Urbano con SUMO
NeuroOctopus es un proyecto de simulación de tráfico urbano a pequeña escala, controlado mediante comandos en lenguaje natural. Utiliza un modelo de lenguaje de OpenAI para generar eventos dinámicos que afectan la circulación en tiempo real.



## ✨  Funcionalidades
🧠 Control por lenguaje natural
🌧️ Simulación de condiciones climáticas (lluvia, niebla, etc.)
🚧 Generación de bloqueos de calles
🚑 Simulación de accidentes de tráfico


## 📦 Requisitos
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


