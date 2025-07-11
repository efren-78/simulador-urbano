from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI()
connected_websockets = []

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Solo para pruebas, restringe en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)
    print("Cliente WebSocket conectado")

    try:
        while True:
            text = await websocket.receive_text()
            print(f"Recibido: {text}")
            if text.lower() == "start":
                await notificar_todos({"accion": "start"})
            elif text.lower() == "stop":
                await notificar_todos({"accion": "stop"})
            elif text.lower() == "reload":
                await notificar_todos({"accion": "reload"})
            else:
                await websocket.send_text("Comando no reconocido.")
    except WebSocketDisconnect:
        connected_websockets.remove(websocket)
        print("Cliente desconectado")

# Enviar a todos los clientes conectados
async def notificar_todos(data: dict):
    import json
    for ws in connected_websockets:
        try:
            await ws.send_text(json.dumps(data))
        except:
            connected_websockets.remove(ws)

# Sirve archivos estáticos HTML + JS debe ir en /static)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True)
