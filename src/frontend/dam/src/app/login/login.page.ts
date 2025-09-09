import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons, 
  IonItem, IonInput, IonLabel, IonMenuButton, IonCard, IonCardContent,
  IonIcon, IonSpinner
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { LoginService } from '../services/login.service';

// Interfaz para la respuesta del login
interface LoginResponse {
  success?: boolean;
  signed_user: {
    usuario_id?: number;
    username: string;
    nombre?: string;
  };
  token: string;
  message?: string;
}

// Interfaz para indicador de fuerza de contraseña
interface PasswordStrength {
  text: string;
  class: string;
}

// Interfaz para datos de registro
interface RegisterData {
  nombre: string;
  correo: string;
  usuario: string;
  token: string;
  password: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonButtons,
    IonItem, IonInput, IonLabel, IonMenuButton, IonCard, IonCardContent,
    IonIcon, IonSpinner
  ]
})
export class LoginPage implements OnInit {
  
  // Propiedades del componente
  currentForm: 'login' | 'register' = 'login';
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  
  // Estados de UI
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Visibilidad de contraseñas
  showLoginPassword = false;
  showRegisterPassword = false;
  showConfirmPassword = false;
  
  // Fuerza de contraseña
  passwordStrength: PasswordStrength = { text: '', class: '' };

  constructor(
    private formBuilder: FormBuilder,
    private loginService: LoginService,
    private router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    // Verificar si ya hay una sesión activa
    this.checkExistingSession();
    
    // Cargar borrador de registro si existe
    this.loadRegistrationDraft();
    
    // Configurar eventos para guardar borrador automáticamente
    this.registerForm.valueChanges.subscribe(() => {
      this.saveRegistrationDraft();
    });
  }

  /**
   * Inicializa los formularios reactivos
   */
  private initializeForms(): void {
    // Formulario de login
    this.loginForm = this.formBuilder.group({
      usuario: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });

    // Formulario de registro
    this.registerForm = this.formBuilder.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      correo: ['', [Validators.required, Validators.email]],
      usuario: ['', [Validators.required, Validators.minLength(3)]],
      token: ['', [Validators.required, Validators.minLength(6)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { 
      validators: this.passwordMatchValidator 
    });
  }

  /**
   * Validador personalizado para verificar que las contraseñas coincidan
   */
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
      }
      return null;
    }
  }

  /**
   * Verifica si ya existe una sesión activa
   */
  private checkExistingSession(): void {
    const existingToken = localStorage.getItem('authToken');
    if (existingToken) {
      this.showSuccess('Ya tienes una sesión activa. Redirigiendo al portal...');
      setTimeout(() => {
        this.router.navigate(['/home']); // Ajustar ruta según tu aplicación
      }, 2000);
    }
  }

  /**
   * Cambia al formulario de login
   */
  showLogin(): void {
    this.currentForm = 'login';
    this.clearMessages();
  }

  /**
   * Cambia al formulario de registro
   */
  showRegister(): void {
    this.currentForm = 'register';
    this.clearMessages();
  }

  /**
   * Alterna la visibilidad de las contraseñas
   */
  togglePasswordVisibility(type: 'login' | 'register' | 'confirm'): void {
    switch (type) {
      case 'login':
        this.showLoginPassword = !this.showLoginPassword;
        break;
      case 'register':
        this.showRegisterPassword = !this.showRegisterPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

  /**
   * Verifica la fuerza de la contraseña en tiempo real
   */
  checkPasswordStrength(): void {
    const password = this.registerForm.get('password')?.value || '';
    
    let strength = 0;
    const messages: string[] = [];

    // Criterios de validación
    if (password.length >= 8) strength++;
    else messages.push('mínimo 8 caracteres');

    if (/[A-Z]/.test(password)) strength++;
    else messages.push('una mayúscula');

    if (/[a-z]/.test(password)) strength++;
    else messages.push('una minúscula');

    if (/[0-9]/.test(password)) strength++;
    else messages.push('un número');

    if (/[^A-Za-z0-9]/.test(password)) strength++;
    else messages.push('un carácter especial');

    // Determinar clase y mensaje
    if (strength < 2) {
      this.passwordStrength = {
        text: 'Débil - Falta: ' + messages.join(', '),
        class: 'strength-weak'
      };
    } else if (strength < 4) {
      this.passwordStrength = {
        text: 'Media - Falta: ' + messages.join(', '),
        class: 'strength-medium'
      };
    } else {
      this.passwordStrength = {
        text: 'Fuerte ✓',
        class: 'strength-strong'
      };
    }
  }

  /**
   * Maneja el envío del formulario de login
   */
  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    try {
      const formData = this.loginForm.value;
      
      // Crear una Promise para manejar el observable del servicio
      const loginPromise = new Promise<LoginResponse>((resolve, reject) => {
        this.loginService.login(formData.usuario, formData.password);
        
        // Simular respuesta exitosa por ahora
        // En un caso real, el loginService debería retornar un Observable
        setTimeout(() => {
          // Simular respuesta exitosa para testing
          resolve({
            success: true,
            signed_user: {
              username: formData.usuario,
              nombre: 'Usuario Test'
            },
            token: 'fake-jwt-token-for-testing'
          });
        }, 1000);
      });

      const response = await loginPromise;
      
      if (response && response.token) {
        // Guardar datos de sesión
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userData', JSON.stringify(response.signed_user));
        
        this.showSuccess('¡Inicio de sesión exitoso! Redirigiendo...');
        
        // Redirigir al dashboard
        setTimeout(() => {
          this.router.navigate(['/home']); // Ajustar ruta según tu aplicación
        }, 2000);
      } else {
        this.showError('Error al iniciar sesión. Verifica tus credenciales.');
      }
    } catch (error: any) {
      console.error('Error en login:', error);
      
      if (error.status === 403) {
        this.showError('Usuario o contraseña incorrectos');
      } else if (error.status === 0) {
        this.showError('Error de conexión. Verifique su conexión a internet.');
      } else {
        this.showError('Error del servidor. Inténtelo más tarde.');
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Maneja el envío del formulario de registro
   */
  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    try {
      const formData: RegisterData = this.registerForm.value;
      
      // Validaciones adicionales del lado del cliente
      const confirmPassword = this.registerForm.get('confirmPassword')?.value;
      if (formData.password !== confirmPassword) {
        this.showError('Las contraseñas no coinciden');
        return;
      }

      // Validar email básico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.correo)) {
        this.showError('El formato del correo electrónico es inválido');
        return;
      }

      // Simular llamada a API de registro
      const response = await this.registerUser(formData);
      
      if (response.success) {
        this.showSuccess('¡Registro exitoso! Ya puedes iniciar sesión.');
        
        // Limpiar datos de borrador
        this.clearRegistrationData();
        
        // Cambiar al formulario de login después del registro
        setTimeout(() => {
          this.showLogin();
          this.registerForm.reset();
        }, 2000);
      } else {
        this.showError(response.message || 'Error al registrar usuario');
      }

    } catch (error: any) {
      console.error('Error en registro:', error);
      
      if (error.status === 409) {
        this.showError('El usuario o correo ya existe');
      } else if (error.status === 400) {
        this.showError('Datos inválidos. Verifica la información ingresada.');
      } else {
        this.showError('Error del servidor. Inténtelo más tarde.');
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Simula el registro de usuario (implementar con tu API)
   */
  private async registerUser(userData: RegisterData): Promise<{success: boolean, message?: string}> {
    return new Promise((resolve) => {
      // Simular delay de red
      setTimeout(() => {
        // Aquí harías la llamada real a tu API
        // Por ejemplo: return this.authService.register(userData);
        
        // Simulación de respuesta exitosa
        resolve({ success: true });
      }, 1500);
    });
  }

  /**
   * Guarda un borrador de los datos de registro
   */
  saveRegistrationDraft(): void {
    if (this.currentForm === 'register') {
      const formData = this.registerForm.value;
      const draftData = { ...formData };
      delete draftData.password; // No guardar la contraseña
      delete draftData.confirmPassword;
      localStorage.setItem('registrationDraft', JSON.stringify(draftData));
    }
  }

  /**
   * Carga el borrador de los datos de registro
   */
  loadRegistrationDraft(): void {
    const draft = localStorage.getItem('registrationDraft');
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        this.registerForm.patchValue(draftData);
      } catch (error) {
        console.error('Error al cargar borrador:', error);
      }
    }
  }

  /**
   * Limpia los datos de registro del localStorage
   */
  clearRegistrationData(): void {
    localStorage.removeItem('registrationDraft');
  }

  /**
   * Marca todos los campos del formulario como tocados para mostrar errores
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Muestra mensaje de error
   */
  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  /**
   * Muestra mensaje de éxito
   */
  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }

  /**
   * Limpia todos los mensajes
   */
  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    
    if (field?.errors && field?.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors['email']) {
        return 'Formato de correo inválido';
      }
      if (field.errors['minlength']) {
        const requiredLength = field.errors['minlength'].requiredLength;
        return `Mínimo ${requiredLength} caracteres`;
      }
      if (field.errors['passwordMismatch']) {
        return 'Las contraseñas no coinciden';
      }
    }
    
    return '';
  }

  /**
   * Obtiene la etiqueta legible para un campo
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'usuario': 'El usuario',
      'password': 'La contraseña',
      'nombre': 'El nombre',
      'correo': 'El correo',
      'token': 'El token',
      'confirmPassword': 'La confirmación de contraseña'
    };
    
    return labels[fieldName] || 'El campo';
  }

  /**
   * Método para limpiar el formulario al salir
   */
  ionViewWillLeave(): void {
    this.clearMessages();
    this.loginForm.reset();
    this.registerForm.reset();
  }

  /**
   * Método para manejar errores de la imagen del logo (opcional)
   */
  onImageError(event: any): void {
    // Manejar error si la imagen del logo no se puede cargar
    console.warn('Logo image failed to load:', event);
  }
}