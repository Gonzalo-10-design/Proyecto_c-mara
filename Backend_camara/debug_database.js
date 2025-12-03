// Backend_camara/debug_database.js
// Script para diagnosticar y reparar problemas con la base de datos

import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.db');

console.log('╔═══════════════════════════════════════════╗');
console.log('║  DIAGNÓSTICO DE BASE DE DATOS             ║');
console.log('╚═══════════════════════════════════════════╝\n');

console.log(` Ruta de la base de datos: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(' Error al conectar con la base de datos:', err);
    process.exit(1);
  } else {
    console.log('Conectado a la base de datos\n');
    runDiagnostics();
  }
});

async function runDiagnostics() {
  
  // 1. Verificar si la tabla existe
  console.log('Verificando estructura de la tabla...');
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'", (err, row) => {
    if (err) {
      console.error('Error al verificar tabla:', err);
      return;
    }
    
    if (!row) {
      console.log(' La tabla "usuarios" NO existe');
      console.log('   Creando tabla...');
      createTable();
      return;
    }
    
    console.log('La tabla "usuarios" existe\n');
    
    // 2. Mostrar esquema de la tabla
    console.log('Esquema de la tabla:');
    db.all("PRAGMA table_info(usuarios)", (err, rows) => {
      if (err) {
        console.error(' Error al obtener esquema:', err);
        return;
      }
      
      rows.forEach(col => {
        console.log(`   - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      console.log('');
      
      // 3. Contar usuarios
      checkUsers();
    });
  });
}

function createTable() {
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
      console.error('Error al crear tabla:', err);
      process.exit(1);
    }
    console.log('Tabla creada exitosamente\n');
    checkUsers();
  });
}

function checkUsers() {
  console.log(' Verificando usuarios existentes...');
  
  db.all('SELECT id, username, email, created_at FROM usuarios', (err, rows) => {
    if (err) {
      console.error(' Error al consultar usuarios:', err);
      return;
    }
    
    if (rows.length === 0) {
      console.log('  No hay usuarios registrados');
      console.log('\n ¿Deseas crear un usuario de prueba? (admin/admin123)\n');
      createTestUser();
      return;
    }
    
    console.log(`Total de usuarios: ${rows.length}\n`);
    
    rows.forEach((user, index) => {
      console.log(`Usuario ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Creado: ${user.created_at}\n`);
    });
    
    // 4. Verificar hashes de contraseñas
    verifyPasswordHashes(rows);
  });
}

function verifyPasswordHashes(users) {
  console.log('Verificando hashes de contraseñas...');
  
  users.forEach(user => {
    db.get('SELECT password FROM usuarios WHERE id = ?', [user.id], (err, row) => {
      if (err) {
        console.error(`Error al obtener contraseña de ${user.username}:`, err);
        return;
      }
      
      const passwordHash = row.password;
      const isBcryptHash = passwordHash.startsWith('$2b$') || passwordHash.startsWith('$2a$');
      
      console.log(`\n   Usuario: ${user.username}`);
      console.log(`   Hash: ${passwordHash.substring(0, 30)}...`);
      console.log(`   Formato válido: ${isBcryptHash ? '✓ SÍ (bcrypt)' : ' NO (no es bcrypt)'}`);
      
      if (!isBcryptHash) {
        console.log(`     Esta contraseña necesita ser re-hasheada`);
        console.log(`    Usa el usuario de prueba o registra uno nuevo\n`);
      }
    });
  });
  
  setTimeout(() => {
    console.log('\n5️ Diagnóstico completado\n');
    console.log(' Recomendaciones:');
    console.log('   1. Si no hay usuarios, crea uno desde el frontend (/register)');
    console.log('   2. Si hay usuarios pero no puedes iniciar sesión, verifica que las contraseñas estén hasheadas con bcrypt');
    console.log('   3. Usa el usuario de prueba creado: admin / admin123\n');
    
    db.close();
  }, 2000);
}

async function createTestUser() {
  const testUser = {
    username: 'admin',
    password: 'admin123',
    email: 'admin@isateck.com'
  };
  
  try {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    
    db.run(
      'INSERT INTO usuarios (username, password, email) VALUES (?, ?, ?)',
      [testUser.username, hashedPassword, testUser.email],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            console.log('  El usuario admin ya existe\n');
          } else {
            console.error(' Error al crear usuario:', err);
          }
          return;
        }
        
        console.log('Usuario de prueba creado:');
        console.log(`   Username: ${testUser.username}`);
        console.log(`   Password: ${testUser.password}`);
        console.log(`   Email: ${testUser.email}\n`);
        
        console.log('Puedes usar estas credenciales para iniciar sesión\n');
        checkUsers();
      }
    );
  } catch (error) {
    console.error('Error al hashear contraseña:', error);
  }
}

// Manejar cierre inesperado
process.on('SIGINT', () => {
  console.log('\n\n Cerrando diagnóstico...');
  db.close();
  process.exit(0);
});