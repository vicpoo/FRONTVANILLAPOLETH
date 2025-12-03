class NotificacionesManager {
    constructor() {
        this.notificaciones = [];
        this.inquilinos = []; // Solo usuarios con rol ID 2
        this.contratos = [];
        this.currentNotificacion = null;
        this.currentAction = null;
        this.API_BASE = 'http://localhost:8000/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInquilinos(); // Primero cargar inquilinos
        this.loadContratos();
        this.loadNotificaciones();
    }

    bindEvents() {
        // Botones principales
        document.getElementById('btnNuevaNotificacion').addEventListener('click', () => this.showModal());
        document.getElementById('btnRefresh').addEventListener('click', () => this.refreshData());
        
        // Modal events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideModals());
        });
        
        document.getElementById('btnCancelar').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCancelarAccion').addEventListener('click', () => this.hideModals());
        
        // Form events
        document.getElementById('notificacionForm').addEventListener('submit', (e) => this.guardarNotificacion(e));
        
        // Filtros
        document.getElementById('filterEstado').addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filterTipo').addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filterInquilino').addEventListener('change', () => this.aplicarFiltros());
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.buscarNotificaciones(e.target.value));
        
        // Confirmación
        document.getElementById('btnConfirmarAccion').addEventListener('click', () => this.confirmarAccion());
        
        // Contador de caracteres
        document.getElementById('detalles').addEventListener('input', () => this.actualizarContadorCaracteres());
        
        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });
    }

    async refreshData() {
        try {
            await Promise.all([
                this.loadInquilinos(),
                this.loadContratos(),
                this.loadNotificaciones()
            ]);
            this.showSuccess('Datos actualizados correctamente');
        } catch (error) {
            this.showError('Error al actualizar los datos');
        }
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
            this.populateFilterInquilinos();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar las notificaciones: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async loadInquilinos() {
        try {
            // Primero obtenemos todos los usuarios
            const usuariosResponse = await fetch(`${this.API_BASE}/usuarios`);
            if (!usuariosResponse.ok) {
                throw new Error('Error al cargar usuarios');
            }
            
            const usuarios = await usuariosResponse.json();
            
            // Filtrar solo los usuarios con rol ID 2 (inquilinos)
            this.inquilinos = usuarios.filter(usuario => 
                usuario.rol && usuario.rol.idRoles === 2
            );
            
            console.log('Inquilinos cargados:', this.inquilinos);
            
            // Poblar el select de inquilinos
            this.populateSelect('idInquilino', this.inquilinos, 'username');
            
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
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar...</option>';
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.idUsuario;
            option.textContent = item[labelField] || item.username || 'Sin nombre';
            select.appendChild(option);
        });
    }

    populateContratosSelect() {
        const select = document.getElementById('idContrato');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar...</option>';
        
        this.contratos.forEach(contrato => {
            const option = document.createElement('option');
            option.value = contrato.idContrato;
            
            // Intentar obtener nombre del inquilino del contrato
            let nombreInquilino = 'N/A';
            if (contrato.inquilino && contrato.inquilino.username) {
                nombreInquilino = contrato.inquilino.username;
            } else if (contrato.idInquilino) {
                // Buscar en la lista de inquilinos
                const inquilino = this.inquilinos.find(i => i.idUsuario === contrato.idInquilino);
                nombreInquilino = inquilino ? (inquilino.username || 'N/A') : 'N/A';
            }
            
            option.textContent = `C-${contrato.idContrato.toString().padStart(3, '0')} - ${nombreInquilino}`;
            select.appendChild(option);
        });
    }

    populateFilterInquilinos() {
        // Extraer inquilinos únicos de las notificaciones
        const inquilinosNotificaciones = [];
        const inquilinoIds = new Set();
        
        this.notificaciones.forEach(notificacion => {
            if (notificacion.inquilino && !inquilinoIds.has(notificacion.inquilino.idUsuario)) {
                inquilinoIds.add(notificacion.inquilino.idUsuario);
                inquilinosNotificaciones.push(notificacion.inquilino);
            }
        });
        
        // Poblar filtro de inquilinos
        const select = document.getElementById('filterInquilino');
        if (!select) return;
        
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">Todos los inquilinos</option>';
        
        inquilinosNotificaciones.forEach(inquilino => {
            const option = document.createElement('option');
            option.value = inquilino.idUsuario;
            option.textContent = inquilino.username || 'Sin nombre';
            select.appendChild(option);
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    }

    renderNotificaciones(notificaciones = this.notificaciones) {
        const tbody = document.getElementById('notificacionesTableBody');
        
        if (!notificaciones || notificaciones.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i class="fas fa-bell" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                        <p>No se encontraron notificaciones</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = notificaciones.map(notificacion => `
            <tr data-id="${notificacion.idNotificacion}">
                <td>N-${notificacion.idNotificacion.toString().padStart(3, '0')}</td>
                <td>
                    ${notificacion.inquilino ? 
                        `<strong>${notificacion.inquilino.username || 'Sin nombre'}</strong><br>
                         <small>${notificacion.inquilino.email || 'Sin email'}</small>` 
                        : 'General'
                    }
                </td>
                <td>
                    ${notificacion.idContrato ? 
                        `C-${notificacion.idContrato.toString().padStart(3, '0')}` 
                        : 'General'
                    }
                </td>
                <td>${this.formatDate(notificacion.fechaUtilizacion)}</td>
                <td>
                    <span class="type-badge ${this.getTypeClass(notificacion.tipoNotificacion)}">
                        ${this.getTypeText(notificacion.tipoNotificacion)}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${notificacion.estadoNotificacion}">
                        ${notificacion.estadoNotificacion === 'leido' ? 'Leído' : 'No Leído'}
                    </span>
                </td>
                <td class="truncate-text" title="${notificacion.detalles || 'Sin detalles'}">
                    ${this.truncateText(notificacion.detalles, 50) || 'Sin detalles'}
                </td>
                <td>
                    ${this.formatDateTime(notificacion.createdAt)}
                </td>
                <td class="table-actions-cell">
                    <button class="btn-action btn-view" onclick="notificacionesManager.verNotificacion(${notificacion.idNotificacion})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${notificacion.estadoNotificacion === 'no_leido' ? `
                        <button class="btn-action btn-mark" onclick="notificacionesManager.marcarComoLeida(${notificacion.idNotificacion})" title="Marcar como leída">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn-action btn-edit" onclick="notificacionesManager.editarNotificacion(${notificacion.idNotificacion})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="notificacionesManager.eliminarNotificacion(${notificacion.idNotificacion})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    aplicarFiltros() {
        const estado = document.getElementById('filterEstado').value;
        const tipo = document.getElementById('filterTipo').value;
        const inquilino = document.getElementById('filterInquilino').value;
        
        let notificacionesFiltradas = this.notificaciones;
        
        if (estado) {
            notificacionesFiltradas = notificacionesFiltradas.filter(n => 
                n.estadoNotificacion === estado
            );
        }
        
        if (tipo) {
            notificacionesFiltradas = notificacionesFiltradas.filter(n => 
                n.tipoNotificacion === tipo
            );
        }
        
        if (inquilino) {
            notificacionesFiltradas = notificacionesFiltradas.filter(n => 
                n.inquilino && n.inquilino.idUsuario == inquilino
            );
        }
        
        this.renderNotificaciones(notificacionesFiltradas);
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
                (notificacion.inquilino?.username?.toLowerCase().includes(searchText)) ||
                (notificacion.inquilino?.email?.toLowerCase().includes(searchText)) ||
                notificacion.idContrato?.toString().includes(searchText) ||
                notificacion.tipoNotificacion?.toLowerCase().includes(searchText) ||
                (notificacion.detalles?.toLowerCase().includes(searchText))
            );
        });

        this.renderNotificaciones(notificacionesFiltradas);
    }

    getTypeClass(tipo) {
        const typeMap = {
            'PAGO_PENDIENTE': 'type-pago',
            'RENOVACION': 'type-renovacion',
            'MANTENIMIENTO': 'type-mantenimiento',
            'INSPECCION': 'type-insp',
            'AVISO_GENERAL': 'type-general',
            'RECORDATORIO': 'type-reminder',
            'URGENTE': 'type-urgente'
        };
        return typeMap[tipo] || 'type-general';
    }

    getTypeText(tipo) {
        const typeMap = {
            'PAGO_PENDIENTE': 'Pago',
            'RENOVACION': 'Renovación',
            'MANTENIMIENTO': 'Mantenimiento',
            'INSPECCION': 'Inspección',
            'AVISO_GENERAL': 'General',
            'RECORDATORIO': 'Recordatorio',
            'URGENTE': 'Urgente'
        };
        return typeMap[tipo] || tipo;
    }

    updateStats() {
        if (!this.notificaciones.length) {
            document.getElementById('totalNotificaciones').textContent = '0';
            document.getElementById('notificacionesLeidas').textContent = '0';
            document.getElementById('notificacionesNoLeidas').textContent = '0';
            document.getElementById('notificacionesHoy').textContent = '0';
            return;
        }

        const total = this.notificaciones.length;
        const leidas = this.notificaciones.filter(n => n.estadoNotificacion === 'leido').length;
        const noLeidas = this.notificaciones.filter(n => n.estadoNotificacion === 'no_leido').length;
        
        const hoy = new Date();
        const hoyString = hoy.toISOString().split('T')[0];
        const paraHoy = this.notificaciones.filter(n => {
            if (!n.fechaUtilizacion) return false;
            const fechaNotif = new Date(n.fechaUtilizacion).toISOString().split('T')[0];
            return fechaNotif === hoyString;
        }).length;

        document.getElementById('totalNotificaciones').textContent = total;
        document.getElementById('notificacionesLeidas').textContent = leidas;
        document.getElementById('notificacionesNoLeidas').textContent = noLeidas;
        document.getElementById('notificacionesHoy').textContent = paraHoy;
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
            document.getElementById('fechaUtilizacion').value = hoy;
            
            // Resetear contador de caracteres
            document.getElementById('charCount').textContent = '0';
        }

        modal.style.display = 'block';
    }

    populateForm(notificacion) {
        document.getElementById('idInquilino').value = notificacion.inquilino ? notificacion.inquilino.idUsuario : '';
        document.getElementById('idContrato').value = notificacion.idContrato || '';
        document.getElementById('fechaUtilizacion').value = notificacion.fechaUtilizacion || '';
        document.getElementById('tipoNotificacion').value = notificacion.tipoNotificacion || '';
        document.getElementById('detalles').value = notificacion.detalles || '';
        
        // Actualizar contador de caracteres
        this.actualizarContadorCaracteres();
    }

    async guardarNotificacion(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardar');
            
            const formData = new FormData(e.target);
            
            const idInquilino = formData.get('idInquilino');
            const idContrato = formData.get('idContrato');
            const fechaUtilizacion = formData.get('fechaUtilizacion');
            const tipoNotificacion = formData.get('tipoNotificacion');
            const detalles = formData.get('detalles');

            // Validaciones
            if (!idInquilino) {
                throw new Error('Debe seleccionar un inquilino');
            }

            if (!idContrato) {
                throw new Error('Debe seleccionar un contrato');
            }

            if (!fechaUtilizacion) {
                throw new Error('La fecha de utilización es requerida');
            }

            if (!tipoNotificacion) {
                throw new Error('El tipo de notificación es requerido');
            }

            // Validar que el inquilino seleccionado sea realmente un inquilino (rol ID 2)
            const inquilinoSeleccionado = this.inquilinos.find(i => i.idUsuario == idInquilino);
            if (!inquilinoSeleccionado) {
                throw new Error('El usuario seleccionado no es un inquilino válido');
            }

            // Preparar datos de la notificación según la estructura EXACTA que espera la API
            const notificacionData = {
                inquilino: {
                    idUsuario: parseInt(idInquilino)
                },
                idContrato: parseInt(idContrato),
                fechaUtilizacion: fechaUtilizacion,
                tipoNotificacion: tipoNotificacion,
                detalles: detalles || ''
            };

            console.log('Enviando datos:', notificacionData);

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
                    errorMessage = errorData.error || errorData.message || errorData;
                } catch {
                    errorMessage = errorText || 'Error al guardar la notificación';
                }
                
                throw new Error(errorMessage);
            }

            await this.loadNotificaciones();
            this.showSuccess(`Notificación ${this.currentNotificacion ? 'actualizada' : 'creada'} correctamente`);
            this.hideModals();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnGuardar');
        }
    }

    async marcarComoLeida(id) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.API_BASE}/notificaciones/${id}/leer`, {
                method: 'PATCH'
            });

            if (!response.ok) {
                throw new Error('Error al marcar como leída');
            }

            await this.loadNotificaciones();
            this.showSuccess('Notificación marcada como leída');
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al marcar como leída: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    verNotificacion(id) {
        const notificacion = this.notificaciones.find(n => n.idNotificacion === id);
        if (notificacion) {
            const detalles = `
ID: N-${notificacion.idNotificacion.toString().padStart(3, '0')}
Inquilino: ${notificacion.inquilino?.username || 'General'}
Email: ${notificacion.inquilino?.email || 'N/A'}
Contrato: ${notificacion.idContrato ? 'C-' + notificacion.idContrato.toString().padStart(3, '0') : 'General'}
Fecha Utilización: ${this.formatDate(notificacion.fechaUtilizacion)}
Tipo: ${this.getTypeText(notificacion.tipoNotificacion)}
Estado: ${notificacion.estadoNotificacion === 'leido' ? 'Leído' : 'No Leído'}
Creada: ${this.formatDateTime(notificacion.createdAt)}

${notificacion.detalles ? 'Descripción:\n' + notificacion.detalles : 'Sin descripción'}
            `;
            
            alert(detalles);
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
                await this.loadNotificaciones();
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
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    actualizarContadorCaracteres() {
        const textarea = document.getElementById('detalles');
        const charCount = document.getElementById('charCount');
        if (textarea && charCount) {
            const length = textarea.value.length;
            charCount.textContent = length;
            
            // Cambiar color si se acerca al límite
            if (length > 900) {
                charCount.style.color = '#f44336';
            } else if (length > 800) {
                charCount.style.color = '#ff9800';
            } else {
                charCount.style.color = '';
            }
        }
    }

    showLoading(show, buttonId = null) {
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (show) {
                button.disabled = true;
                const originalText = button.textContent;
                button.dataset.originalText = originalText;
                button.innerHTML = '<span class="spinner"></span> Procesando...';
            } else {
                button.disabled = false;
                const originalText = button.dataset.originalText;
                if (originalText) {
                    button.textContent = originalText;
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
        // Eliminar notificaciones anteriores
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        });

        // Crear nueva notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto-remover después de 3 segundos
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