// Backend_camara/server.js - CON LOGS DE DEPURACIÓN
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/database.js';
import authRoutes from './routes/authRoutes.js';

// Configuración
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Logging middleware con más detalles
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}]`);
  console.log(`${req.method} ${req.path}`);
  
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyCopy = { ...req.body };
    if (bodyCopy.password) bodyCopy.password = '***';
    console.log('Body:', JSON.stringify(bodyCopy, null, 2));
  }
  
  next();
});

// Rutas
app.use('/api', authRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    database: 'Conectado'
  });
});

// Ruta de prueba para verificar la base de datos
app.get('/api/test-db', (req, res) => {
  const { db } = require('./config/database.js');
  
  db.all('SELECT id, username, email FROM usuarios', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ 
      message: 'Conexión exitosa', 
      usuarios: rows 
    });
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  console.log(`Ruta no encontrada: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Inicializar base de datos y servidor
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('\n' + '═'.repeat(50));
      console.log('║      SERVIDOR BACKEND INICIADO                      ║');
      console.log('═'.repeat(50));
      console.log(`║  Puerto: ${PORT}                                    ║`);
      console.log(`║  URL: http://localhost:${PORT}                      ║`);
      console.log(`║  Ambiente: ${process.env.NODE_ENV || 'development'} ║`);
      console.log('═'.repeat(50));
      console.log('\n Rutas disponibles:');
      console.log(`   POST http://localhost:${PORT}/api/register`);
      console.log(`   POST http://localhost:${PORT}/api/login`);
      console.log(`   GET  http://localhost:${PORT}/api/profile`);
      console.log(`   GET  http://localhost:${PORT}/health`);
      console.log(`   GET  http://localhost:${PORT}/api/test-db\n`);
      console.log('Esperando peticiones...\n');
    });
  })
  .catch((err) => {
    console.error('Error al inicializar la base de datos:', err);
    process.exit(1);
  });