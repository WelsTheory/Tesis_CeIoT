import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonChip, IonLabel, IonModal, IonItem, IonInput, IonSelect,
  IonSelectOption, IonNote, IonRefresher, IonRefresherContent, IonToggle,
  AlertController, ToastController, LoadingController
} from '@ionic/angular/standalone';

// Interfaces
interface Project {
  id: number;
  nombre: string;
  sensor: string;
  fechaCreacion: Date;
  ultimaLectura: string;
  activo: boolean; // Campo para habilitar/deshabilitar
  topico: string;
  enlaceTopico?: string;
}

interface CreateProjectData {
  nombre: string;
  sensor: string;
  topico?: string;
  enlaceTopico?: string;
}

interface UpdateProjectData {
  nombre: string;
  activo: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton,
    IonButton, IonIcon, IonSpinner, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonChip, IonLabel, IonModal, IonItem, IonInput, IonSelect,
    IonSelectOption, IonNote, IonRefresher, IonRefresherContent, IonToggle
  ]
})
export class HomePage implements OnInit {

  // Properties
  loading = true;
  projects: Project[] = [];
  
  // Modals
  showCreateModal = false;
  showEditModal = false;
  
  // Forms
  createProjectForm!: FormGroup;
  editProjectForm!: FormGroup;
  
  // Loading states
  isCreatingProject = false;
  isUpdatingProject = false;
  
  // Edit project data
  editingProject: Project | null = null;
  
  // User data
  currentUser: any = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadUserProjects();
    this.getCurrentUser();
  }

  // Initialize reactive forms
  private initializeForms() {
    this.createProjectForm = this.formBuilder.group({
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      sensor: ['MPU', [Validators.required]]
    });

    this.editProjectForm = this.formBuilder.group({
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      sensor: ['', [Validators.required]],
      activo: [true]
    });
  }

  // Get current user information
  private getCurrentUser() {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }
  }

  // Get count of active projects
  getActiveProjectsCount(): number {
    return this.projects.filter(project => project.activo).length;
  }

  // Load user projects from API
  private async loadUserProjects() {
    try {
      this.loading = true;
      
      // Simulate API call
      await this.simulateApiCall();
      
      // Sample data with active/inactive projects
      this.projects = [
        {
          id: 1,
          nombre: 'Proyecto Movimiento Casa',
          sensor: 'MPU',
          fechaCreacion: new Date('2024-09-01'),
          ultimaLectura: '2024-09-08 10:30:00',
          activo: true,
          topico: 'casa/movimiento'
        },
        {
          id: 2,
          nombre: 'Proyecto Vibración Máquina',
          sensor: 'MPU',
          fechaCreacion: new Date('2024-08-15'),
          ultimaLectura: '2024-09-08 10:25:00',
          activo: false, // Project disabled
          topico: 'fabrica/maquina1/vibracion'
        }
      ];

      // Real API call would be:
      /*
      const response = await this.projectService.getUserProjects();
      this.projects = response.data;
      */

    } catch (error) {
      console.error('Error loading projects:', error);
      await this.showToast('Error al cargar los proyectos', 'danger');
    } finally {
      this.loading = false;
    }
  }

  // Simulate API call delay
  private simulateApiCall(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => resolve(), 1000);
    });
  }

  // ===================================================================
  // CREATE PROJECT METHODS
  // ===================================================================

  // Open create project modal
  openCreateProjectModal() {
    if (this.projects.length >= 2) {
      this.showLimitAlert();
      return;
    }
    this.showCreateModal = true;
    this.createProjectForm.reset();
    this.createProjectForm.patchValue({ sensor: 'MPU' });
  }

  // Close create project modal
  closeCreateProjectModal() {
    this.showCreateModal = false;
    this.createProjectForm.reset();
    this.isCreatingProject = false;
  }

  // Create new project
  async createProject() {
    if (this.createProjectForm.invalid || this.projects.length >= 2) {
      this.markFormGroupTouched(this.createProjectForm);
      return;
    }

    try {
      this.isCreatingProject = true;
      
      const formData = this.createProjectForm.value;
      const topicName = this.getGeneratedTopic();
      const fullMqttUrl = this.getFullMqttUrl();
      
      const projectData: CreateProjectData = {
        nombre: formData.nombre,
        sensor: formData.sensor,
        topico: topicName,
        enlaceTopico: fullMqttUrl
      };

      // Simulate API call
      await this.simulateApiCall();

      // Create new project object
      const newProject: Project = {
        id: Date.now(), // Use timestamp as ID for demo
        nombre: projectData.nombre,
        sensor: projectData.sensor,
        fechaCreacion: new Date(),
        ultimaLectura: 'Sin lecturas',
        activo: true, // New projects are active by default
        topico: projectData.topico!,
        enlaceTopico: projectData.enlaceTopico
      };

      this.projects.push(newProject);

      // Real API call:
      /*
      const response = await this.projectService.createProject(projectData);
      await this.loadUserProjects();
      */

      await this.showToast('Proyecto creado exitosamente', 'success');
      this.closeCreateProjectModal();

    } catch (error) {
      console.error('Error creating project:', error);
      await this.showToast('Error al crear el proyecto', 'danger');
    } finally {
      this.isCreatingProject = false;
    }
  }

  // ===================================================================
  // EDIT PROJECT METHODS
  // ===================================================================

  // Open edit project modal
  openEditProjectModal(project: Project) {
    this.editingProject = project;
    this.showEditModal = true;
    
    // Populate form with current project data
    this.editProjectForm.patchValue({
      nombre: project.nombre,
      sensor: project.sensor,
      activo: project.activo
    });
  }

  // Close edit project modal
  closeEditProjectModal() {
    this.showEditModal = false;
    this.editProjectForm.reset();
    this.editingProject = null;
    this.isUpdatingProject = false;
  }

  // Update project
  async updateProject() {
    if (this.editProjectForm.invalid || !this.editingProject) {
      return;
    }

    try {
      this.isUpdatingProject = true;
      
      const formData = this.editProjectForm.value;
      const updateData: UpdateProjectData = {
        nombre: formData.nombre,
        activo: formData.activo
      };

      // Simulate API call
      await this.simulateApiCall();

      // Update project in array
      const projectIndex = this.projects.findIndex(p => p.id === this.editingProject!.id);
      if (projectIndex !== -1) {
        this.projects[projectIndex] = {
          ...this.projects[projectIndex],
          nombre: updateData.nombre,
          activo: updateData.activo
        };
      }

      // Real API call:
      /*
      await this.projectService.updateProject(this.editingProject.id, updateData);
      await this.loadUserProjects();
      */

      await this.showToast('Proyecto actualizado exitosamente', 'success');
      this.closeEditProjectModal();

    } catch (error) {
      console.error('Error updating project:', error);
      await this.showToast('Error al actualizar el proyecto', 'danger');
    } finally {
      this.isUpdatingProject = false;
    }
  }

  // ===================================================================
  // PROJECT STATUS METHODS
  // ===================================================================

  // Toggle project active status
  async toggleProjectStatus(project: Project) {
    const action = project.activo ? 'deshabilitar' : 'habilitar';
    const confirmMessage = `¿Estás seguro de que deseas ${action} el proyecto "${project.nombre}"?`;
    
    const alert = await this.alertController.create({
      header: `${action.charAt(0).toUpperCase() + action.slice(1)} Proyecto`,
      message: confirmMessage,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          handler: async () => {
            await this.updateProjectStatus(project, !project.activo);
          }
        }
      ]
    });

    await alert.present();
  }

  // Update project status
  private async updateProjectStatus(project: Project, newStatus: boolean) {
    try {
      const loading = await this.loadingController.create({
        message: newStatus ? 'Habilitando proyecto...' : 'Deshabilitando proyecto...',
        duration: 2000
      });
      await loading.present();

      // Simulate API call
      await this.simulateApiCall();

      // Update project status
      const projectIndex = this.projects.findIndex(p => p.id === project.id);
      if (projectIndex !== -1) {
        this.projects[projectIndex].activo = newStatus;
      }

      // Real API call:
      /*
      await this.projectService.updateProjectStatus(project.id, newStatus);
      */

      await loading.dismiss();
      
      const message = newStatus ? 'Proyecto habilitado exitosamente' : 'Proyecto deshabilitado exitosamente';
      await this.showToast(message, 'success');

    } catch (error) {
      console.error('Error updating project status:', error);
      await this.showToast('Error al cambiar el estado del proyecto', 'danger');
    }
  }

  // ===================================================================
  // DELETE PROJECT METHODS
  // ===================================================================

  // Confirm delete project
  async confirmDeleteProject(project: Project) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de que deseas eliminar el proyecto "${project.nombre}"? Esta acción no se puede deshacer y se perderán todos los datos asociados.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'danger',
          handler: () => {
            this.deleteProject(project);
          }
        }
      ]
    });

    await alert.present();
  }

  // Delete project
  async deleteProject(project: Project) {
    try {
      const loading = await this.loadingController.create({
        message: 'Eliminando proyecto...',
        duration: 3000
      });
      await loading.present();

      // Simulate API call
      await this.simulateApiCall();

      // Remove from array
      this.projects = this.projects.filter(p => p.id !== project.id);

      // Real API call:
      /*
      await this.projectService.deleteProject(project.id);
      await this.loadUserProjects();
      */

      await loading.dismiss();
      await this.showToast('Proyecto eliminado exitosamente', 'success');

    } catch (error) {
      console.error('Error deleting project:', error);
      await this.showToast('Error al eliminar el proyecto', 'danger');
    }
  }

  // ===================================================================
  // NAVIGATION METHODS
  // ===================================================================

  // View project details
  viewProject(project: Project) {
    if (!project.activo) {
      this.showToast('El proyecto está deshabilitado. Habilítalo para ver los datos.', 'warning');
      return;
    }
    // Navigate to project detail page
    this.router.navigate(['/project', project.id]);
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  // Generate topic name from project name
  private generateTopicName(projectName: string): string {
    return projectName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 50);
  }

  // Show limit alert
  async showLimitAlert() {
    const alert = await this.alertController.create({
      header: 'Límite Alcanzado',
      message: 'Has alcanzado el límite máximo de 2 proyectos por usuario. Para crear un nuevo proyecto, debes eliminar uno existente.',
      buttons: [
        {
          text: 'Entendido',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  // Show toast message
  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color,
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }

  // Logout user
  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          cssClass: 'danger',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Cerrando sesión...',
              duration: 1500
            });
            await loading.present();

            // Clear user data
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
            
            await loading.dismiss();
            
            // Navigate to login
            this.router.navigate(['/login'], { replaceUrl: true });
          }
        }
      ]
    });

    await alert.present();
  }

  // Refresh projects (pull to refresh)
  async refreshProjects(event?: any) {
    try {
      await this.loadUserProjects();
      await this.showToast('Proyectos actualizados', 'success');
    } catch (error) {
      console.error('Error refreshing projects:', error);
      await this.showToast('Error al actualizar proyectos', 'danger');
    } finally {
      if (event) {
        event.target.complete();
      }
    }
  }

  // ===================================================================
  // FORM VALIDATION HELPERS
  // ===================================================================

  // Mark all form fields as touched for validation display
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Check if form field has error and is touched
  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  // Get form field error message
  getFieldErrorMessage(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (!field || !field.errors || !field.touched) {
      return '';
    }

    if (field.errors['required']) {
      return `${fieldName} es requerido`;
    }
    if (field.errors['minlength']) {
      return `${fieldName} debe tener al menos ${field.errors['minlength'].requiredLength} caracteres`;
    }
    if (field.errors['maxlength']) {
      return `${fieldName} no puede exceder ${field.errors['maxlength'].requiredLength} caracteres`;
    }

    return 'Campo inválido';
  }
}