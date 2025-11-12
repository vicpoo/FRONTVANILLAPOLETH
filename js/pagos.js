class PagosManager {
    constructor() {
        this.pagos = [];
        this.contratos = [];
        this.currentPago = null;
        this.currentAction = null;
        this.API_BASE = 'http://localhost:8000/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPagos();
        this.loadContratos();
    }

    bindEvents() {
        // Botones principales
        document.getElementById('btnNuevoPago').addEventListener('click', () => this.showModal());
        document.getElementById('btnExportar').addEventListener('click', () => this.exportarPagos());
        
        // Modal events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideModals());
        });
        
        document.getElementById('btnCancelar').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCancelarAccion').addEventListener('click', () => this.hideModals());
        
        // Form events
        document.getElementById('pagoForm').addEventListener('submit', (e) => this.guardarPago(e));
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.buscarPagos(e.target.value));
        
        // Confirmación
        document.getElementById('btnConfirmarAccion').addEventListener('click', () => this.confirmarAccion());
        
        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });
    }

    async loadPagos() {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.API_BASE}/pagos`);
            
            if (!response.ok) {
                throw new Error('Error al cargar pagos');
            }
            
            this.pagos = await response.json();
            this.renderPagos();
            this.updateStats();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los pagos: ' + error.message);
        } finally {
            this.showLoading(false);
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

    populateContratosSelect() {
        const select = document.getElementById('idContrato');
        select.innerHTML = '<option value="">Seleccionar contrato...</option>';
        
        this.contratos.forEach(contrato => {
            // Filtrar solo contratos activos
            if (contrato.estadoContrato === 'ACTIVO') {
                const option = document.createElement('option');
                option.value = contrato.idContrato;
                option.textContent = `C-${contrato.idContrato.toString().padStart(3, '0')} - ${contrato.inquilino?.nombreInquilino || 'N/A'}`;
                select.appendChild(option);
            }
        });
    }

    renderPagos(pagos = this.pagos) {
        const tbody = document.getElementById('pagosTableBody');
        
        if (pagos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-money-bill-wave" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                        <p>No se encontraron pagos</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = pagos.map(pago => `
            <tr>
                <td>P-${pago.idPago.toString().padStart(3, '0')}</td>
                <td>C-${pago.idContrato.toString().padStart(3, '0')}</td>
                <td>${this.formatDate(pago.fechaPago)}</td>
                <td>${pago.concepto || 'Pago de renta'}</td>
                <td>$${pago.montoPagado ? pago.montoPagado.toFixed(2) : '0.00'}</td>
                <td>
                    <span class="status-badge status-completed">
                        Completado
                    </span>
                </td>
                <td class="table-actions-cell">
                    <button class="btn-action btn-edit" onclick="pagosManager.editarPago(${pago.idPago})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-action btn-delete" onclick="pagosManager.eliminarPago(${pago.idPago})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateStats() {
        const total = this.pagos.length;
        
        // Pagos este mes
        const hoy = new Date();
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const pagosEsteMes = this.pagos.filter(pago => {
            const fechaPago = new Date(pago.fechaPago);
            return fechaPago >= primerDiaMes && fechaPago <= hoy;
        }).length;

        // Ingresos totales
        const ingresosTotales = this.pagos.reduce((total, pago) => {
            return total + (pago.montoPagado || 0);
        }, 0);

        document.getElementById('totalPagos').textContent = total;
        document.getElementById('pagosEsteMes').textContent = pagosEsteMes;
        document.getElementById('pagosPendientes').textContent = 0; // Por implementar según lógica de negocio
        document.getElementById('ingresosTotales').textContent = `$${ingresosTotales.toFixed(2)}`;
    }

    buscarPagos(termino) {
        if (!termino) {
            this.renderPagos();
            return;
        }

        const pagosFiltrados = this.pagos.filter(pago => {
            const searchText = termino.toLowerCase();
            return (
                pago.idPago.toString().includes(searchText) ||
                pago.idContrato.toString().includes(searchText) ||
                (pago.concepto?.toLowerCase().includes(searchText)) ||
                pago.montoPagado?.toString().includes(searchText)
            );
        });

        this.renderPagos(pagosFiltrados);
    }

    showModal(pago = null) {
        this.currentPago = pago;
        const modal = document.getElementById('modalPago');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('pagoForm');

        if (pago) {
            title.textContent = 'Editar Pago';
            this.populateForm(pago);
        } else {
            title.textContent = 'Nuevo Pago';
            form.reset();
            // Establecer fecha por defecto como hoy
            const hoy = new Date().toISOString().split('T')[0];
            document.getElementById('fechaPago').value = hoy;
        }

        modal.style.display = 'block';
    }

    populateForm(pago) {
        document.getElementById('idContrato').value = pago.idContrato;
        document.getElementById('fechaPago').value = pago.fechaPago;
        document.getElementById('concepto').value = pago.concepto || '';
        document.getElementById('montoPagado').value = pago.montoPagado || '';
    }

    async guardarPago(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardar');
            
            const formData = new FormData(e.target);
            
            const pagoData = {
                idContrato: parseInt(formData.get('idContrato')),
                fechaPago: formData.get('fechaPago'),
                concepto: formData.get('concepto') || null,
                montoPagado: parseFloat(formData.get('montoPagado'))
            };

            console.log('Enviando datos:', pagoData); // Para debug

            let response;
            if (this.currentPago) {
                // Actualizar pago existente
                response = await fetch(`${this.API_BASE}/pagos/${this.currentPago.idPago}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(pagoData)
                });
            } else {
                // Crear nuevo pago
                response = await fetch(`${this.API_BASE}/pagos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(pagoData)
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Error al guardar el pago';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData;
                } catch {
                    errorMessage = errorText || 'Error al guardar el pago';
                }
                
                throw new Error(errorMessage);
            }

            const savedPago = await response.json();
            this.showSuccess(`Pago ${this.currentPago ? 'actualizado' : 'registrado'} correctamente`);
            this.hideModals();
            this.loadPagos();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnGuardar');
        }
    }

    editarPago(id) {
        const pago = this.pagos.find(p => p.idPago === id);
        if (pago) {
            this.showModal(pago);
        }
    }

    eliminarPago(id) {
        const pago = this.pagos.find(p => p.idPago === id);
        if (pago) {
            this.currentPago = pago;
            const mensaje = `¿Estás seguro de eliminar el pago P-${pago.idPago.toString().padStart(3, '0')}?`;
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
            
            if (this.currentAction === 'eliminar' && this.currentPago) {
                const response = await fetch(`${this.API_BASE}/pagos/${this.currentPago.idPago}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al eliminar el pago');
                }

                this.showSuccess('Pago eliminado correctamente');
                this.hideModals();
                this.loadPagos();
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al eliminar el pago: ' + error.message);
        } finally {
            this.showLoading(false, 'btnConfirmarAccion');
        }
    }

    exportarPagos() {
        // Simulación de exportación
        this.showSuccess('Exportación iniciada...');
        // En una implementación real, aquí se generaría el PDF o Excel
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.currentPago = null;
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
                    button.textContent = this.currentPago ? 'Actualizar Pago' : 'Registrar Pago';
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
    window.pagosManager = new PagosManager();
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