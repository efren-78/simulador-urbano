#------------------------------LLM deepseek localmente----------------------
"""import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

# Carga del modelo DeepSeek
model_name = "deepseek-ai/deepseek-llm-7b-chat"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto",
)

def generar_respuesta(prompt: str, max_tokens: int = 150) -> str:
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(**inputs, max_new_tokens=max_tokens)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)
"""

"""


#------------------------------LLM via Hugging Face usando API----------------------
import requests

#Aqui deben ir tokens pero git me restringio el commit pq no puedo subir con tokens xd
headers = {
    "Authorization": f"Bearer {API_TOKEN}"
}

def generar_respuesta(prompt: str, max_tokens: int = 150) -> str:
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": max_tokens
        }
    }

    response = requests.post(API_URL, headers=headers, json=payload)
    print("Status:", response.status_code)
    print("Raw response:", response.text)

    response.raise_for_status()

    resultado = response.json()
    return resultado[0].get("generated_text", "Sin respuesta generada.")

# === Test básico ===
if __name__ == "__main__":
    prompt = "¿Qué es una ciudad inteligente?"
    respuesta = generar_respuesta(prompt)
    print("\n=== Respuesta del modelo ===")
    print(respuesta)
"""

#------------------------------LLM TinyLLama----------------------

from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

# Carga del tokenizer y modelo
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

def generar_respuesta(prompt: str, max_tokens: int = 150) -> str:
    inputs = tokenizer(prompt, return_tensors="pt")
    outputs = model.generate(
        **inputs,
        max_new_tokens=max_tokens,
        do_sample=True,
        temperature=0.7
    )
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

"""# Prueba directa
if __name__ == "__main__":
    prompt = "¿Qué es una ciudad inteligente?"
    respuesta = generar_respuesta(prompt)
    print("\n=== Respuesta ===")
    print(respuesta)
"""