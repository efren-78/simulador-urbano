from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import re

#cargar variables del .env
load_dotenv()

#inicializa OpenAI con la APIkey
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

#funcion principal para generar respuesta
def generar_respuesta(prompt: str, max_tokens: int = 150) -> dict:
    #configuracion del comportamiento y prompt
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
                        "ni texto adicional. El JSON debe tener SIEMPRE exactamente estas claves: "
                        "\"accion\" (uno de: \"start\", \"stop\", \"reload\"), "
                        "\"numCars\" (entero) y \"trafico\" (\"alto\", \"moderado\" o \"fluido\"). "
                        "Si el usuario no especifica \"numCars\" o \"trafico\", usa 10 y \"moderado\". "
                        "No devuelvas explicaciones, solo el JSON en una línea."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.1, #respuestas más precisas 
        )

        #obtiene la respuesta generada
        raw_content = response.choices[0].message.content.strip()
        print(f"Respuesta cruda: {raw_content}")

        #Limpia el contenido si viene dentro de bloques de código ('''json)
        if raw_content.startswith("```"):
            raw_content = re.sub(r"```[a-z]*", "", raw_content, flags=re.IGNORECASE)
            raw_content = raw_content.strip("`").strip()

        #convierte la cadena 
        params = json.loads(raw_content)

        # Validación mínima: debe contener clave 'accion'
        if "accion" not in params:
            return {
                "error": "El JSON devuelto no contiene la clave 'accion'.",
                "content": raw_content
            }

        return params

    #Manejo de errores si el json es inválido
    except json.JSONDecodeError:
        return {"error": "Respuesta no es JSON válido.", "content": raw_content}

    #manejo de errores generales 
    except Exception as e:
        return {"error": f"Error en OpenAI: {e}"}
