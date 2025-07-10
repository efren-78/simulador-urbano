from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import re

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generar_respuesta(prompt: str, max_tokens: int = 150) -> dict:
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
            temperature=0.1,
        )

        raw_content = response.choices[0].message.content.strip()
        print(f"Respuesta cruda: {raw_content}")

        # Si viene con bloque ```json, lo limpiamos
        if raw_content.startswith("```"):
            raw_content = re.sub(r"```[a-z]*", "", raw_content, flags=re.IGNORECASE)
            raw_content = raw_content.strip("`").strip()

        params = json.loads(raw_content)

        # Validación mínima: debe contener clave 'accion'
        if "accion" not in params:
            return {
                "error": "El JSON devuelto no contiene la clave 'accion'.",
                "content": raw_content
            }

        return params

    except json.JSONDecodeError:
        return {"error": "Respuesta no es JSON válido.", "content": raw_content}
    except Exception as e:
        return {"error": f"Error en OpenAI: {e}"}
