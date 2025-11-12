//contratos.js
class ContratosManager {
    constructor() {
        this.contratos = [];
        this.inquilinos = [];
        this.cuartos = [];
        this.currentContrato = null;
        this.currentAction = null;
        this.API_BASE = 'http://localhost:8000/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadContratos();
        this.loadInquilinos();
        this.loadCuartos();
    }

    bindEvents() {
        // Botones principales
        document.getElementById('btnNuevoContrato').addEventListener('click', () => this.showModal());
        document.getElementById('btnExportar').addEventListener('click', () => this.exportarContratos());
        
        // Modal events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideModals());
        });
        
        document.getElementById('btnCancelar').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCancelarAccion').addEventListener('click', () => this.hideModals());
        
        // Form events
        document.getElementById('contratoForm').addEventListener('submit', (e) => this.guardarContrato(e));
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.buscarContratos(e.target.value));
        
        // Confirmación
        document.getElementById('btnConfirmarAccion').addEventListener('click', () => this.confirmarAccion());
        
        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });
    }

    async loadContratos() {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.API_BASE}/contratos`);
            
            if (!response.ok) {
                throw new Error('Error al cargar contratos');
            }
            
            this.contratos = await response.json();
            this.renderContratos();
            this.updateStats();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los contratos: ' + error.message);
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

    async loadCuartos() {
        try {
            const response = await fetch(`${this.API_BASE}/cuartos`);
            
            if (!response.ok) {
                throw new Error('Error al cargar cuartos');
            }
            
            this.cuartos = await response.json();
            this.populateSelect('idCuarto', this.cuartos, 'nombreCuarto');
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los cuartos');
        }
    }

    populateSelect(selectId, data, labelField) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Seleccionar...</option>';
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.idInquilino || item.idCuarto;
            option.textContent = item[labelField];
            select.appendChild(option);
        });
    }

    renderContratos(contratos = this.contratos) {
        const tbody = document.getElementById('contratosTableBody');
        
        if (contratos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px;">
                        <i class="fas fa-file-contract" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                        <p>No se encontraron contratos</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = contratos.map(contrato => `
            <tr>
                <td>C-${contrato.idContrato.toString().padStart(3, '0')}</td>
                <td>${contrato.inquilino ? contrato.inquilino.nombreInquilino : 'N/A'}</td>
                <td>${contrato.cuarto ? contrato.cuarto.nombreCuarto : 'N/A'}</td>
                <td>${this.formatDate(contrato.fechaInicio)}</td>
                <td>${contrato.fechaFinalizacion ? this.formatDate(contrato.fechaFinalizacion) : 'Indefinido'}</td>
                <td>$${contrato.montoRentaAcordada ? contrato.montoRentaAcordada.toFixed(2) : '0.00'}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(contrato.estadoContrato)}">
                        ${this.getStatusText(contrato.estadoContrato)}
                    </span>
                </td>
                <td class="table-actions-cell">
                    <button class="btn-action btn-edit" onclick="contratosManager.editarContrato(${contrato.idContrato})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-action btn-delete" onclick="contratosManager.eliminarContrato(${contrato.idContrato})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getStatusClass(status) {
        const statusMap = {
            'ACTIVO': 'status-active',
            'INACTIVO': 'status-inactive',
            'PENDIENTE': 'status-pending',
            'FINALIZADO': 'status-inactive'
        };
        return statusMap[status] || 'status-pending';
    }

    getStatusText(status) {
        const statusMap = {
            'ACTIVO': 'Activo',
            'INACTIVO': 'Inactivo',
            'PENDIENTE': 'Pendiente',
            'FINALIZADO': 'Finalizado'
        };
        return statusMap[status] || status;
    }

    updateStats() {
        const total = this.contratos.length;
        const activos = this.contratos.filter(c => c.estadoContrato === 'ACTIVO').length;
        const porVencer = this.contratos.filter(c => this.isPorVencer(c)).length;
        const expirados = this.contratos.filter(c => this.isExpirado(c)).length;

        document.getElementById('totalContratos').textContent = total;
        document.getElementById('contratosActivos').textContent = activos;
        document.getElementById('contratosPorVencer').textContent = porVencer;
        document.getElementById('contratosExpirados').textContent = expirados;
    }

    isPorVencer(contrato) {
        if (!contrato.fechaFinalizacion) return false;
        const hoy = new Date();
        const fechaFin = new Date(contrato.fechaFinalizacion);
        const diffTime = fechaFin - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays > 0;
    }

    isExpirado(contrato) {
        if (!contrato.fechaFinalizacion) return false;
        const hoy = new Date();
        const fechaFin = new Date(contrato.fechaFinalizacion);
        return fechaFin < hoy;
    }

    buscarContratos(termino) {
        if (!termino) {
            this.renderContratos();
            return;
        }

        const contratosFiltrados = this.contratos.filter(contrato => {
            const searchText = termino.toLowerCase();
            return (
                contrato.idContrato.toString().includes(searchText) ||
                (contrato.inquilino?.nombreInquilino?.toLowerCase().includes(searchText)) ||
                (contrato.cuarto?.nombreCuarto?.toLowerCase().includes(searchText)) ||
                contrato.estadoContrato?.toLowerCase().includes(searchText)
            );
        });

        this.renderContratos(contratosFiltrados);
    }

    showModal(contrato = null) {
        this.currentContrato = contrato;
        const modal = document.getElementById('modalContrato');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('contratoForm');

        if (contrato) {
            title.textContent = 'Editar Contrato';
            this.populateForm(contrato);
        } else {
            title.textContent = 'Nuevo Contrato';
            form.reset();
            // Establecer fecha mínima como hoy para nuevo contrato
            const hoy = new Date().toISOString().split('T')[0];
            document.getElementById('fechaInicio').min = hoy;
        }

        modal.style.display = 'block';
    }

    populateForm(contrato) {
        document.getElementById('idInquilino').value = contrato.idInquilino;
        document.getElementById('idCuarto').value = contrato.idCuarto;
        document.getElementById('fechaInicio').value = contrato.fechaInicio;
        document.getElementById('fechaFinalizacion').value = contrato.fechaFinalizacion || '';
        document.getElementById('fechaPagoEstablecida').value = contrato.fechaPagoEstablecida || '';
        document.getElementById('montoRentaAcordada').value = contrato.montoRentaAcordada || '';
        document.getElementById('estadoContrato').value = contrato.estadoContrato || 'ACTIVO';
    }

    async guardarContrato(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardar');
            
            const formData = new FormData(e.target);
            
            // CORRECCIÓN: Asegurar que el estado del contrato esté en mayúsculas
            const estadoContrato = formData.get('estadoContrato').toUpperCase();
            
            const contratoData = {
                idCuarto: parseInt(formData.get('idCuarto')),
                idInquilino: parseInt(formData.get('idInquilino')),
                fechaInicio: formData.get('fechaInicio'),
                fechaFinalizacion: formData.get('fechaFinalizacion') || null,
                fechaPagoEstablecida: formData.get('fechaPagoEstablecida') || null,
                estadoContrato: estadoContrato, // Usar la versión en mayúsculas
                montoRentaAcordada: parseFloat(formData.get('montoRentaAcordada'))
            };

            console.log('Enviando datos:', contratoData); // Para debug

            let response;
            if (this.currentContrato) {
                // Actualizar contrato existente
                response = await fetch(`${this.API_BASE}/contratos/${this.currentContrato.idContrato}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(contratoData)
                });
            } else {
                // Crear nuevo contrato
                response = await fetch(`${this.API_BASE}/contratos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(contratoData)
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Error al guardar el contrato';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData;
                } catch {
                    errorMessage = errorText || 'Error al guardar el contrato';
                }
                
                throw new Error(errorMessage);
            }

            const savedContrato = await response.json();
            this.showSuccess(`Contrato ${this.currentContrato ? 'actualizado' : 'creado'} correctamente`);
            this.hideModals();
            this.loadContratos();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnGuardar');
        }
    }

    editarContrato(id) {
        const contrato = this.contratos.find(c => c.idContrato === id);
        if (contrato) {
            this.showModal(contrato);
        }
    }

    eliminarContrato(id) {
        const contrato = this.contratos.find(c => c.idContrato === id);
        if (contrato) {
            this.currentContrato = contrato;
            const mensaje = `¿Estás seguro de eliminar el contrato C-${contrato.idContrato.toString().padStart(3, '0')}?`;
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
            
            if (this.currentAction === 'eliminar' && this.currentContrato) {
                const response = await fetch(`${this.API_BASE}/contratos/${this.currentContrato.idContrato}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al eliminar el contrato');
                }

                this.showSuccess('Contrato eliminado correctamente');
                this.hideModals();
                this.loadContratos();
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al eliminar el contrato: ' + error.message);
        } finally {
            this.showLoading(false, 'btnConfirmarAccion');
        }
    }

    exportarContratos() {
        // Simulación de exportación
        this.showSuccess('Exportación iniciada...');
        // En una implementación real, aquí se generaría el PDF o Excel
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.currentContrato = null;
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
                    button.textContent = this.currentContrato ? 'Actualizar Contrato' : 'Guardar Contrato';
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
    window.contratosManager = new ContratosManager();
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