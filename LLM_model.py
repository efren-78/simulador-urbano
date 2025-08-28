from openai import OpenAI
from dotenv import load_dotenv
import os, json, re, logging

# Configurar logs
logging.basicConfig(level=logging.INFO, format="%(asctime)s [LLM] %(message)s")

# Cargar variables del .env
load_dotenv()

# Inicializa cliente OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

#Genera respuesta NLP para la simulación de tráfico.   
# Devuelve SIEMPRE un diccionario con:
# {"accion": str, 
# "numCars": int, 
# "trafico": str, 
# "semaforo": str | None}

def generar_respuesta(prompt: str, max_tokens: int = 150) -> dict:
    # Valores por defecto
    respuesta_fallback = {
        "accion": "none",
        "numCars": 10,
        "trafico": "moderado",
        "semaforo": None,
        "calle": None,
        "tipo_accidente": None, 
        "duracion_accidente": None,
        "ubicacion_accidente": None
    }

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Eres un asistente para un simulador de tráfico urbano. "
                        "Tu única tarea es interpretar instrucciones del usuario "
                        "y devolver SIEMPRE un JSON puro y válido. "
                        "El JSON debe incluir: "
                        "\"accion\" (uno de: \"start\", \"stop\", \"reload\", \"ajustar\", "
                        "\"bloquear\", \"desbloquear\", \"accidente\", \"none\"), " 
                        "\"numCars\" (entero), "
                        "\"trafico\" (\"alto\", \"moderado\" o \"bajo\"), "
                        "opcionalmente \"semaforo\" (\"verde\", \"rojo\", \"amarillo\"), "
                        "opcionalmente \"calle\" (nombre de la calle), "
                        "opcionalmente \"tipo_accidente\" (\"leve\", \"moderado\", \"grave\"), " 
                        "opcionalmente \"duracion_accidente\" (entero, minutos), " 
                        "opcionalmente \"ubicacion_accidente\" (string). "

                        "EJEMPLOS: "
                        "\"Simula accidente leve en Avenida Principal por 10 minutos\" → "
                        "{\"accion\": \"accidente\", \"tipo_accidente\": \"leve\", \"ubicacion_accidente\": \"Avenida Principal\", \"duracion_accidente\": 10}"
                        
                        "No devuelvas bloques de código (```), "
                        "ni texto adicional, solo JSON válido."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.1,
            response_format={"type": "json_object"}, 
            timeout=10
        )

        raw_content = response.choices[0].message.content.strip()
        logging.info(f"Respuesta cruda del LLM: {raw_content}")

        # Limpiar si viene envuelto en ```
        if raw_content.startswith("```"):
            raw_content = re.sub(r"^```[a-zA-Z]*\n?", "", raw_content)
            raw_content = re.sub(r"```$", "", raw_content)
            raw_content = raw_content.strip()

        # Intentar convertir a JSON
        try:
            params = json.loads(raw_content)
        except json.JSONDecodeError:
            logging.error(f"Error al decodificar JSON: {raw_content}")
            return respuesta_fallback

        # Validación básica
        accion = str(params.get("accion", "none")).lower()
        if accion not in ["start", "stop", "reload", "ajustar", "bloquear", "desbloquear", "accidente", "none"]:
            accion = "none"

        if accion == "accidente":
            tipo = params.get("tipo_accidente", "leve")
            if tipo not in ["leve", "moderado", "grave"]:
                tipo = "leve"
            
            try:
                duracion = int(params.get("duracion_accidente", 15))
                duracion = max(5, min(120, duracion))  # Limitar 5-120 minutos
            except (ValueError, TypeError):
                duracion = 15
            
            ubicacion = params.get("ubicacion_accidente", "")
            
            return {
                "accion": "accidente",
                "numCars": 10,  # Valores por defecto para accidentes
                "trafico": "moderado",
                "semaforo": None,
                "calle": None,
                "tipo_accidente": tipo,
                "duracion_accidente": duracion,
                "ubicacion_accidente": ubicacion
            }

        try:
            numCars = int(params.get("numCars", 10))
        except ValueError:
            numCars = 10

        trafico = params.get("trafico", "moderado").lower()
        if trafico not in ["alto", "moderado", "bajo"]:
            trafico = "moderado"

        semaforo = params.get("semaforo", None)
        if semaforo:
            semaforo = semaforo.lower()
            if semaforo not in ["verde", "amarillo", "rojo"]:
                semaforo = None

        calle = params.get("calle", None)

        return {
            "accion": accion,
            "numCars": numCars,
            "trafico": trafico,
            "semaforo": semaforo,
            "calle": calle,
            "tipo_accidente": None, 
            "duracion_accidente": None,
            "ubicacion_accidente": None
        }

    except Exception as e:
        logging.error(f"Error al llamar al LLM: {e}")
        return respuesta_fallback