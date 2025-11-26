// server.js - Backend con Express y SQLite
import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3001;
const SECRET_KEY = 'tu_clave_secreta_aqui'; // Cambiar en producción

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
  } else {
    console.log('Conectado a la base de datos SQLite');
    initDatabase();
  }
});

// Inicializar la base de datos
function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear la tabla:', err);
    } else {
      console.log('Tabla usuarios creada o ya existe');
    }
  });
}

// Ruta de registro
app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario en la base de datos
    db.run(
      'INSERT INTO usuarios (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'El usuario o email ya existe' });
          }
          return res.status(500).json({ error: 'Error al registrar usuario' });
        }
        
        res.status(201).json({ 
          message: 'Usuario registrado exitosamente',
          userId: this.lastID 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta de login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }

  db.get(
    'SELECT * FROM usuarios WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      try {
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
          return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token JWT
        const token = jwt.sign(
          { id: user.id, username: user.username },
          SECRET_KEY,
          { expiresIn: '24h' }
        );

        res.json({
          message: 'Login exitoso',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
      }
    }
  );
});

// Middleware para verificar token
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    req.userId = decoded.id;
    next();
  });
}

// Ruta protegida de ejemplo
app.get('/api/profile', verifyToken, (req, res) => {
  db.get(
    'SELECT id, username, email, created_at FROM usuarios WHERE id = ?',
    [req.userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.json(user);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});