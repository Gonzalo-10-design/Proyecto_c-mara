import serial.tools.list_ports
import serial
import time

print("\n" + "="*60)
print("DIAGNOSTICO DE PUERTOS SERIALES - OpenMV Cam RT1062")
print("="*60 + "\n")

ports = serial.tools.list_ports.comports()

if not ports:
    print("ERROR: No se encontraron puertos seriales")
    print("\nVerifica:")
    print("  - Cable USB conectado")
    print("  - Drivers instalados")
    print("  - Prueba otro puerto USB")
else:
    print(f"Se encontraron {len(ports)} puerto(s):\n")
    
    for i, port in enumerate(ports, 1):
        print(f"Puerto #{i}: {port.device}")
        print(f"  Descripcion: {port.description}")
        print(f"  HWID: {port.hwid}")
        
        # Detectar OpenMV
        desc = port.description.lower()
        hwid = port.hwid.lower()
        
        is_openmv = any(kw in desc or kw in hwid 
                       for kw in ['openmv', 'stm32', 'usb serial', 'ch340'])
        
        if is_openmv:
            print(f"  >>> POSIBLE OPENMV DETECTADA <<<")
            
            # Intentar conectar
            print(f"  Probando conexion a {port.device}...")
            try:
                ser = serial.Serial(port.device, 115200, timeout=1)
                time.sleep(1)
                
                if ser.in_waiting > 0:
                    data = ser.read(min(ser.in_waiting, 100))
                    print(f"  ESTADO: Puerto responde - {len(data)} bytes recibidos")
                    print(f"  DATOS: {data[:50]}")
                else:
                    print(f"  ESTADO: Puerto abierto pero sin datos")
                    print(f"  NOTA: Ejecuta el script en la OpenMV primero")
                
                ser.close()
                print(f"  RESULTADO: Conexion exitosa")
                
            except serial.SerialException as e:
                print(f"  ERROR: {e}")
                if "PermissionError" in str(e) or "denegado" in str(e).lower():
                    print(f"  CAUSA: Puerto ocupado por VS Code u otro programa")
                    print(f"  SOLUCION: Desconecta la extension OpenMV en VS Code")
        
        print()

print("="*60)
print("INSTRUCCIONES:")
print("="*60)
print("1. Identifica el puerto donde esta la OpenMV")
print("2. Ejecuta el script ei_object_detection.py en VS Code")
print("3. DESCONECTA la extension OpenMV (boton Disconnect)")
print("4. Ejecuta: python openmv_server.py")
print("="*60 + "\n")