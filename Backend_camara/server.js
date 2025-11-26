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
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use('/api', authRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Inicializar base de datos y servidor
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('╔═══════════════════════════════════════════╗');
      console.log('║      SERVIDOR BACKEND INICIADO            ║');
      console.log('╠═══════════════════════════════════════════╣');
      console.log(`║  Puerto: ${PORT}                             ║`);
      console.log(`║  URL: http://localhost:${PORT}              ║`);
      console.log(`║  Ambiente: ${process.env.NODE_ENV}            ║`);
      console.log('╚═══════════════════════════════════════════╝');
    });
  })
  .catch((err) => {
    console.error('❌ Error al inicializar la base de datos:', err);
    process.exit(1);
  });