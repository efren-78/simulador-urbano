from openai import OpenAI
from dotenv import load_dotenv
import os
import json

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
                        "Eres un asistente que controla un simulador de tráfico urbano. "
                        "Debes interpretar instrucciones y devolver SIEMPRE un JSON estricto "
                        "con esta estructura: {\"accion\":\"start|stop|reload\",\"numCars\":int,\"trafico\":\"alto|moderado|fluido\"}. "
                        "No expliques nada, solo devuelve el JSON puro."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.1,
        )

        raw_content = response.choices[0].message.content.strip()
        print(f"Respuesta cruda LLM: {raw_content}")

        try:
            params = json.loads(raw_content)
        except json.JSONDecodeError:
            return {"error": "Respuesta LLM no es JSON válido.", "content": raw_content}

        return params

    except Exception as e:
        print(f"Error en generar_respuesta: {e}")
        return {"error": f"Error al invocar LLM: {e}"}