from control import Simulacion #importa la clase Simulacion

def mostrar_menu(): #define una funcion para mostrar el menu 

    print(" Menu :D ")
    print("1. Iniciar simulacion")
    print("2. Detener Simulacion")
    print("3. Reiniciar simulacion")
    print("4. Mostrar estado del trafico")
    print("5. Salir")

def main():
    sim = Simulacion() #crea una instancia de la clase

    while True:
        mostrar_menu()
        op = input("Opcion")
        # segun la opcion elegida, llama al metodo correspondiente
        if op == "1":
            sim.start()
        elif op == "2":
            sim.stop()
        elif op == "3":
            sim.reload()
        elif op == "4":
            sim.estado()
        elif op == "5":
            sim.stop()
            print("Cerrando el programa :D")
            break
        else:
            print("Opcion invalida")
            