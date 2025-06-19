from control import Simulacion #importa la clase Simulacion

"""def mostrar_menu(): #define una funcion para mostrar el menu 

    print(" Menu :D ")
    print("----------------------------------")
    print("1. Iniciar simulacion")
    print("2. Detener Simulacion")
    print("3. Reiniciar simulacion")
    print("4. Mostrar estado del trafico")
    print("5. Salir")
"""

sim = Simulacion() #crea una instancia de la clase


while True:
    sim.mostrar_menu()
    op = input("Ingrese su opcion: ")

    try:
        op = int(op)
    except ValueError:
        print("Debes ingresar un numero.")
        print("__________________________")
        continue

    match op:
        case 1:
            try:
                p = int(input("Ingrese el número de pasos que durará la simulación: "))
                d = float(input("Ingrese el delay para cada paso (en segundos): "))
            except ValueError:
                print("Debes ingresar números válidos.")
                continue
            
            sim.start(p, d)
        case 2:
            sim.stop()
        case 3:
            try:
                p = int(input("Ingrese el número de pasos que durará la simulación: "))
                d = float(input("Ingrese el delay para cada paso (en segundos): "))
            except ValueError:
                print("Debes ingresar números válidos.")
                continue

            sim.reload(p, d)
        case 4:
            sim.estado()
        case 5: 
            sim.stop()
            print("Saliendo...")
        case 6:
         sim.cerrar_calle()
        case _:
            print("Opcion no valida")
