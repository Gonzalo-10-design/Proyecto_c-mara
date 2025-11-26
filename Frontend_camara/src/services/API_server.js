// Frontend_camara/src/services/API_server.js
// Servicio de API para comunicación con el backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Método genérico para hacer peticiones
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Agregar token si existe
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ============================================
  // AUTENTICACIÓN
  // ============================================

  /**
   * Registrar nuevo usuario
   * @param {Object} userData - { username, email, password }
   * @returns {Promise<Object>} - { message, userId }
   */
  async register(userData) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Iniciar sesión
   * @param {Object} credentials - { username, password }
   * @returns {Promise<Object>} - { message, token, user }
   */
  async login(credentials) {
    const response = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Guardar token y usuario en localStorage
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  }

  /**
   * Cerrar sesión
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Obtener perfil del usuario actual
   * @returns {Promise<Object>} - { id, username, email, created_at }
   */
  async getProfile() {
    return this.request('/profile', {
      method: 'GET',
    });
  }

  /**
   * Verificar si el usuario está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
  }

  /**
   * Obtener usuario del localStorage
   * @returns {Object|null}
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Verificar la validez del token
   * @returns {Promise<boolean>}
   */
  async verifyToken() {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * Verificar estado del servidor
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    const url = this.baseURL.replace('/api', '/health');
    const response = await fetch(url);
    return response.json();
  }
}

// Exportar instancia única (Singleton)
const apiService = new APIService();
export default apiService;

// También exportar la clase por si se necesita
export { APIService };