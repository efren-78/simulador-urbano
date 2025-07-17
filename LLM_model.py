from openai import OpenAI
from dotenv import load_dotenv
import os, json, re, logging

# Configurar logs
logging.basicConfig(level=logging.INFO, format="%(asctime)s [LLM] %(message)s")

# Cargar variables del .env
load_dotenv()

# Inicializa cliente OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generar_respuesta(prompt: str, max_tokens: int = 150) -> dict:
    """
    Genera respuesta NLP para la simulación de tráfico.
    Devuelve SIEMPRE un diccionario con:
    {"accion": str, "numCars": int, "trafico": str}
    """

    # Valores por defecto
    respuesta_fallback = {
        "accion": "none",
        "numCars": 10,
        "trafico": "moderado"
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
                        "y devolver SIEMPRE un JSON puro y válido, sin ningún bloque ```json "
                        "ni texto adicional. El JSON algunas veces tendra palabras claves: "
                        "\"accion\" (uno de: \"start\", \"stop\", \"reload\"), "
                        "\"numCars\" (entero) y \"trafico\" (\"alto\", \"moderado\" o \"fluido\"). "
                        "Si el usuario no especifica \"numCars\" o \"trafico\", usa 10 y \"moderado\". "
                        "No devuelvas explicaciones, solo el JSON en una línea."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.1,
            timeout=10  # Timeout en segundos
        )

        raw_content = response.choices[0].message.content.strip()
        logging.info(f"Respuesta cruda del LLM: {raw_content}")

        # Limpia bloques de código
        if raw_content.startswith("```"):
            raw_content = re.sub(r"```[a-z]*", "", raw_content, flags=re.IGNORECASE)
            raw_content = raw_content.strip("`").strip()

        # Intenta convertir a JSON
        try:
            params = json.loads(raw_content)
        except json.JSONDecodeError:
            logging.error(f"Error al decodificar JSON: {raw_content}")
            return respuesta_fallback

        # Validación básica
        if "accion" not in params:
            logging.warning("El JSON no contiene 'accion'. Usando fallback.")
            return respuesta_fallback

        # Normaliza valores
        accion = str(params.get("accion", "none")).lower()
        if accion not in ["start", "stop", "reload"]:
            accion = "none"

        try:
            numCars = int(params.get("numCars", 10))
        except ValueError:
            numCars = 10

        trafico = params.get("trafico", "moderado").lower()
        if trafico not in ["alto", "moderado", "bajo"]:
            trafico = "moderado"

        return {
            "accion": accion,
            "numCars": numCars,
            "trafico": trafico
        }

    except Exception as e:
        logging.error(f"Error al llamar al LLM: {e}")
        return respuesta_fallback
