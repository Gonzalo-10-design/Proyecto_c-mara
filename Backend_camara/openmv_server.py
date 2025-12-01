"""
Backend_camara/openmv_server.py - Version con SQLite - CORREGIDO
Guarda datos en base de datos y limpia automaticamente cada 7 dias
"""

import asyncio
import time
import websockets
import json
import serial
import serial.tools.list_ports
import sqlite3
from threading import Thread, Lock
from datetime import datetime, timedelta
from collections import deque

class DatabaseManager:
    """Maneja la persistencia de datos en SQLite"""
    
    def __init__(self, db_path='openmv_data.db'):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Crear tablas si no existen"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tabla de lecturas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                percentage INTEGER NOT NULL,
                label TEXT,
                fps REAL,
                detection_x INTEGER,
                detection_y INTEGER,
                detection_score REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla de alertas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                percentage INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Indices para mejorar consultas
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)')
        
        conn.commit()
        conn.close()
        print("Base de datos inicializada")
    
    def save_reading(self, data):
        """Guardar lectura en la base de datos"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            detection = data.get('detection')
            cursor.execute('''
                INSERT INTO readings (percentage, label, fps, detection_x, detection_y, detection_score, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('percentage', 0),
                data.get('label', 'Desconocido'),
                data.get('fps', 0.0),
                detection.get('x') if detection else None,
                detection.get('y') if detection else None,
                detection.get('score') if detection else None,
                data.get('timestamp', datetime.now().isoformat())
            ))
            
            conn.commit()
            conn.close()
            print(f"Lectura guardada: {data.get('percentage')}%")
        except Exception as e:
            print(f"Error guardando lectura: {e}")
    
    def save_alert(self, alert):
        """Guardar alerta en la base de datos"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO alerts (level, message, percentage, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (
                alert.get('level'),
                alert.get('message'),
                alert.get('percentage'),
                alert.get('timestamp', datetime.now().isoformat())
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error guardando alerta: {e}")
    
    def get_recent_readings(self, limit=100):
        """Obtener lecturas recientes"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT percentage, timestamp
                FROM readings
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (limit,))
            
            rows = cursor.fetchall()
            conn.close()
            
            # Invertir para orden cronologico
            result = [dict(row) for row in reversed(rows)]
            print(f"Recuperadas {len(result)} lecturas de la BD")
            return result
        except Exception as e:
            print(f"Error obteniendo lecturas: {e}")
            return []
    
    def cleanup_old_data(self, days=7):
        """Eliminar datos antiguos (mantener solo ultimos N dias)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            cursor.execute('DELETE FROM readings WHERE timestamp < ?', (cutoff_date,))
            deleted_readings = cursor.rowcount
            
            cursor.execute('DELETE FROM alerts WHERE timestamp < ?', (cutoff_date,))
            deleted_alerts = cursor.rowcount
            
            conn.commit()
            conn.close()
            
            if deleted_readings > 0 or deleted_alerts > 0:
                print(f"Limpieza: {deleted_readings} lecturas y {deleted_alerts} alertas eliminadas")
        except Exception as e:
            print(f"Error en limpieza: {e}")


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
        
        # Base de datos
        self.db = DatabaseManager()
        
        # Limpieza automatica cada 24 horas
        self.cleanup_interval = 86400
        self.last_cleanup = time.time()
        
    def find_openmv_port(self):
        """Buscar automaticamente el puerto de OpenMV"""
        ports = serial.tools.list_ports.comports()
        
        for port in ports:
            port_name = port.device.upper()
            description = str(port.description).upper()
            
            if 'OPENMV' in description or 'USB SERIAL' in description or 'CH340' in description:
                print(f"OpenMV detectado en: {port.device}")
                return port.device
        
        print("OpenMV no detectado. Puertos disponibles:")
        for port in ports:
            print(f"   - {port.device}: {port.description}")
        
        return None
   
    def connect_openmv(self, port=None):
        """Conectar con la camara OpenMV"""
        try:
            if port is None:
                port = self.find_openmv_port()
            
            if port is None:
                print("\n" + "="*60)
                print("ERROR: No se detecto OpenMV")
                print("="*60)
                return False
            
            if self.serial_connection and self.serial_connection.is_open:
                try:
                    self.serial_connection.close()
                    time.sleep(0.5)
                except:
                    pass
            
            self.serial_connection = serial.Serial(
                port, 
                self.baudrate, 
                timeout=3,
                write_timeout=3
            )
            
            time.sleep(2)
            self.serial_connection.reset_input_buffer()
            self.serial_connection.reset_output_buffer()
            
            time.sleep(1)
            print(f"Conectado en {port}\n")
            return True
            
        except Exception as e:
            print(f"Error al conectar: {e}\n")
            return False
    
    def disconnect_openmv(self):
        """Desconectar la camara OpenMV"""
        self.is_monitoring = False
        
        if self.serial_connection and self.serial_connection.is_open:
            self.serial_connection.close()
            print("OpenMV desconectado")
    
    def parse_openmv_data(self, line):
        """Parsear datos del script OpenMV"""
        data_updated = False
        
        with self.data_lock:
            if "**********" in line:
                label = line.replace("*", "").strip()
                self.latest_data['label'] = label
                
                if "nivel_" in label:
                    try:
                        percentage = int(label.split("_")[1])
                        self.latest_data['percentage'] = percentage
                        self.latest_data['timestamp'] = datetime.now().isoformat()
                        data_updated = True
                        
                        print(f"Nivel detectado: {percentage}%")
                        
                        # Agregar a historico en memoria
                        self.history.append({
                            'percentage': percentage,
                            'timestamp': datetime.now().isoformat()
                        })
                        
                        # Guardar en base de datos
                        self.db.save_reading(self.latest_data)
                        
                    except (IndexError, ValueError) as e:
                        print(f"Error parseando nivel: {e}")
            
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
                    except (IndexError, ValueError) as e:
                        print(f"Error parseando deteccion: {e}")
            
            elif line.startswith("FPS:"):
                try:
                    fps = float(line.split(":")[1].strip())
                    self.latest_data['fps'] = fps
                    data_updated = True
                except (IndexError, ValueError) as e:
                    print(f"Error parseando FPS: {e}")
        
        return data_updated
    
    def check_alerts(self):
        """Verificar condiciones de alerta"""
        alerts = []
        percentage = self.latest_data.get('percentage', 0)
        
        # Alerta al 25%
        if 24 <= percentage <= 26 and '25%' not in self.alerts_sent:
            alert = {
                'level': 'warning',
                'message': f'Nivel de llenado al 25% - {percentage}%',
                'percentage': percentage,
                'timestamp': datetime.now().isoformat()
            }
            alerts.append(alert)
            self.alerts_sent.add('25%')
            self.db.save_alert(alert)
        
        # Alerta al 100%
        if percentage >= 100 and '100%' not in self.alerts_sent:
            alert = {
                'level': 'critical',
                'message': f'TANQUE LLENO - Nivel al {percentage}%',
                'percentage': percentage,
                'timestamp': datetime.now().isoformat()
            }
            alerts.append(alert)
            self.alerts_sent.add('100%')
            self.db.save_alert(alert)
        
        # Alerta de sin deteccion
        if self.latest_data.get('detection') is None and self.is_monitoring:
            if 'no_detection' not in self.alerts_sent:
                alert = {
                    'level': 'info',
                    'message': 'Sin deteccion - Verifica la posicion de la camara',
                    'percentage': 0,
                    'timestamp': datetime.now().isoformat()
                }
                alerts.append(alert)
                self.alerts_sent.add('no_detection')
                self.db.save_alert(alert)
        else:
            self.alerts_sent.discard('no_detection')
        
        # Resetear alertas
        if percentage < 23:
            self.alerts_sent.discard('25%')
        if percentage < 95:
            self.alerts_sent.discard('100%')
        
        return alerts
    
    def read_openmv_data(self):
        """Leer datos continuamente de OpenMV"""
        print("Iniciando lectura de datos...")
        
        while self.is_running:
            # Limpieza automatica
            if time.time() - self.last_cleanup > self.cleanup_interval:
                self.db.cleanup_old_data(days=7)
                self.last_cleanup = time.time()
            
            if not self.is_monitoring:
                time.sleep(0.1)
                continue
            
            try:
                if self.serial_connection and self.serial_connection.in_waiting:
                    line = self.serial_connection.readline().decode('utf-8', errors='ignore').strip()
                    
                    if line:
                        print(f"OpenMV: {line}")
                        
                        data_updated = self.parse_openmv_data(line)
                        
                        if data_updated:
                            alerts = self.check_alerts()
                            
                            if self.loop:
                                asyncio.run_coroutine_threadsafe(
                                    self.broadcast_tank_data(),
                                    self.loop
                                )
                            
                            for alert in alerts:
                                if self.loop:
                                    asyncio.run_coroutine_threadsafe(
                                        self.broadcast_alert(alert),
                                        self.loop
                                    )
            
            except Exception as e:
                print(f"Error leyendo datos: {e}")
                time.sleep(0.5)
    
    async def broadcast_tank_data(self):
        """Enviar datos del tanque a todos los clientes"""
        if self.clients:
            with self.data_lock:
                message = json.dumps({
                    'type': 'tank_data',
                    'data': self.latest_data
                })
            
            print(f"Broadcasting: {self.latest_data.get('percentage')}%")
            
            disconnected = set()
            for client in self.clients:
                try:
                    await client.send(message)
                except Exception as e:
                    print(f"Error enviando a cliente: {e}")
                    disconnected.add(client)
            
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
                    disconnected.add(client)
            
            self.clients -= disconnected
    
    async def handle_client(self, websocket):
        """Manejar conexion de cliente WebSocket"""
        client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        print(f"Cliente conectado: {client_id}")
        
        self.clients.add(websocket)
        
        try:
            await websocket.send(json.dumps({
                'type': 'connection',
                'message': 'Conectado al servidor OpenMV',
                'is_monitoring': self.is_monitoring,
                'connected': self.serial_connection is not None and self.serial_connection.is_open
            }))
            
            # Enviar datos actuales
            if self.latest_data['timestamp']:
                await websocket.send(json.dumps({
                    'type': 'tank_data',
                    'data': self.latest_data
                }))
            
            # Enviar historico desde BD
            history = self.db.get_recent_readings(limit=100)
            if history:
                await websocket.send(json.dumps({
                    'type': 'history',
                    'data': history
                }))
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    command = data.get('command')
                    
                    if command == 'start':
                        success = await self.start_monitoring()
                        await websocket.send(json.dumps({
                            'type': 'response',
                            'command': 'start',
                            'success': success
                        }))
                    
                    elif command == 'stop':
                        await self.stop_monitoring()
                    
                    elif command == 'get_status':
                        await websocket.send(json.dumps({
                            'type': 'status',
                            'is_monitoring': self.is_monitoring,
                            'data': self.latest_data
                        }))
                    
                    elif command == 'get_history':
                        history = self.db.get_recent_readings(limit=100)
                        await websocket.send(json.dumps({
                            'type': 'history',
                            'data': history
                        }))
                
                except json.JSONDecodeError:
                    print(f"Mensaje no valido")
                except Exception as e:
                    print(f"Error: {e}")
        
        except websockets.exceptions.ConnectionClosed:
            print(f"Cliente desconectado: {client_id}")
        finally:
            self.clients.discard(websocket)
    
    async def start_monitoring(self):
        """Iniciar monitoreo"""
        if self.is_monitoring:
            return True
        
        if not self.serial_connection or not self.serial_connection.is_open:
            if not self.connect_openmv(None):
                return False
        
        self.is_monitoring = True
        self.alerts_sent.clear()
        
        if self.serial_thread is None or not self.serial_thread.is_alive():
            self.serial_thread = Thread(target=self.read_openmv_data, daemon=True)
            self.serial_thread.start()
        
        await self.broadcast_status("Monitoreo iniciado")
        return True
    
    async def stop_monitoring(self):
        """Detener monitoreo"""
        self.is_monitoring = False
        await self.broadcast_status("Monitoreo detenido")
    
    async def start_server(self, host='localhost', port=8765):
        """Iniciar servidor WebSocket"""
        self.loop = asyncio.get_running_loop()
        self.is_running = True
        
        print("\n" + "="*50)
        print("SERVIDOR OPENMV CON SQLite")
        print("="*50)
        print(f"Puerto: ws://{host}:{port}")
        print(f"Base de datos: openmv_data.db")
        print(f"Limpieza automatica: cada 24h (mantiene 7 dias)")
        print("="*50 + "\n")
        
        async with websockets.serve(self.handle_client, host, port):
            await asyncio.Future()
    
    def shutdown(self):
        """Apagar servidor"""
        print("\nApagando...")
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
        sys.exit(0)