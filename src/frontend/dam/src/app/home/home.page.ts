import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonChip, IonLabel, IonModal, IonItem, IonInput, IonSelect,
  IonSelectOption, IonNote, IonPopover, IonList, AlertController, ToastController
} from '@ionic/angular/standalone';

// Interfaces
interface Project {
  id: number;
  nombre: string;
  sensor: string;
  fechaCreacion: Date;
  ultimaLectura: string;
  estado: 'Activo' | 'Inactivo';
  topico: string;
  enlaceTopico?: string;
}

interface CreateProjectData {
  nombre: string;
  sensor: string;
  topico?: string;
  enlaceTopico?: string;
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
    IonSelectOption, IonNote, IonPopover, IonList
  ]
})
export class HomePage implements OnInit {

  // Properties
  loading = true;
  projects: Project[] = [];
  showCreateModal = false;
  isCreatingProject = false;
  createProjectForm!: FormGroup;
  currentUser: any = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.loadUserProjects();
    this.getCurrentUser();
  }

  // Initialize reactive form
  private initializeForm() {
    this.createProjectForm = this.formBuilder.group({
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      sensor: ['MPU', [Validators.required]]
    });
  }

  // Get current user information
  private getCurrentUser() {
    // Aquí obtienes la información del usuario del localStorage o servicio
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }
  }

  // Load user projects from API
  private async loadUserProjects() {
    try {
      this.loading = true;
      
      // Simulación de datos - reemplazar con llamada real al API
      await this.simulateApiCall();
      
      // Datos de ejemplo
      this.projects = [
        {
          id: 1,
          nombre: 'Proyecto Movimiento Casa',
          sensor: 'MPU',
          fechaCreacion: new Date('2024-09-01'),
          ultimaLectura: '2024-09-08 10:30:00',
          estado: 'Activo',
          topico: 'casa/movimiento'
        },
        {
          id: 2,
          nombre: 'Proyecto Vibración Máquina',
          sensor: 'MPU',
          fechaCreacion: new Date('2024-08-15'),
          ultimaLectura: '2024-09-08 10:25:00',
          estado: 'Activo',
          topico: 'fabrica/maquina1/vibracion'
        }
      ];

      // Aquí harías la llamada real al API:
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
      return;
    }

    try {
      this.isCreatingProject = true;
      
      const formData = this.createProjectForm.value;
      
      // Generate automatic topic name
      const topicName = this.generateTopicName(formData.nombre);
      
      const projectData: CreateProjectData = {
        nombre: formData.nombre,
        sensor: formData.sensor,
        topico: topicName,
        enlaceTopico: `mqtt://broker.example.com:1883/${topicName}`
      };

      // Simulate API call
      await this.simulateApiCall();

      // Create new project object
      const newProject: Project = {
        id: this.projects.length + 1,
        nombre: projectData.nombre,
        sensor: projectData.sensor,
        fechaCreacion: new Date(),
        ultimaLectura: 'Sin lecturas',
        estado: 'Activo',
        topico: projectData.topico!,
        enlaceTopico: projectData.enlaceTopico
      };

      // Add to projects array
      this.projects.push(newProject);

      // Aquí harías la llamada real al API:
      /*
      const response = await this.projectService.createProject(projectData);
      await this.loadUserProjects(); // Reload projects
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

  // Generate topic name from project name
  private generateTopicName(projectName: string): string {
    return projectName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 50);
  }

  // View project details
  viewProject(project: Project) {
    // Navigate to project detail page
    this.router.navigate(['/project', project.id]);
  }

  // Edit project
  editProject(project: Project) {
    // Navigate to project edit page
    this.router.navigate(['/project', project.id, 'edit']);
  }

  // Confirm delete project
  async confirmDeleteProject(project: Project) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de que deseas eliminar el proyecto "${project.nombre}"? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
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
      // Simulate API call
      await this.simulateApiCall();

      // Remove from array
      this.projects = this.projects.filter(p => p.id !== project.id);

      // Aquí harías la llamada real al API:
      /*
      await this.projectService.deleteProject(project.id);
      await this.loadUserProjects(); // Reload projects
      */

      await this.showToast('Proyecto eliminado exitosamente', 'success');

    } catch (error) {
      console.error('Error deleting project:', error);
      await this.showToast('Error al eliminar el proyecto', 'danger');
    }
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
          handler: () => {
            // Clear user data
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            
            // Navigate to login
            this.router.navigate(['/login']);
          }
        }
      ]
    });

    await alert.present();
  }

  // Refresh projects
  async refreshProjects(event?: any) {
    await this.loadUserProjects();
    if (event) {
      event.target.complete();
    }
  }
}