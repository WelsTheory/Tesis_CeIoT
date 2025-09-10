import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// Interfaces para tipado fuerte
export interface RegisterRequest {
  nombre: string;
  correo: string;
  usuario: string;
  token: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    usuario_id: number;
    nombre: string;
    usuario: string;
    correo: string;
    fecha_creacion: string;
  };
  errorMessage?: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  message: string;
}

export interface UserInfoResponse {
  success: boolean;
  data: {
    usuario_id: number;
    nombre: string;
    usuario: string;
    correo: string;
    fecha_creacion: string;
    total_proyectos: number;
    max_proyectos: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RegisterService {
  
  private apiUrl = 'http://localhost:8000'; // Ajustar según tu configuración
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) { }

  /**
   * Registra un nuevo usuario en el sistema
   */
  register(userData: RegisterRequest): Observable<RegisterResponse> {
    console.log('Enviando datos de registro:', { ...userData, password: '[OCULTO]' });
    
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, userData, this.httpOptions)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('Usuario registrado exitosamente:', response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Valida un token de acceso en tiempo real
   */
  validateToken(token: string): Observable<TokenValidationResponse> {
    const tokenData = { token };
    
    return this.http.post<TokenValidationResponse>(`${this.apiUrl}/validate-token`, tokenData, this.httpOptions)
      .pipe(
        tap(response => {
          console.log('Validación de token:', response);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene información del usuario autenticado
   */
  getUserInfo(): Observable<UserInfoResponse> {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      return throwError(() => new Error('No hay token de autenticación'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<UserInfoResponse>(`${this.apiUrl}/user-info`, { headers })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('Información del usuario obtenida:', response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Cambia la contraseña del usuario autenticado
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      return throwError(() => new Error('No hay token de autenticación'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const passwordData = {
      currentPassword,
      newPassword
    };

    return this.http.post(`${this.apiUrl}/change-password`, passwordData, { headers })
      .pipe(
        tap(response => {
          console.log('Contraseña cambiada exitosamente');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Verifica si un usuario o correo ya existen (para validación en tiempo real)
   */
  checkUserExists(usuario?: string, correo?: string): Observable<{exists: boolean, field?: string}> {
    const checkData: any = {};
    if (usuario) checkData.usuario = usuario;
    if (correo) checkData.correo = correo;

    return this.http.post<{exists: boolean, field?: string}>(`${this.apiUrl}/check-user-exists`, checkData, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene la lista de tokens disponibles (solo para administradores)
   */
  getAvailableTokens(): Observable<any> {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      return throwError(() => new Error('No hay token de autenticación'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(`${this.apiUrl}/tokens`, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Valida la fuerza de una contraseña
   */
  validatePasswordStrength(password: string): {
    score: number;
    message: string;
    class: string;
    requirements: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      numbers: boolean;
      special: boolean;
    };
  } {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;
    
    let message = '';
    let className = '';

    switch (score) {
      case 0:
      case 1:
        message = 'Muy débil';
        className = 'strength-very-weak';
        break;
      case 2:
        message = 'Débil';
        className = 'strength-weak';
        break;
      case 3:
        message = 'Regular';
        className = 'strength-medium';
        break;
      case 4:
        message = 'Fuerte';
        className = 'strength-strong';
        break;
      case 5:
        message = 'Muy fuerte';
        className = 'strength-very-strong';
        break;
    }

    // Agregar detalles de lo que falta
    const missing = [];
    if (!requirements.length) missing.push('8 caracteres');
    if (!requirements.uppercase) missing.push('mayúscula');
    if (!requirements.lowercase) missing.push('minúscula');
    if (!requirements.numbers) missing.push('número');
    if (!requirements.special) missing.push('carácter especial');

    if (missing.length > 0) {
      message += ` - Falta: ${missing.join(', ')}`;
    }

    return {
      score,
      message,
      class: className,
      requirements
    };
  }

  /**
   * Valida el formato de email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida el formato del nombre de usuario
   */
  validateUsername(username: string): {valid: boolean, message?: string} {
    if (username.length < 3) {
      return { valid: false, message: 'Mínimo 3 caracteres' };
    }

    if (username.length > 50) {
      return { valid: false, message: 'Máximo 50 caracteres' };
    }

    // Solo permite letras, números, puntos y guiones bajos
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(username)) {
      return { valid: false, message: 'Solo letras, números, puntos y guiones bajos' };
    }

    // No puede empezar o terminar con punto o guión bajo
    if (username.startsWith('.') || username.startsWith('_') || 
        username.endsWith('.') || username.endsWith('_')) {
      return { valid: false, message: 'No puede empezar o terminar con . o _' };
    }

    return { valid: true };
  }

  /**
   * Limpia los datos de registro del localStorage
   */
  clearRegistrationData(): void {
    localStorage.removeItem('registrationDraft');
  }

  /**
   * Guarda un borrador de los datos de registro
   */
  saveRegistrationDraft(data: Partial<RegisterRequest>): void {
    const draftData = { ...data };
    delete draftData.password; // No guardar la contraseña
    localStorage.setItem('registrationDraft', JSON.stringify(draftData));
  }

  /**
   * Recupera el borrador de los datos de registro
   */
  getRegistrationDraft(): Partial<RegisterRequest> | null {
    const draft = localStorage.getItem('registrationDraft');
    return draft ? JSON.parse(draft) : null;
  }

  /**
   * Manejo centralizado de errores HTTP
   */
  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'Error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      console.error(`Código de error: ${error.status}, Mensaje: ${error.message}`);
      
      switch (error.status) {
        case 0:
          errorMessage = 'No se pudo conectar al servidor. Verifique su conexión a internet.';
          break;
        case 400:
          errorMessage = error.error?.errorMessage || 'Datos inválidos';
          break;
        case 401:
          errorMessage = 'No autorizado. Inicie sesión nuevamente.';
          break;
        case 403:
          errorMessage = error.error?.errorMessage || 'Acceso denegado';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado';
          break;
        case 409:
          errorMessage = error.error?.errorMessage || 'El usuario ya existe';
          break;
        case 422:
          errorMessage = error.error?.errorMessage || 'Datos de validación incorrectos';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Inténtelo más tarde.';
          break;
        default:
          errorMessage = error.error?.errorMessage || `Error ${error.status}: ${error.message}`;
      }
    }
    
    console.error('Error en RegisterService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    try {
      // Verificar si el token no ha expirado (simplificado)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Error al verificar token:', error);
      return false;
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('registrationDraft');
  }

  /**
   * Obtiene información básica del usuario desde el token
   */
  getUserDataFromToken(): any {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        usuario_id: payload.usuario_id,
        username: payload.username,
        nombre: payload.nombre
      };
    } catch (error) {
      console.error('Error al decodificar token:', error);
      return null;
    }
  }
}