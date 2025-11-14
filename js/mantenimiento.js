// mantenimiento.js
class MantenimientoManager {
    constructor() {
        this.mantenimientos = [];
        this.cuartos = [];
        this.currentMantenimiento = null;
        this.currentAction = null;
        this.API_BASE = 'http://localhost:8000/api';
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadCuartos();
        await this.loadMantenimientos();
        this.updateStats();
    }

    async loadCuartos() {
        try {
            const response = await fetch(`${this.API_BASE}/cuartos`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.cuartos = Array.isArray(data) ? data : [];
            this.renderCuartosSelect();
        } catch (error) {
            console.error('Error cargando cuartos:', error);
            this.cuartos = [];
            this.showError('Error al cargar los cuartos: ' + error.message);
        }
    }

    renderCuartosSelect() {
        const select = document.getElementById('cuartoMantenimiento');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar cuarto...</option>';
        
        this.cuartos.forEach(cuarto => {
            const option = document.createElement('option');
            option.value = cuarto.idCuarto;
            option.textContent = `${cuarto.nombreCuarto} (${cuarto.estadoCuarto || 'Disponible'})`;
            select.appendChild(option);
        });
    }

    bindEvents() {
        // Botones principales
        document.getElementById('btnNuevoMantenimiento').addEventListener('click', () => this.showModalMantenimiento());
        
        // Modal events - Cerrar modales
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideModals());
        });
        
        document.getElementById('btnCancelarMantenimiento').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCancelarAtender').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCerrarDetalles').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCancelarAccion').addEventListener('click', () => this.hideModals());
        
        // Form events
        document.getElementById('mantenimientoForm').addEventListener('submit', (e) => this.guardarMantenimiento(e));
        document.getElementById('atenderMantenimientoForm').addEventListener('submit', (e) => this.atenderMantenimiento(e));
        
        // Search y filtros
        document.getElementById('searchMantenimientosInput').addEventListener('input', (e) => this.buscarMantenimientos(e.target.value));
        document.getElementById('btnAplicarFiltros').addEventListener('click', () => this.aplicarFiltros());
        document.getElementById('btnLimpiarFiltros').addEventListener('click', () => this.limpiarFiltros());
        
        // Confirmación
        document.getElementById('btnConfirmarAccion').addEventListener('click', () => this.confirmarAccion());
        
        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });
    }

    // ==================== MANTENIMIENTOS ====================
    async loadMantenimientos() {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.API_BASE}/mantenimientos`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.mantenimientos = Array.isArray(data) ? data : [];
            this.renderMantenimientos();
            this.updateStats();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los mantenimientos: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    renderMantenimientos(mantenimientos = this.mantenimientos) {
        const tbody = document.getElementById('mantenimientosTableBody');
        
        if (mantenimientos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px;">
                        <i class="fas fa-tools" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                        <p>No se encontraron mantenimientos</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = mantenimientos.map(mantenimiento => {
            const cuarto = this.cuartos.find(c => c.idCuarto === mantenimiento.idCuarto);
            const nombreCuarto = cuarto ? cuarto.nombreCuarto : 'Desconocido';
            
            return `
                <tr>
                    <td>${mantenimiento.idMantenimiento}</td>
                    <td>${this.escapeHtml(nombreCuarto)}</td>
                    <td>${this.formatDate(mantenimiento.fechaReporte)}</td>
                    <td>${mantenimiento.descripcionProblema ? (this.escapeHtml(mantenimiento.descripcionProblema).substring(0, 50) + '...') : 'Sin descripción'}</td>
                    <td>
                        <span class="status-badge ${this.getStatusClass(mantenimiento.estadoMantenimiento)}">
                            ${mantenimiento.estadoMantenimiento || 'Pendiente'}
                        </span>
                    </td>
                    <td>
                        <span class="priority-badge ${this.getPriorityClass(mantenimiento.estadoMantenimiento)}">
                            ${this.getPriorityText(mantenimiento.estadoMantenimiento)}
                        </span>
                    </td>
                    <td>${mantenimiento.fechaAtencion ? this.formatDate(mantenimiento.fechaAtencion) : 'No atendido'}</td>
                    <td>${mantenimiento.costoMantenimiento ? `$${parseFloat(mantenimiento.costoMantenimiento).toFixed(2)}` : '$0.00'}</td>
                    <td class="table-actions-cell">
                        <button class="btn-action btn-info" onclick="mantenimientoManager.verDetalles(${mantenimiento.idMantenimiento})">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        ${!mantenimiento.fechaAtencion ? `
                            <button class="btn-action btn-complete" onclick="mantenimientoManager.atender(${mantenimiento.idMantenimiento})">
                                <i class="fas fa-check"></i> Atender
                            </button>
                        ` : ''}
                        <button class="btn-action btn-edit" onclick="mantenimientoManager.editarMantenimiento(${mantenimiento.idMantenimiento})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-action btn-delete" onclick="mantenimientoManager.eliminarMantenimiento(${mantenimiento.idMantenimiento})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showModalMantenimiento(mantenimiento = null) {
        // Verificar que tenemos cuartos antes de mostrar el modal
        if (this.cuartos.length === 0) {
            this.showError('No hay cuartos registrados. Por favor, crea un cuarto primero.');
            return;
        }

        this.currentMantenimiento = mantenimiento;
        const modal = document.getElementById('modalMantenimiento');
        const title = document.getElementById('modalMantenimientoTitle');
        const form = document.getElementById('mantenimientoForm');

        if (mantenimiento) {
            title.textContent = 'Editar Mantenimiento';
            this.populateMantenimientoForm(mantenimiento);
        } else {
            title.textContent = 'Nuevo Mantenimiento';
            form.reset();
            // Establecer fecha actual por defecto
            document.getElementById('fechaReporte').value = new Date().toISOString().split('T')[0];
        }

        modal.style.display = 'block';
    }

    populateMantenimientoForm(mantenimiento) {
        document.getElementById('cuartoMantenimiento').value = mantenimiento.idCuarto || '';
        document.getElementById('fechaReporte').value = mantenimiento.fechaReporte || '';
        document.getElementById('prioridadMantenimiento').value = mantenimiento.estadoMantenimiento || 'Pendiente';
        document.getElementById('descripcionProblema').value = mantenimiento.descripcionProblema || '';
        document.getElementById('fechaAtencion').value = mantenimiento.fechaAtencion || '';
        document.getElementById('costoMantenimiento').value = mantenimiento.costoMantenimiento || '';
    }

    async guardarMantenimiento(e) {
        e.preventDefault();
        
        // Verificar que tenemos cuartos
        if (this.cuartos.length === 0) {
            this.showError('No hay cuartos registrados. No se puede guardar el mantenimiento.');
            return;
        }
        
        try {
            this.showLoading(true, 'btnGuardarMantenimiento');
            
            const formData = new FormData(e.target);
            const idCuarto = parseInt(formData.get('idCuarto'));
            
            if (!idCuarto) {
                throw new Error('Debe seleccionar un cuarto');
            }

            const mantenimientoData = {
                idCuarto: idCuarto,
                fechaReporte: formData.get('fechaReporte'),
                descripcionProblema: formData.get('descripcionProblema').trim(),
                estadoMantenimiento: formData.get('estadoMantenimiento') || 'Pendiente',
                fechaAtencion: formData.get('fechaAtencion') || null,
                costoMantenimiento: formData.get('costoMantenimiento') ? parseFloat(formData.get('costoMantenimiento')) : null
            };

            // Validaciones adicionales
            if (!mantenimientoData.fechaReporte) {
                throw new Error('La fecha de reporte es requerida');
            }

            if (!mantenimientoData.descripcionProblema) {
                throw new Error('La descripción del problema es requerida');
            }

            let url = `${this.API_BASE}/mantenimientos`;
            let method = 'POST';

            if (this.currentMantenimiento) {
                url = `${this.API_BASE}/mantenimientos/${this.currentMantenimiento.idMantenimiento}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mantenimientoData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al guardar el mantenimiento');
            }

            const responseData = await response.json();

            this.showSuccess(`Mantenimiento ${this.currentMantenimiento ? 'actualizado' : 'creado'} correctamente`);
            this.hideModals();
            await this.loadMantenimientos();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnGuardarMantenimiento');
        }
    }

    editarMantenimiento(id) {
        const mantenimiento = this.mantenimientos.find(m => m.idMantenimiento === id);
        if (mantenimiento) {
            this.showModalMantenimiento(mantenimiento);
        }
    }

    eliminarMantenimiento(id) {
        const mantenimiento = this.mantenimientos.find(m => m.idMantenimiento === id);
        if (mantenimiento) {
            this.currentMantenimiento = mantenimiento;
            const mensaje = `¿Estás seguro de eliminar el mantenimiento del cuarto ID: ${mantenimiento.idCuarto}?`;
            this.showConfirmModal(mensaje, 'eliminarMantenimiento');
        }
    }

    atender(id) {
        const mantenimiento = this.mantenimientos.find(m => m.idMantenimiento === id);
        if (mantenimiento) {
            this.currentMantenimiento = mantenimiento;
            const modal = document.getElementById('modalAtenderMantenimiento');
            const form = document.getElementById('atenderMantenimientoForm');
            
            form.reset();
            // Establecer fecha actual por defecto
            document.getElementById('atenderFechaAtencion').value = new Date().toISOString().split('T')[0];
            
            modal.style.display = 'block';
        }
    }

    async atenderMantenimiento(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardarAtender');
            
            const formData = new FormData(e.target);
            
            const atencionData = {
                fechaAtencion: formData.get('fechaAtencion'),
                costo: parseFloat(formData.get('costo')),
                estado: formData.get('estado')
            };

            // Validaciones
            if (!atencionData.fechaAtencion) {
                throw new Error('La fecha de atención es requerida');
            }

            if (isNaN(atencionData.costo) || atencionData.costo < 0) {
                throw new Error('El costo debe ser un número positivo');
            }

            const response = await fetch(`${this.API_BASE}/mantenimientos/${this.currentMantenimiento.idMantenimiento}/atender`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(atencionData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al atender el mantenimiento');
            }

            const responseData = await response.json();

            this.showSuccess('Mantenimiento atendido correctamente');
            this.hideModals();
            await this.loadMantenimientos();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnGuardarAtender');
        }
    }

    verDetalles(id) {
        const mantenimiento = this.mantenimientos.find(m => m.idMantenimiento === id);
        if (mantenimiento) {
            const cuarto = this.cuartos.find(c => c.idCuarto === mantenimiento.idCuarto);
            const nombreCuarto = cuarto ? cuarto.nombreCuarto : 'Desconocido';
            
            document.getElementById('detalleId').textContent = mantenimiento.idMantenimiento;
            document.getElementById('detalleCuarto').textContent = nombreCuarto;
            document.getElementById('detalleFechaReporte').textContent = this.formatDate(mantenimiento.fechaReporte);
            document.getElementById('detalleDescripcion').textContent = mantenimiento.descripcionProblema || 'Sin descripción';
            document.getElementById('detalleEstado').textContent = mantenimiento.estadoMantenimiento || 'Pendiente';
            document.getElementById('detalleFechaAtencion').textContent = mantenimiento.fechaAtencion ? this.formatDate(mantenimiento.fechaAtencion) : 'No atendido';
            document.getElementById('detalleCosto').textContent = mantenimiento.costoMantenimiento ? `$${parseFloat(mantenimiento.costoMantenimiento).toFixed(2)}` : '$0.00';
            
            document.getElementById('modalDetallesMantenimiento').style.display = 'block';
        }
    }

    buscarMantenimientos(termino) {
        if (!termino) {
            this.renderMantenimientos();
            return;
        }

        const mantenimientosFiltrados = this.mantenimientos.filter(mantenimiento => {
            const searchText = termino.toLowerCase();
            const cuarto = this.cuartos.find(c => c.idCuarto === mantenimiento.idCuarto);
            const nombreCuarto = cuarto ? cuarto.nombreCuarto.toLowerCase() : '';
            
            return (
                nombreCuarto.includes(searchText) ||
                (mantenimiento.descripcionProblema && mantenimiento.descripcionProblema.toLowerCase().includes(searchText)) ||
                (mantenimiento.estadoMantenimiento && mantenimiento.estadoMantenimiento.toLowerCase().includes(searchText))
            );
        });

        this.renderMantenimientos(mantenimientosFiltrados);
    }

    aplicarFiltros() {
        const estado = document.getElementById('filtroEstado').value;
        const prioridad = document.getElementById('filtroPrioridad').value;
        const fechaInicio = document.getElementById('filtroFechaInicio').value;
        const fechaFin = document.getElementById('filtroFechaFin').value;

        let mantenimientosFiltrados = this.mantenimientos;

        if (estado) {
            mantenimientosFiltrados = mantenimientosFiltrados.filter(m => 
                m.estadoMantenimiento === estado
            );
        }

        if (prioridad) {
            mantenimientosFiltrados = mantenimientosFiltrados.filter(m => 
                this.getPriorityText(m.estadoMantenimiento) === prioridad
            );
        }

        if (fechaInicio) {
            mantenimientosFiltrados = mantenimientosFiltrados.filter(m => 
                m.fechaReporte >= fechaInicio
            );
        }

        if (fechaFin) {
            mantenimientosFiltrados = mantenimientosFiltrados.filter(m => 
                m.fechaReporte <= fechaFin
            );
        }

        this.renderMantenimientos(mantenimientosFiltrados);
    }

    limpiarFiltros() {
        document.getElementById('filtroEstado').value = '';
        document.getElementById('filtroPrioridad').value = '';
        document.getElementById('filtroFechaInicio').value = '';
        document.getElementById('filtroFechaFin').value = '';
        this.renderMantenimientos();
    }

    // ==================== UTILIDADES ====================
    getStatusClass(status) {
        if (!status) return 'status-pendiente';
        
        const statusMap = {
            'Pendiente': 'status-pendiente',
            'En Proceso': 'status-en-proceso',
            'Completado': 'status-completado',
            'Cancelado': 'status-cancelado',
            'Alta': 'status-pendiente',
            'Media': 'status-pendiente',
            'Baja': 'status-pendiente'
        };
        return statusMap[status] || 'status-pendiente';
    }

    getPriorityClass(status) {
        if (!status) return 'priority-media';
        
        const priorityMap = {
            'Alta': 'priority-alta',
            'Media': 'priority-media',
            'Baja': 'priority-baja',
            'Pendiente': 'priority-media',
            'En Proceso': 'priority-media',
            'Completado': 'priority-baja',
            'Cancelado': 'priority-baja'
        };
        return priorityMap[status] || 'priority-media';
    }

    getPriorityText(status) {
        if (!status) return 'Media';
        
        const priorityMap = {
            'Alta': 'Alta',
            'Media': 'Media',
            'Baja': 'Baja',
            'Pendiente': 'Media',
            'En Proceso': 'Media',
            'Completado': 'Baja',
            'Cancelado': 'Baja'
        };
        return priorityMap[status] || 'Media';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }

    updateStats() {
        const totalMantenimientos = this.mantenimientos.length;
        const mantenimientosPendientes = this.mantenimientos.filter(m => 
            !m.fechaAtencion || m.estadoMantenimiento === 'Pendiente'
        ).length;
        const mantenimientosEnProceso = this.mantenimientos.filter(m => 
            m.estadoMantenimiento === 'En Proceso'
        ).length;
        const mantenimientosCompletados = this.mantenimientos.filter(m => 
            m.estadoMantenimiento === 'Completado'
        ).length;
        
        const costoTotal = this.mantenimientos.reduce((total, m) => {
            return total + (m.costoMantenimiento ? parseFloat(m.costoMantenimiento) : 0);
        }, 0);

        document.getElementById('totalMantenimientos').textContent = totalMantenimientos;
        document.getElementById('mantenimientosPendientes').textContent = mantenimientosPendientes;
        document.getElementById('mantenimientosEnProceso').textContent = mantenimientosEnProceso;
        document.getElementById('mantenimientosCompletados').textContent = mantenimientosCompletados;
        document.getElementById('costoTotal').textContent = `$${costoTotal.toFixed(2)}`;
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
            
            if (this.currentAction === 'eliminarMantenimiento' && this.currentMantenimiento) {
                const response = await fetch(`${this.API_BASE}/mantenimientos/${this.currentMantenimiento.idMantenimiento}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al eliminar el mantenimiento');
                }

                this.showSuccess('Mantenimiento eliminado correctamente');
                this.hideModals();
                await this.loadMantenimientos();
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnConfirmarAccion');
        }
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.currentMantenimiento = null;
        this.currentAction = null;
    }

    showLoading(show, buttonId = null) {
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (show) {
                button.disabled = true;
                button.innerHTML = '<span class="spinner"></span> Procesando...';
            } else {
                button.disabled = false;
                if (buttonId === 'btnGuardarMantenimiento') {
                    button.textContent = this.currentMantenimiento ? 'Actualizar Mantenimiento' : 'Guardar Mantenimiento';
                } else if (buttonId === 'btnGuardarAtender') {
                    button.textContent = 'Guardar Atención';
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
        // Eliminar notificaciones existentes
        document.querySelectorAll('.notification').forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
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
        }, 4000);
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.mantenimientoManager = new MantenimientoManager();
});