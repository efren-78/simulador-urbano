from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import threading, webbrowser, uvicorn, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI()

# Montar la carpeta static (JS, CSS, imágenes, etc.)
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="root")

# Ruta principal: index.html
@app.get("/")
def read_index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

# Otra página: index2.html
@app.get("/index2")
def read_index2():
    return FileResponse(os.path.join(BASE_DIR, "index2.html"))



# Abrir navegador automáticamente
def abrir_navegador():
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    threading.Timer(1, abrir_navegador).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)
