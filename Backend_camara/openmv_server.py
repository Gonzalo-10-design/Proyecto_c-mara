"""
Backend_camara/openmv_server.py
Servidor WebSocket para comunicación con OpenMV Cam RT1062
Maneja streaming de video y datos del nivel de tanque en tiempo real
"""

import asyncio
import time
import websockets
import json
import serial

from threading import Thread
import base64
from datetime import datetime

class OpenMVServer:
    def __init__(self, port='/dev/ttyACM0', baudrate=115200):
        self.port = port
        self.baudrate = baudrate
        self.serial_connection = None
        self.is_running = False
        self.clients = set()
        self.latest_frame = None
        self.tank_level_data = {
            'level': 0,
            'percentage': 0,
            'timestamp': None,
            'label': 'unknown'
        }
        # asyncio loop reference for thread-safe coroutines
        self.loop = None
        
    def connect_openmv(self):
        """Conectar con la cámara OpenMV"""
        try:
            self.serial_connection = serial.Serial(
                self.port, 
                self.baudrate, 
                timeout=1
            )
            print(f"✓ Conectado a OpenMV en {self.port}")
            return True
        except Exception as e:
            print(f"✗ Error al conectar OpenMV: {e}")
            return False
    
    def disconnect_openmv(self):
        """Desconectar la cámara OpenMV"""
        if self.serial_connection and self.serial_connection.is_open:
            self.serial_connection.close()
            print("✓ OpenMV desconectado")
    
    def read_openmv_data(self):
        """Leer datos continuamente de OpenMV"""
        buffer = ""
        
        while self.is_running:
            try:
                if self.serial_connection and self.serial_connection.in_waiting:
                    data = self.serial_connection.readline().decode('utf-8', errors='ignore').strip()
                    
                    if data:
                        # Detectar líneas con información de nivel
                        if "**********" in data:
                            # Extraer el label (ej: "nivel_25", "nivel_50")
                            label = data.replace("*", "").strip()
                            self.tank_level_data['label'] = label
                            
                            # Extraer porcentaje del label
                            if "nivel_" in label:
                                try:
                                    percentage = int(label.split("_")[1])
                                    self.tank_level_data['percentage'] = percentage
                                    self.tank_level_data['timestamp'] = datetime.now().isoformat()
                                except:
                                    pass
                        
                        # Detectar coordenadas y score
                        elif data.startswith("x "):
                            parts = data.split("\t")
                            if len(parts) >= 3:
                                try:
                                    x = int(parts[0].split()[1])
                                    y = int(parts[1].split()[1])
                                    score = float(parts[2].split()[1])
                                    
                                    self.tank_level_data['detection'] = {
                                        'x': x,
                                        'y': y,
                                        'score': score
                                    }
                                except:
                                    pass
                        
                        # FPS info
                        elif "fps" in data:
                            try:
                                fps = float(data.split()[0])
                                self.tank_level_data['fps'] = fps
                            except:
                                pass
                        
                        # Enviar datos a todos los clientes conectados.
                        # If a main asyncio loop is set, schedule the coroutine thread-safely; otherwise fallback to asyncio.run
                        if self.loop:
                            asyncio.run_coroutine_threadsafe(self.broadcast_tank_data(), self.loop)
                        else:
                            asyncio.run(self.broadcast_tank_data())
                        
            except Exception as e:
                print(f"Error leyendo datos OpenMV: {e}")
                # read_openmv_data runs in a separate thread (sync), so use time.sleep instead of await
                time.sleep(0.1)
    
    async def broadcast_tank_data(self):
        """Enviar datos del tanque a todos los clientes"""
        if self.clients:
            message = json.dumps({
                'type': 'tank_data',
                'data': self.tank_level_data
            })
            
            # Enviar a todos los clientes conectados
            await asyncio.gather(
                *[client.send(message) for client in self.clients],
                return_exceptions=True
            )
    
    async def handle_client(self, websocket, path):
        """Manejar conexión de cliente WebSocket"""
        self.clients.add(websocket)
        print(f"✓ Cliente conectado. Total: {len(self.clients)}")
        
        try:
            async for message in websocket:
                data = json.loads(message)
                command = data.get('command')
                
                if command == 'start':
                    await self.start_monitoring()
                    await websocket.send(json.dumps({
                        'type': 'status',
                        'message': 'Monitoreo iniciado'
                    }))
                    
                elif command == 'stop':
                    await self.stop_monitoring()
                    await websocket.send(json.dumps({
                        'type': 'status',
                        'message': 'Monitoreo detenido'
                    }))
                    
                elif command == 'get_status':
                    await websocket.send(json.dumps({
                        'type': 'status',
                        'is_running': self.is_running,
                        'connected': self.serial_connection is not None
                    }))
                    
        except websockets.exceptions.ConnectionClosed:
            print("✗ Cliente desconectado")
        finally:
            self.clients.remove(websocket)
    
    async def start_monitoring(self):
        """Iniciar monitoreo de OpenMV"""
        if not self.is_running:
            if self.connect_openmv():
                self.is_running = True
                
                # Iniciar thread para lectura de datos
                thread = Thread(target=self.read_openmv_data, daemon=True)
                thread.start()
                
                print("✓ Monitoreo iniciado")
                return True
        return False
    
    async def stop_monitoring(self):
        """Detener monitoreo de OpenMV"""
        self.is_running = False
        self.disconnect_openmv()
        print("✓ Monitoreo detenido")
    
    async def start_server(self, host='localhost', port=8765):
        """Iniciar servidor WebSocket"""
        # store running loop so thread can schedule coroutines safely
        self.loop = asyncio.get_running_loop()
        print(f"🚀 Servidor OpenMV iniciado en ws://{host}:{port}")
        async with websockets.serve(self.handle_client, host, port):
            await asyncio.Future()  # Ejecutar indefinidamente


if __name__ == "__main__":
    # Configurar puerto serial de OpenMV
    # Windows: 'COM3', 'COM4', etc.
    # Linux/Mac: '/dev/ttyACM0', '/dev/ttyUSB0', etc.
    
    server = OpenMVServer(port='COM3')
    
    try:
        asyncio.run(server.start_server(host='localhost', port=8765))
    except KeyboardInterrupt:
        print("\n✓ Servidor detenido") 