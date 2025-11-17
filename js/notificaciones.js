class NotificacionesManager {
    constructor() {
        this.notificaciones = [];
        this.inquilinos = [];
        this.contratos = [];
        this.currentNotificacion = null;
        this.currentAction = null;
        this.API_BASE = 'http://localhost:8000/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadNotificaciones();
        this.loadInquilinos();
        this.loadContratos();
    }

    bindEvents() {
        // Botones principales
        document.getElementById('btnNuevaNotificacion').addEventListener('click', () => this.showModal());
        
        // Modal events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideModals());
        });
        
        document.getElementById('btnCancelar').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCancelarAccion').addEventListener('click', () => this.hideModals());
        
        // Form events
        document.getElementById('notificacionForm').addEventListener('submit', (e) => this.guardarNotificacion(e));
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.buscarNotificaciones(e.target.value));
        
        // Confirmación
        document.getElementById('btnConfirmarAccion').addEventListener('click', () => this.confirmarAccion());
        
        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });
    }

    async loadNotificaciones() {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.API_BASE}/notificaciones`);
            
            if (!response.ok) {
                throw new Error('Error al cargar notificaciones');
            }
            
            this.notificaciones = await response.json();
            this.renderNotificaciones();
            this.updateStats();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar las notificaciones: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async loadInquilinos() {
        try {
            const response = await fetch(`${this.API_BASE}/inquilinos`);
            
            if (!response.ok) {
                throw new Error('Error al cargar inquilinos');
            }
            
            this.inquilinos = await response.json();
            this.populateSelect('idInquilino', this.inquilinos, 'nombreInquilino');
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los inquilinos');
        }
    }

    async loadContratos() {
        try {
            const response = await fetch(`${this.API_BASE}/contratos`);
            
            if (!response.ok) {
                throw new Error('Error al cargar contratos');
            }
            
            this.contratos = await response.json();
            this.populateContratosSelect();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los contratos');
        }
    }

    populateSelect(selectId, data, labelField) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Seleccionar...</option>';
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.idInquilino;
            option.textContent = item[labelField];
            select.appendChild(option);
        });
    }

    populateContratosSelect() {
        const select = document.getElementById('idContrato');
        select.innerHTML = '<option value="">Seleccionar...</option>';
        
        this.contratos.forEach(contrato => {
            const option = document.createElement('option');
            option.value = contrato.idContrato;
            const inquilinoNombre = contrato.inquilino ? contrato.inquilino.nombreInquilino : 'N/A';
            const cuartoNombre = contrato.cuarto ? contrato.cuarto.nombreCuarto : 'N/A';
            option.textContent = `C-${contrato.idContrato.toString().padStart(3, '0')} - ${inquilinoNombre} (${cuartoNombre})`;
            select.appendChild(option);
        });
    }

    renderNotificaciones(notificaciones = this.notificaciones) {
        const tbody = document.getElementById('notificacionesTableBody');
        
        if (notificaciones.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-bell" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                        <p>No se encontraron notificaciones</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = notificaciones.map(notificacion => `
            <tr>
                <td>N-${notificacion.idNotificacion.toString().padStart(3, '0')}</td>
                <td>${notificacion.inquilino ? notificacion.inquilino.nombreInquilino : 'General'}</td>
                <td>${notificacion.idContrato ? `C-${notificacion.idContrato.toString().padStart(3, '0')}` : 'General'}</td>
                <td>${this.formatDate(notificacion.fechaUtilizacion)}</td>
                <td>
                    <span class="type-badge ${this.getTypeClass(notificacion.tipoNotificacion)}">
                        ${this.getTypeText(notificacion.tipoNotificacion)}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${this.getStatusClass(notificacion.fechaUtilizacion)}">
                        ${this.getStatusText(notificacion.fechaUtilizacion)}
                    </span>
                </td>
                <td class="table-actions-cell">
                    <button class="btn-action btn-edit" onclick="notificacionesManager.editarNotificacion(${notificacion.idNotificacion})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-action btn-delete" onclick="notificacionesManager.eliminarNotificacion(${notificacion.idNotificacion})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getTypeClass(tipo) {
        const typeMap = {
            'PAGO_PENDIENTE': 'type-pago',
            'RENOVACION': 'type-renovacion',
            'MANTENIMIENTO': 'type-mantenimiento',
            'INSPECCION': 'type-general',
            'AVISO_GENERAL': 'type-general',
            'RECORDATORIO': 'type-renovacion',
            'URGENTE': 'type-urgente'
        };
        return typeMap[tipo] || 'type-general';
    }

    getTypeText(tipo) {
        const typeMap = {
            'PAGO_PENDIENTE': 'Pago Pendiente',
            'RENOVACION': 'Renovación',
            'MANTENIMIENTO': 'Mantenimiento',
            'INSPECCION': 'Inspección',
            'AVISO_GENERAL': 'Aviso General',
            'RECORDATORIO': 'Recordatorio',
            'URGENTE': 'Urgente'
        };
        return typeMap[tipo] || tipo;
    }

    getStatusClass(fechaUtilizacion) {
        const hoy = new Date();
        const fechaNotif = new Date(fechaUtilizacion);
        
        // Normalizar fechas para comparar solo día, mes y año
        const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const fechaNormalizada = new Date(fechaNotif.getFullYear(), fechaNotif.getMonth(), fechaNotif.getDate());
        
        if (fechaNormalizada.getTime() === hoyNormalizado.getTime()) {
            return 'status-today';
        } else if (fechaNormalizada > hoyNormalizado) {
            return 'status-future';
        } else {
            return 'status-past';
        }
    }

    getStatusText(fechaUtilizacion) {
        const hoy = new Date();
        const fechaNotif = new Date(fechaUtilizacion);
        
        // Normalizar fechas para comparar solo día, mes y año
        const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const fechaNormalizada = new Date(fechaNotif.getFullYear(), fechaNotif.getMonth(), fechaNotif.getDate());
        
        if (fechaNormalizada.getTime() === hoyNormalizado.getTime()) {
            return 'Hoy';
        } else if (fechaNormalizada > hoyNormalizado) {
            return 'Futura';
        } else {
            return 'Pasada';
        }
    }

    updateStats() {
        const hoy = new Date();
        const total = this.notificaciones.length;
        
        const hoyCount = this.notificaciones.filter(n => {
            const fechaNotif = new Date(n.fechaUtilizacion);
            const fechaNormalizada = new Date(fechaNotif.getFullYear(), fechaNotif.getMonth(), fechaNotif.getDate());
            const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            return fechaNormalizada.getTime() === hoyNormalizado.getTime();
        }).length;
        
        const futuras = this.notificaciones.filter(n => {
            const fechaNotif = new Date(n.fechaUtilizacion);
            const fechaNormalizada = new Date(fechaNotif.getFullYear(), fechaNotif.getMonth(), fechaNotif.getDate());
            const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            return fechaNormalizada > hoyNormalizado;
        }).length;
        
        const pasadas = this.notificaciones.filter(n => {
            const fechaNotif = new Date(n.fechaUtilizacion);
            const fechaNormalizada = new Date(fechaNotif.getFullYear(), fechaNotif.getMonth(), fechaNotif.getDate());
            const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            return fechaNormalizada < hoyNormalizado;
        }).length;

        document.getElementById('totalNotificaciones').textContent = total;
        document.getElementById('notificacionesHoy').textContent = hoyCount;
        document.getElementById('notificacionesFuturas').textContent = futuras;
        document.getElementById('notificacionesPasadas').textContent = pasadas;
    }

    buscarNotificaciones(termino) {
        if (!termino) {
            this.renderNotificaciones();
            return;
        }

        const notificacionesFiltradas = this.notificaciones.filter(notificacion => {
            const searchText = termino.toLowerCase();
            return (
                notificacion.idNotificacion.toString().includes(searchText) ||
                (notificacion.inquilino?.nombreInquilino?.toLowerCase().includes(searchText)) ||
                notificacion.idContrato?.toString().includes(searchText) ||
                notificacion.tipoNotificacion?.toLowerCase().includes(searchText)
            );
        });

        this.renderNotificaciones(notificacionesFiltradas);
    }

    showModal(notificacion = null) {
        this.currentNotificacion = notificacion;
        const modal = document.getElementById('modalNotificacion');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('notificacionForm');

        if (notificacion) {
            title.textContent = 'Editar Notificación';
            this.populateForm(notificacion);
        } else {
            title.textContent = 'Nueva Notificación';
            form.reset();
            // Establecer fecha mínima como hoy para nueva notificación
            const hoy = new Date().toISOString().split('T')[0];
            document.getElementById('fechaUtilizacion').min = hoy;
        }

        modal.style.display = 'block';
    }

    populateForm(notificacion) {
        // Limpiar formulario primero
        document.getElementById('notificacionForm').reset();
        
        // Establecer valores
        document.getElementById('idInquilino').value = notificacion.inquilino ? notificacion.inquilino.idInquilino : '';
        document.getElementById('idContrato').value = notificacion.idContrato || '';
        document.getElementById('fechaUtilizacion').value = notificacion.fechaUtilizacion;
        document.getElementById('tipoNotificacion').value = notificacion.tipoNotificacion || '';
    }

    async guardarNotificacion(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardar');
            
            const formData = new FormData(e.target);
            
            // Obtener los valores del formulario
            const idInquilino = formData.get('idInquilino');
            const idContrato = formData.get('idContrato');
            const fechaUtilizacion = formData.get('fechaUtilizacion');
            const tipoNotificacion = formData.get('tipoNotificacion');

            // Validar que tenga al menos un destinatario
            if (!idInquilino && !idContrato) {
                throw new Error('La notificación debe estar asociada a un inquilino o contrato');
            }

            // Preparar datos de la notificación según la estructura EXACTA que espera la API
            const notificacionData = {
                tipoNotificacion: tipoNotificacion,
                fechaUtilizacion: fechaUtilizacion
            };

            // Si se seleccionó un inquilino, agregar SOLO el ID del inquilino (como objeto simple)
            if (idInquilino) {
                notificacionData.inquilino = {
                    idInquilino: parseInt(idInquilino)
                };
            }

            // Si se seleccionó un contrato, agregar el ID del contrato
            if (idContrato) {
                notificacionData.idContrato = parseInt(idContrato);
            }

            console.log('Enviando datos:', notificacionData); // Para debug

            let response;
            if (this.currentNotificacion) {
                // Actualizar notificación existente
                response = await fetch(`${this.API_BASE}/notificaciones/${this.currentNotificacion.idNotificacion}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(notificacionData)
                });
            } else {
                // Crear nueva notificación
                response = await fetch(`${this.API_BASE}/notificaciones`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(notificacionData)
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Error al guardar la notificación';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData;
                } catch {
                    errorMessage = errorText || 'Error al guardar la notificación';
                }
                
                throw new Error(errorMessage);
            }

            const savedNotificacion = await response.json();
            this.showSuccess(`Notificación ${this.currentNotificacion ? 'actualizada' : 'creada'} correctamente`);
            this.hideModals();
            this.loadNotificaciones();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnGuardar');
        }
    }

    editarNotificacion(id) {
        const notificacion = this.notificaciones.find(n => n.idNotificacion === id);
        if (notificacion) {
            this.showModal(notificacion);
        }
    }

    eliminarNotificacion(id) {
        const notificacion = this.notificaciones.find(n => n.idNotificacion === id);
        if (notificacion) {
            this.currentNotificacion = notificacion;
            const mensaje = `¿Estás seguro de eliminar la notificación N-${notificacion.idNotificacion.toString().padStart(3, '0')}?`;
            this.showConfirmModal(mensaje, 'eliminar');
        }
    }

    showConfirmModal(message, action) {
        this.currentAction = action;
        const modal = document.getElementById('modalConfirmacion');
        const messageElement = document.getElementById('confirmacionMensaje');
        messageElement.textContent = message;
        modal.style.display = 'block';
    }

    async confirmarAccion() {
        try {
            this.showLoading(true, 'btnConfirmarAccion');
            
            if (this.currentAction === 'eliminar' && this.currentNotificacion) {
                const response = await fetch(`${this.API_BASE}/notificaciones/${this.currentNotificacion.idNotificacion}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al eliminar la notificación');
                }

                this.showSuccess('Notificación eliminada correctamente');
                this.hideModals();
                this.loadNotificaciones();
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al eliminar la notificación: ' + error.message);
        } finally {
            this.showLoading(false, 'btnConfirmarAccion');
        }
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.currentNotificacion = null;
        this.currentAction = null;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }

    showLoading(show, buttonId = null) {
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (show) {
                button.disabled = true;
                button.innerHTML = '<span class="spinner"></span> Procesando...';
            } else {
                button.disabled = false;
                // Restaurar texto original según el botón
                if (buttonId === 'btnGuardar') {
                    button.textContent = this.currentNotificacion ? 'Actualizar Notificación' : 'Guardar Notificación';
                } else if (buttonId === 'btnConfirmarAccion') {
                    button.textContent = 'Confirmar';
                }
            }
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
            color: white;
            border-radius: 6px;
            box-shadow: var(--shadow);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.notificacionesManager = new NotificacionesManager();
});

// Agregar estilos CSS para las animaciones de notificación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);