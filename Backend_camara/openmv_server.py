"""
Backend_camara/openmv_server.py
"""

import asyncio
import time
import websockets
import json
import serial
import serial.tools.list_ports
from threading import Thread, Lock
from datetime import datetime
from collections import deque

class OpenMVServer:
    def __init__(self, baudrate=115200):
        self.baudrate = baudrate
        self.serial_connection = None
        self.is_running = False
        self.is_monitoring = False
        self.clients = set()
        self.latest_data = {
            'level': 0,
            'percentage': 0,
            'timestamp': None,
            'label': 'Desconocido',
            'fps': 0,
            'detection': None
        }
        self.data_lock = Lock()
        self.loop = None
        self.serial_thread = None
        self.history = deque(maxlen=100)
        self.alerts_sent = set()
        
    def find_openmv_port(self):
        """Buscar automáticamente el puerto de OpenMV"""
        ports = serial.tools.list_ports.comports()
        
        # Buscar puertos OpenMV comunes
        for port in ports:
            port_name = port.device.upper()
            description = str(port.description).upper()
            
            # Detectar OpenMV por descripción o nombre
            if 'OPENMV' in description or 'USB SERIAL' in description or 'CH340' in description:
                print(f"OpenMV detectado en: {port.device}")
                return port.device
        
        # Si no encuentra, mostrar puertos disponibles
        print("OpenMV no detectado automáticamente. Puertos disponibles:")
        for port in ports:
            print(f"   - {port.device}: {port.description}")
        
        return None
   
    def connect_openmv(self, port=None):
        """Conectar con la cámara OpenMV"""
        try:
            if port is None:
                port = self.find_openmv_port()
            
            if port is None:
                print("\n" + "="*60)
                print("ERROR: No se detecto OpenMV en ningun puerto")
                print("="*60)
                print("SOLUCION:")
                print("  1. Verifica que la OpenMV este conectada")
                print("  2. Ejecuta: python diagnostico_puerto.py")
                print("  3. Identifica el puerto correcto")
                print("="*60 + "\n")
                return False
            
            print(f"\nIntentando conectar a {port}...")
            
            # Cerrar conexión previa
            if self.serial_connection and self.serial_connection.is_open:
                try:
                    self.serial_connection.close()
                    time.sleep(0.5)
                except:
                    pass
            
            # Abrir puerto con timeout mayor
            self.serial_connection = serial.Serial(
                port, 
                self.baudrate, 
                timeout=3,
                write_timeout=3
            )
            
            # Esperar estabilización
            time.sleep(2)
            
            # Limpiar buffers
            self.serial_connection.reset_input_buffer()
            self.serial_connection.reset_output_buffer()
            
            # Verificar datos
            time.sleep(1)
            if self.serial_connection.in_waiting > 0:
                print(f"Conectado - Recibiendo datos ({self.serial_connection.in_waiting} bytes)")
            else:
                print(f"Conectado - Esperando datos del script OpenMV")
            
            print(f"Conexion exitosa en {port}\n")
            return True
            
        except serial.SerialException as e:
            error_str = str(e)
            print(f"\nERROR al conectar a {port}")
            
            if "PermissionError" in error_str or "denegado" in error_str.lower():
                print("="*60)
                print("PUERTO OCUPADO")
                print("="*60)
                print("CAUSA: VS Code o la extension OpenMV tiene el puerto abierto")
                print("\nSOLUCION:")
                print("  1. En VS Code, ve a la extension OpenMV")
                print("  2. Haz clic en 'Disconnect' o 'Desconectar'")
                print("  3. O cierra VS Code completamente")
                print("  4. Vuelve a ejecutar este script")
                print("="*60)
            
            elif "timeout" in error_str.lower() or "semaforo" in error_str.lower():
                print("="*60)
                print("TIMEOUT - DISPOSITIVO NO RESPONDE")
                print("="*60)
                print("CAUSA: Puerto existe pero no responde")
                print("\nSOLUCION:")
                print("  1. Desconecta y reconecta el cable USB")
                print("  2. Prueba otro puerto USB")
                print("  3. Verifica que el cable sea de datos (no solo carga)")
                print("  4. Ejecuta el script en VS Code primero")
                print("="*60)
            else:
                print(f"Detalles: {error_str}")
            
            print()
            return False
            
        except Exception as e:
            print(f"ERROR inesperado: {e}\n")
            return False
    
    def disconnect_openmv(self):
        """Desconectar la cámara OpenMV"""
        self.is_monitoring = False
        
        if self.serial_connection and self.serial_connection.is_open:
            self.serial_connection.close()
            print("OpenMV desconectado")
    
    def parse_openmv_data(self, line):
        """Parsear datos del script OpenMV"""
        data_updated = False
        
        with self.data_lock:
            # Detectar etiqueta de nivel
            if "**********" in line:
                label = line.replace("*", "").strip()
                self.latest_data['label'] = label
                
                # Extraer porcentaje del label
                if "nivel_" in label:
                    try:
                        percentage = int(label.split("_")[1])
                        self.latest_data['percentage'] = percentage
                        self.latest_data['timestamp'] = datetime.now().isoformat()
                        data_updated = True
                        
                        # Agregar a historial
                        self.history.append({
                            'percentage': percentage,
                            'timestamp': datetime.now().isoformat()
                        })
                        
                    except (IndexError, ValueError):
                        pass
            
            # Detectar coordenadas y score
            elif line.startswith("x "):
                parts = line.split("\t")
                if len(parts) >= 3:
                    try:
                        x = int(parts[0].split()[1])
                        y = int(parts[1].split()[1])
                        score = float(parts[2].split()[1])
                        
                        self.latest_data['detection'] = {
                            'x': x,
                            'y': y,
                            'score': score
                        }
                        data_updated = True
                    except (IndexError, ValueError):
                        pass
            
            # Detectar FPS
            elif line.startswith("FPS:"):
                try:
                    fps = float(line.split(":")[1].strip())
                    self.latest_data['fps'] = fps
                    data_updated = True
                except (IndexError, ValueError):
                    pass
        
        return data_updated
    
    def check_alerts(self):
        """Verificar condiciones de alerta"""
        alerts = []
        percentage = self.latest_data.get('percentage', 0)
        
        # Alerta al 25%
        if 24 <= percentage <= 26 and '25%' not in self.alerts_sent:
            alerts.append({
                'level': 'warning',
                'message': f'Nivel de llenado al 25% - {percentage}%',
                'percentage': percentage,
                'timestamp': datetime.now().isoformat()
            })
            self.alerts_sent.add('25%')
        
        # Alerta al 100%
        if percentage >= 100 and '100%' not in self.alerts_sent:
            alerts.append({
                'level': 'critical',
                'message': f'TANQUE LLENO - Nivel al {percentage}%',
                'percentage': percentage,
                'timestamp': datetime.now().isoformat()
            })
            self.alerts_sent.add('100%')
        
        # Alerta de sin detección
        if self.latest_data.get('detection') is None and self.is_monitoring:
            if 'no_detection' not in self.alerts_sent:
                alerts.append({
                    'level': 'info',
                    'message': 'Sin detección - Verifica la posición de la cámara',
                    'percentage': 0,
                    'timestamp': datetime.now().isoformat()
                })
                self.alerts_sent.add('no_detection')
        else:
            # Limpiar alerta de sin detección si hay detección
            self.alerts_sent.discard('no_detection')
        
        # Resetear alertas cuando baje del umbral
        if percentage < 25:
            self.alerts_sent.discard('25%')
        if percentage < 100:
            self.alerts_sent.discard('100%')
        
        return alerts
    
    def read_openmv_data(self):
        """Leer datos continuamente de OpenMV"""
        print("Iniciando lectura de datos OpenMV...")
        
        while self.is_running:
            if not self.is_monitoring:
                time.sleep(0.1)
                continue
            
            try:
                if self.serial_connection and self.serial_connection.in_waiting:
                    line = self.serial_connection.readline().decode('utf-8', errors='ignore').strip()
                    
                    if line:
                        print(f"OpenMV: {line}")
                        
                        # Parsear datos
                        data_updated = self.parse_openmv_data(line)
                        
                        if data_updated:
                            # Verificar alertas
                            alerts = self.check_alerts()
                            
                            # Enviar datos actualizados
                            if self.loop:
                                asyncio.run_coroutine_threadsafe(
                                    self.broadcast_tank_data(),
                                    self.loop
                                )
                            
                            # Enviar alertas si existen
                            for alert in alerts:
                                if self.loop:
                                    asyncio.run_coroutine_threadsafe(
                                        self.broadcast_alert(alert),
                                        self.loop
                                    )
            
            except Exception as e:
                print(f"Error leyendo datos OpenMV: {e}")
                time.sleep(0.5)
    
    async def broadcast_tank_data(self):
        """Enviar datos del tanque a todos los clientes"""
        if self.clients:
            with self.data_lock:
                message = json.dumps({
                    'type': 'tank_data',
                    'data': self.latest_data
                })
            
            disconnected = set()
            for client in self.clients:
                try:
                    await client.send(message)
                except Exception as e:
                    print(f"Error enviando a cliente: {e}")
                    disconnected.add(client)
            
            # Remover clientes desconectados
            self.clients -= disconnected
    
    async def broadcast_alert(self, alert):
        """Enviar alerta a todos los clientes"""
        if self.clients:
            message = json.dumps({
                'type': 'alert',
                'data': alert
            })
            
            disconnected = set()
            for client in self.clients:
                try:
                    await client.send(message)
                except Exception as e:
                    print(f"Error enviando alerta: {e}")
                    disconnected.add(client)
            
            self.clients -= disconnected
    
    async def broadcast_status(self, status_message):
        """Enviar mensaje de estado"""
        if self.clients:
            message = json.dumps({
                'type': 'status',
                'message': status_message,
                'is_monitoring': self.is_monitoring,
                'connected': self.serial_connection is not None
            })
            
            disconnected = set()
            for client in self.clients:
                try:
                    await client.send(message)
                except Exception as e:
                    print(f"Error enviando estado: {e}")
                    disconnected.add(client)
            
            self.clients -= disconnected
    
    async def handle_client(self, websocket):
        """Manejar conexión de cliente WebSocket"""
        client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        print(f"Cliente conectado: {client_id} (Total: {len(self.clients) + 1})")
        
        self.clients.add(websocket)
        
        try:
            # Enviar estado actual al nuevo cliente
            await websocket.send(json.dumps({
                'type': 'connection',
                'message': 'Conectado al servidor OpenMV',
                'is_monitoring': self.is_monitoring,
                'connected': self.serial_connection is not None and self.serial_connection.is_open
            }))
            
            # Enviar datos actuales si existen
            if self.latest_data['timestamp']:
                await websocket.send(json.dumps({
                    'type': 'tank_data',
                    'data': self.latest_data
                }))
            
            # Escuchar mensajes del cliente
            async for message in websocket:
                try:
                    data = json.loads(message)
                    command = data.get('command')
                    
                    print(f"Comando recibido de {client_id}: {command}")
                    
                    if command == 'start':
                        success = await self.start_monitoring()
                        await websocket.send(json.dumps({
                            'type': 'response',
                            'command': 'start',
                            'success': success,
                            'message': 'Monitoreo iniciado' if success else 'Error al iniciar monitoreo'
                        }))
                    
                    elif command == 'stop':
                        await self.stop_monitoring()
                        await websocket.send(json.dumps({
                            'type': 'response',
                            'command': 'stop',
                            'success': True,
                            'message': 'Monitoreo detenido'
                        }))
                    
                    elif command == 'get_status':
                        await websocket.send(json.dumps({
                            'type': 'status',
                            'is_monitoring': self.is_monitoring,
                            'connected': self.serial_connection is not None and self.serial_connection.is_open,
                            'data': self.latest_data
                        }))
                    
                    elif command == 'get_history':
                        await websocket.send(json.dumps({
                            'type': 'history',
                            'data': list(self.history)
                        }))
                
                except json.JSONDecodeError:
                    print(f"Error: mensaje no valido de {client_id}")
                except Exception as e:
                    print(f"Error procesando comando de {client_id}: {e}")
        
        except websockets.exceptions.ConnectionClosed:
            print(f"Cliente desconectado: {client_id}")
        except Exception as e:
            print(f"Error en cliente {client_id}: {e}")
        finally:
            self.clients.discard(websocket)
            print(f"Total clientes: {len(self.clients)}")
    
    async def start_monitoring(self):
        """Iniciar monitoreo de OpenMV"""
        if self.is_monitoring:
            print("Ya se esta monitoreando")
            return True
        
        # Conectar si no está conectado
        if not self.serial_connection or not self.serial_connection.is_open:
            if not self.connect_openmv(None):  # None para autodeteccion
                await self.broadcast_status("Error: No se pudo conectar con OpenMV")
                return False
        
        self.is_monitoring = True
        self.alerts_sent.clear()
        
        # Iniciar thread de lectura si no existe
        if self.serial_thread is None or not self.serial_thread.is_alive():
            self.serial_thread = Thread(target=self.read_openmv_data, daemon=True)
            self.serial_thread.start()
        
        await self.broadcast_status("Monitoreo iniciado")
        print("Monitoreo iniciado")
        return True
    
    async def stop_monitoring(self):
        """Detener monitoreo de OpenMV"""
        self.is_monitoring = False
        await self.broadcast_status("Monitoreo detenido")
        print("Monitoreo detenido")
    
    async def start_server(self, host='localhost', port=8765):
        """Iniciar servidor WebSocket"""
        self.loop = asyncio.get_running_loop()
        self.is_running = True
        
        print("\n" + "="*50)
        print("SERVIDOR OPENMV WEBSOCKET")
        print("="*50)
        print(f"Servidor iniciado en ws://{host}:{port}")
        print(f"Puerto COM configurado: Autodeteccion")
        print(f"Esperando conexiones...")
        print("="*50 + "\n")
        
        async with websockets.serve(self.handle_client, host, port):
            await asyncio.Future()
    
    def shutdown(self):
        """Apagar servidor limpiamente"""
        print("\nApagando servidor...")
        self.is_running = False
        self.is_monitoring = False
        self.disconnect_openmv()
        print("Servidor apagado\n")


if __name__ == "__main__":
    import sys
    
    server = OpenMVServer()
    
    try:
        asyncio.run(server.start_server(host='0.0.0.0', port=8765))
    except KeyboardInterrupt:
        server.shutdown()
        print("Servidor detenido por usuario")
        sys.exit(0)