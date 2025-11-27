// Backend_camara/controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';

// Registro de usuario
export const register = async (req, res) => {
  const { username, password, email } = req.body;

  // Validación
  if (!username || !password || !email) {
    return res.status(400).json({ 
      error: 'Todos los campos son obligatorios' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      error: 'La contraseña debe tener al menos 6 caracteres' 
    });
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
            return res.status(400).json({ 
              error: 'El usuario o email ya existe' 
            });
          }
          console.error('Error al registrar usuario:', err);
          return res.status(500).json({ 
            error: 'Error al registrar usuario' 
          });
        }
        
        console.log(`✓ Usuario registrado: ${username}`);
        res.status(201).json({ 
          message: 'Usuario registrado exitosamente',
          userId: this.lastID 
        });
      }
    );
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

// Login de usuario - CORREGIDO
export const login = (req, res) => {
  const { username, password } = req.body;

  console.log(`[LOGIN] Intento de login para usuario: ${username}`);

  if (!username || !password) {
    return res.status(400).json({ 
      error: 'Usuario y contraseña son obligatorios' 
    });
  }

  db.get(
    'SELECT * FROM usuarios WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        console.error('[LOGIN ERROR] Error en la base de datos:', err);
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      if (!user) {
        console.log(`[LOGIN] Usuario no encontrado: ${username}`);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      console.log(`[LOGIN] Usuario encontrado: ${username}`);
      console.log(`[LOGIN] Hash en BD: ${user.password.substring(0, 20)}...`);

      try {
        // Comparar la contraseña ingresada con el hash almacenado
        const validPassword = await bcrypt.compare(password, user.password);
        
        console.log(`[LOGIN] Validación de contraseña: ${validPassword ? 'ÉXITO' : 'FALLÓ'}`);
        
        if (!validPassword) {
          return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token JWT
        const token = jwt.sign(
          { id: user.id, username: user.username },
          process.env.SECRET_KEY,
          { expiresIn: '24h' }
        );

        console.log(`✓ Login exitoso para: ${username}`);

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
        console.error('[LOGIN ERROR] Error al verificar contraseña:', error);
        res.status(500).json({ error: 'Error en el servidor' });
      }
    }
  );
};

// Obtener perfil de usuario
export const getProfile = (req, res) => {
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
};