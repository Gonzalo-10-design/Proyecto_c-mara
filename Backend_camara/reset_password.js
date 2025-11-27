// Backend_camara/reset_password.js
// Script para resetear la contraseña de un usuario específico

import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'database.db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const db = new sqlite3.Database(dbPath);

console.log('╔═══════════════════════════════════════════╗');
console.log('║  RESETEAR CONTRASEÑA DE USUARIO           ║');
console.log('╚═══════════════════════════════════════════╝\n');

// Función para hacer preguntas
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function listUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, username, email FROM usuarios', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function updatePassword(username, newPassword) {
  return new Promise(async (resolve, reject) => {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      db.run(
        'UPDATE usuarios SET password = ? WHERE username = ?',
        [hashedPassword, username],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

async function main() {
  try {
    // Listar usuarios
    console.log(' Usuarios existentes:\n');
    const users = await listUsers();
    
    if (users.length === 0) {
      console.log(' No hay usuarios en la base de datos');
      rl.close();
      db.close();
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.email})`);
    });
    
    console.log('');
    
    // Preguntar por el usuario
    const username = await askQuestion('Ingresa el username del usuario: ');
    
    // Verificar si existe
    const userExists = users.find(u => u.username === username);
    if (!userExists) {
      console.log(`\n Usuario "${username}" no encontrado`);
      rl.close();
      db.close();
      return;
    }
    
    // Preguntar por la nueva contraseña
    const newPassword = await askQuestion('Ingresa la nueva contraseña (mínimo 6 caracteres): ');
    
    if (newPassword.length < 6) {
      console.log('\n La contraseña debe tener al menos 6 caracteres');
      rl.close();
      db.close();
      return;
    }
    
    // Confirmar
    const confirm = await askQuestion(`\n¿Estás seguro de cambiar la contraseña de "${username}"? (si/no): `);
    
    if (confirm.toLowerCase() !== 'si' && confirm.toLowerCase() !== 's') {
      console.log('\n Operación cancelada');
      rl.close();
      db.close();
      return;
    }
    
    // Actualizar contraseña
    console.log('\n Actualizando contraseña...');
    const changes = await updatePassword(username, newPassword);
    
    if (changes > 0) {
      console.log('✓ Contraseña actualizada exitosamente');
      console.log(`\n Nuevas credenciales:`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${newPassword}`);
      console.log('\n💡 Ya puedes iniciar sesión con estas credenciales\n');
    } else {
      console.log('No se pudo actualizar la contraseña');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
    db.close();
  }
}

main();