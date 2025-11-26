import express from 'express';
import { register, login, getProfile } from '../controllers/authController.js';
import { verifyToken } from '../comunicacion/authMiddleware.js';

const router = express.Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas
router.get('/profile', verifyToken, getProfile);

export default router;