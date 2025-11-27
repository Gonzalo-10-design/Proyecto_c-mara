"""
Backend_camara/openmv_server.py
Servidor WebSocket mejorado para OpenMV Cam RT1062
Incluye control remoto y gestión de alertas
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
        self.history = deque(maxlen=100)  # Últimas 100 lecturas
        self.alerts_sent = set()  # Para evitar alertas duplicadas
        
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
                print("✗ No se pudo detectar OpenMV. Verifica la conexión USB.")
                return False
            
            self.serial_connection = serial.Serial(
                port, 
                self.baudrate, 
                timeout=1
            )
            
            # Esperar inicialización
            time.sleep(2)
            
            # Limpiar buffer
            self.serial_connection.reset_input_buffer()
            
            print(f"Conectado a OpenMV en {port}")
            return True
            
        except serial.SerialException as e:
            print(f"Error al conectar OpenMV: {e}")
            return False
        except Exception as e:
            print(f"Error inesperado: {e}")
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
        if percentage < 23:
            self.alerts_sent.discard('25%')
        if percentage < 95:
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
            
            await asyncio.gather(
                *[client.send(message) for client in self.clients],
                return_exceptions=True
            )
    
    async def broadcast_alert(self, alert):
        """Enviar alerta a todos los clientes"""
        if self.clients:
            message = json.dumps({
                'type': 'alert',
                'data': alert
            })
            
            await asyncio.gather(
                *[client.send(message) for client in self.clients],
                return_exceptions=True
            )
    
    async def broadcast_status(self, status_message):
        """Enviar mensaje de estado"""
        if self.clients:
            message = json.dumps({
                'type': 'status',
                'message': status_message,
                'is_monitoring': self.is_monitoring,
                'connected': self.serial_connection is not None
            })
            
            await asyncio.gather(
                *[client.send(message) for client in self.clients],
                return_exceptions=True
            )
    
    async def handle_client(self, websocket, path):
        """Manejar conexión de cliente WebSocket"""
        self.clients.add(websocket)
        client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        print(f"Cliente conectado: {client_id}. Total: {len(self.clients)}")
        
        # Enviar estado actual al nuevo cliente
        await websocket.send(json.dumps({
            'type': 'connection',
            'message': 'Conectado al servidor OpenMV',
            'is_monitoring': self.is_monitoring,
            'connected': self.serial_connection is not None
        }))
        
        # Enviar datos actuales si existen
        if self.latest_data['timestamp']:
            await websocket.send(json.dumps({
                'type': 'tank_data',
                'data': self.latest_data
            }))
        
        try:
            async for message in websocket:
                data = json.loads(message)
                command = data.get('command')
                
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
                        'connected': self.serial_connection is not None,
                        'data': self.latest_data
                    }))
                
                elif command == 'get_history':
                    await websocket.send(json.dumps({
                        'type': 'history',
                        'data': list(self.history)
                    }))
        
        except websockets.exceptions.ConnectionClosed:
            print(f"Cliente desconectado: {client_id}")
        except Exception as e:
            print(f"Error en cliente {client_id}: {e}")
        finally:
            self.clients.remove(websocket)
    
    async def start_monitoring(self):
        """Iniciar monitoreo de OpenMV"""
        if self.is_monitoring:
            print("Ya se está monitoreando")
            return True
        
        # Conectar si no está conectado
        if not self.serial_connection or not self.serial_connection.is_open:
            if not self.connect_openmv():
                await self.broadcast_status("Error: No se pudo conectar con OpenMV")
                return False
        
        self.is_monitoring = True
        self.alerts_sent.clear()  # Limpiar alertas previas
        
        # Iniciar thread de lectura si no existe
        if self.serial_thread is None or not self.serial_thread.is_alive():
            self.serial_thread = Thread(target=self.read_openmv_data, daemon=True)
            self.serial_thread.start()
        
        await self.broadcast_status("✓ Monitoreo iniciado")
        print("✓ Monitoreo iniciado")
        return True
    
    async def stop_monitoring(self):
        """Detener monitoreo de OpenMV"""
        self.is_monitoring = False
        await self.broadcast_status("✓ Monitoreo detenido")
        print("✓ Monitoreo detenido")
    
    async def start_server(self, host='localhost', port=8765):
        """Iniciar servidor WebSocket"""
        self.loop = asyncio.get_running_loop()
        self.is_running = True
        
        print("\n" + "="*50)
        print("SERVIDOR OPENMV WEBSOCKET")
        print("="*50)
        print(f"Servidor iniciado en ws://{host}:{port}")
        print(f"Esperando conexiones...")
        print("="*50 + "\n")
        
        async with websockets.serve(self.handle_client, host, port):
            await asyncio.Future()  # Ejecutar indefinidamente
    
    def shutdown(self):
        """Apagar servidor limpiamente"""
        print("\nApagando servidor...")
        self.is_running = False
        self.is_monitoring = False
        self.disconnect_openmv()
        print("✓ Servidor apagado\n")


if __name__ == "__main__":
    import sys
    
    # Configurar puerto serial (puedes cambiarlo según tu sistema)
    # Windows: 'COM3', 'COM4', etc.
    # Linux/Mac: '/dev/ttyACM0', '/dev/ttyUSB0', etc.
    # Si se deja None, intentará detectar automáticamente
    
    SERIAL_PORT = 'COM6'  # None para autodetección, o especifica 'COM3', '/dev/ttyACM0', etc.
    
    server = OpenMVServer()
    
    try:
        asyncio.run(server.start_server(host='0.0.0.0', port=8765))
    except KeyboardInterrupt:
        server.shutdown()
        print("Servidor detenido por usuario")
        sys.exit(0)