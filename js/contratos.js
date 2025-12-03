// contratos.js - VERSIÓN CORREGIDA
class ContratosManager {
    constructor() {
        this.contratos = [];
        this.inquilinos = [];
        this.cuartos = [];
        this.currentContrato = null;
        this.currentAction = null;
        this.API_BASE = 'http://localhost:8000/api';
        this.token = localStorage.getItem('authToken');
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadInquilinos();
        await this.loadCuartos();
        await this.loadContratos();
        this.updateStats();
    }

    async makeRequest(url, options = {}) {
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.token ? `Bearer ${this.token}` : ''
                }
            };

            const finalOptions = { 
                ...defaultOptions, 
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...(options.headers || {})
                }
            };
            
            const response = await fetch(`${this.API_BASE}${url}`, finalOptions);

            // Para respuestas vacías (DELETE, etc)
            if (response.status === 204) {
                return null;
            }

            // CORRECCIÓN CLAVE: Primero obtenemos el texto de la respuesta
            const responseText = await response.text();
            
            // Si no hay contenido, retornamos null
            if (!responseText) {
                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                return null;
            }

            // Intentamos parsear el JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Error al parsear JSON:', responseText);
                throw new Error('Respuesta del servidor no es JSON válido');
            }

            // Si la respuesta no es OK, lanzamos error con el mensaje del servidor
            if (!response.ok) {
                const errorMsg = data.message || data.error || `Error ${response.status}: ${response.statusText}`;
                throw new Error(errorMsg);
            }

            return data;

        } catch (error) {
            console.error('Error en la petición:', error);
            throw error;
        }
    }

    bindEvents() {
        const btnNuevoContrato = document.getElementById('btnNuevoContrato');
        if (btnNuevoContrato) {
            btnNuevoContrato.addEventListener('click', () => this.showModal());
        }
        
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideModals());
        });
        
        const btnCancelar = document.getElementById('btnCancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.hideModals());
        }
        
        const btnCancelarAccion = document.getElementById('btnCancelarAccion');
        if (btnCancelarAccion) {
            btnCancelarAccion.addEventListener('click', () => this.hideModals());
        }
        
        const contratoForm = document.getElementById('contratoForm');
        if (contratoForm) {
            contratoForm.addEventListener('submit', (e) => this.guardarContrato(e));
        }
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.buscarContratos(e.target.value));
        }
        
        const btnConfirmarAccion = document.getElementById('btnConfirmarAccion');
        if (btnConfirmarAccion) {
            btnConfirmarAccion.addEventListener('click', () => this.confirmarAccion());
        }
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });
    }

    async loadContratos() {
        try {
            this.showLoading(true);
            const data = await this.makeRequest('/contratos');
            
            // Asegurarnos de que data sea un array
            this.contratos = Array.isArray(data) ? data : [];
            
            console.log(`Contratos cargados: ${this.contratos.length}`);
            
            this.renderContratos();
            this.updateStats();
        } catch (error) {
            console.error('Error cargando contratos:', error);
            this.showError('Error al cargar los contratos: ' + error.message);
            this.contratos = [];
            this.renderContratos();
        } finally {
            this.showLoading(false);
        }
    }

    async loadInquilinos() {
        try {
            console.log('Cargando inquilinos (usuarios con rol ID 2)...');
            
            const usuarios = await this.makeRequest('/usuarios');
            
            if (Array.isArray(usuarios)) {
                this.inquilinos = usuarios
                    .filter(usuario => {
                        if (!usuario.rol) return false;
                        const rolId = usuario.rol.idRoles || usuario.rol.idRol || usuario.rol.id;
                        return rolId === 2;
                    })
                    .map(usuario => ({
                        idUsuario: usuario.idUsuario,
                        username: usuario.username || 'Sin nombre',
                        email: usuario.email || '',
                        estadoUsuario: usuario.estadoUsuario || 'activo',
                        rol: usuario.rol ? usuario.rol.titulo : 'Inquilino'
                    }));
                
                console.log(`Inquilinos encontrados (rol 2): ${this.inquilinos.length}`);
                
                if (this.inquilinos.length === 0) {
                    console.warn('No se encontraron usuarios con rol ID 2');
                }
            } else {
                console.warn('La respuesta de usuarios no es un array');
                this.inquilinos = [];
            }
            
            this.populateInquilinosSelect();
        } catch (error) {
            console.error('Error cargando inquilinos:', error);
            this.showError('Error al cargar inquilinos: ' + error.message);
            this.inquilinos = [];
            this.populateInquilinosSelect();
        }
    }

    async loadCuartos() {
        try {
            const data = await this.makeRequest('/cuartos');
            this.cuartos = Array.isArray(data) ? data : [];
            console.log(`Cuartos cargados: ${this.cuartos.length}`);
            this.populateCuartosSelect();
        } catch (error) {
            console.error('Error cargando cuartos:', error);
            this.showError('Error al cargar los cuartos: ' + error.message);
            this.cuartos = [];
            this.populateCuartosSelect();
        }
    }

    populateInquilinosSelect() {
        const select = document.getElementById('idInquilino');
        if (!select) {
            console.error('Elemento idInquilino no encontrado');
            return;
        }
        
        select.innerHTML = '<option value="">Seleccionar inquilino...</option>';
        
        if (this.inquilinos.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No hay usuarios con rol de inquilino disponibles";
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        
        this.inquilinos.forEach(inquilino => {
            const option = document.createElement('option');
            option.value = inquilino.idUsuario;
            option.textContent = `${inquilino.username}${inquilino.email ? ` (${inquilino.email})` : ''}`;
            select.appendChild(option);
        });
    }

    populateCuartosSelect() {
        const select = document.getElementById('idCuarto');
        if (!select) {
            console.error('Elemento idCuarto no encontrado');
            return;
        }
        
        select.innerHTML = '<option value="">Seleccionar cuarto...</option>';
        
        if (this.cuartos.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No hay cuartos disponibles";
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        
        this.cuartos.forEach(cuarto => {
            const option = document.createElement('option');
            option.value = cuarto.idCuarto;
            let cuartoInfo = cuarto.nombreCuarto || 'Sin nombre';
            
            if (cuarto.estadoCuarto) {
                cuartoInfo += ` - ${cuarto.estadoCuarto}`;
            }
            
            if (cuarto.precioAlquiler) {
                cuartoInfo += ` - $${parseFloat(cuarto.precioAlquiler).toFixed(2)}`;
            }
            
            option.textContent = cuartoInfo;
            select.appendChild(option);
        });
    }

    renderContratos(contratos = this.contratos) {
        const tbody = document.getElementById('contratosTableBody');
        if (!tbody) {
            console.error('Elemento contratosTableBody no encontrado');
            return;
        }
        
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

        tbody.innerHTML = contratos.map(contrato => {
            let nombreInquilino = 'Desconocido';
            if (contrato.inquilino) {
                nombreInquilino = contrato.inquilino.username || 'Sin nombre';
            } else {
                const inquilino = this.inquilinos.find(i => i.idUsuario === contrato.idInquilino);
                if (inquilino) {
                    nombreInquilino = inquilino.username;
                }
            }
            
            let nombreCuarto = 'Desconocido';
            if (contrato.cuarto) {
                nombreCuarto = contrato.cuarto.nombreCuarto || 'Sin nombre';
            } else {
                const cuarto = this.cuartos.find(c => c.idCuarto === contrato.idCuarto);
                if (cuarto) {
                    nombreCuarto = cuarto.nombreCuarto;
                }
            }
            
            return `
                <tr>
                    <td>C-${contrato.idContrato ? contrato.idContrato.toString().padStart(3, '0') : 'N/A'}</td>
                    <td>${this.escapeHtml(nombreInquilino)}</td>
                    <td>${this.escapeHtml(nombreCuarto)}</td>
                    <td>${contrato.fechaInicio ? this.formatDate(contrato.fechaInicio) : 'N/A'}</td>
                    <td>${contrato.fechaFinalizacion ? this.formatDate(contrato.fechaFinalizacion) : 'Indefinido'}</td>
                    <td>$${contrato.montoRentaAcordada ? parseFloat(contrato.montoRentaAcordada).toFixed(2) : '0.00'}</td>
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
            `;
        }).join('');
    }

    getStatusClass(status) {
        if (!status) return 'status-pending';
        
        const statusMap = {
            'activo': 'status-active',
            'finalizado': 'status-inactive',
            'cancelado': 'status-inactive',
            'suspendido': 'status-pending'
        };
        return statusMap[status.toLowerCase()] || 'status-pending';
    }

    getStatusText(status) {
        if (!status) return 'Pendiente';
        
        const statusMap = {
            'activo': 'Activo',
            'finalizado': 'Finalizado',
            'cancelado': 'Cancelado',
            'suspendido': 'Suspendido'
        };
        return statusMap[status.toLowerCase()] || status;
    }

    updateStats() {
        const total = this.contratos.length;
        const activos = this.contratos.filter(c => c.estadoContrato === 'activo').length;
        
        const hoy = new Date();
        const porVencer = this.contratos.filter(c => {
            if (c.estadoContrato !== 'activo' || !c.fechaFinalizacion) return false;
            
            const fechaFin = new Date(c.fechaFinalizacion);
            const diffTime = fechaFin - hoy;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30 && diffDays > 0;
        }).length;
        
        const expirados = this.contratos.filter(c => {
            if (c.estadoContrato !== 'activo' || !c.fechaFinalizacion) return false;
            
            const fechaFin = new Date(c.fechaFinalizacion);
            return fechaFin < hoy;
        }).length;

        this.updateElementContent('totalContratos', total);
        this.updateElementContent('contratosActivos', activos);
        this.updateElementContent('contratosPorVencer', porVencer);
        this.updateElementContent('contratosExpirados', expirados);
    }

    updateElementContent(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = content;
        }
    }

    buscarContratos(termino) {
        if (!termino) {
            this.renderContratos();
            return;
        }

        const contratosFiltrados = this.contratos.filter(contrato => {
            const searchText = termino.toLowerCase();
            
            if (contrato.idContrato && contrato.idContrato.toString().includes(searchText)) {
                return true;
            }
            
            let nombreInquilino = '';
            if (contrato.inquilino) {
                nombreInquilino = contrato.inquilino.username || '';
            } else {
                const inquilino = this.inquilinos.find(i => i.idUsuario === contrato.idInquilino);
                nombreInquilino = inquilino ? inquilino.username : '';
            }
            
            if (nombreInquilino.toLowerCase().includes(searchText)) {
                return true;
            }
            
            let nombreCuarto = '';
            if (contrato.cuarto) {
                nombreCuarto = contrato.cuarto.nombreCuarto || '';
            } else {
                const cuarto = this.cuartos.find(c => c.idCuarto === contrato.idCuarto);
                nombreCuarto = cuarto ? cuarto.nombreCuarto : '';
            }
            
            if (nombreCuarto.toLowerCase().includes(searchText)) {
                return true;
            }
            
            if (contrato.estadoContrato && contrato.estadoContrato.toLowerCase().includes(searchText)) {
                return true;
            }
            
            return false;
        });

        this.renderContratos(contratosFiltrados);
    }

    showModal(contrato = null) {
        if (this.inquilinos.length === 0) {
            this.showError('No hay usuarios con rol de inquilino (rol ID 2) registrados. Por favor, crea un usuario con rol de inquilino primero.');
            return;
        }
        
        if (this.cuartos.length === 0) {
            this.showError('No hay cuartos registrados. Por favor, crea un cuarto primero.');
            return;
        }

        this.currentContrato = contrato;
        const modal = document.getElementById('modalContrato');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('contratoForm');

        if (!modal || !title || !form) {
            console.error('Elementos del modal no encontrados');
            this.showError('Error: Elementos del formulario no encontrados');
            return;
        }

        if (contrato) {
            title.textContent = 'Editar Contrato';
            this.populateForm(contrato);
        } else {
            title.textContent = 'Nuevo Contrato';
            form.reset();
            const hoy = new Date().toISOString().split('T')[0];
            document.getElementById('fechaInicio').min = hoy;
        }

        modal.style.display = 'block';
    }

    populateForm(contrato) {
        document.getElementById('idInquilino').value = contrato.idInquilino || '';
        document.getElementById('idCuarto').value = contrato.idCuarto || '';
        document.getElementById('fechaInicio').value = contrato.fechaInicio || '';
        document.getElementById('fechaFinalizacion').value = contrato.fechaFinalizacion || '';
        document.getElementById('fechaPagoEstablecida').value = contrato.fechaPagoEstablecida || '';
        document.getElementById('montoRentaAcordada').value = contrato.montoRentaAcordada || '';
        document.getElementById('estadoContrato').value = contrato.estadoContrato || 'activo';
    }

    async guardarContrato(e) {
        e.preventDefault();
        
        if (this.inquilinos.length === 0) {
            this.showError('No hay usuarios con rol de inquilino (rol ID 2) registrados.');
            return;
        }
        
        if (this.cuartos.length === 0) {
            this.showError('No hay cuartos registrados.');
            return;
        }
        
        try {
            this.showLoading(true, 'btnGuardar');
            
            const formData = new FormData(e.target);
            
            const idInquilino = parseInt(formData.get('idInquilino'));
            const idCuarto = parseInt(formData.get('idCuarto'));
            const fechaInicio = formData.get('fechaInicio');
            const montoRenta = formData.get('montoRentaAcordada');
            
            if (!idInquilino) {
                throw new Error('Debe seleccionar un inquilino');
            }
            
            if (!idCuarto) {
                throw new Error('Debe seleccionar un cuarto');
            }
            
            if (!fechaInicio) {
                throw new Error('La fecha de inicio es requerida');
            }
            
            if (!montoRenta || parseFloat(montoRenta) <= 0) {
                throw new Error('El monto de renta debe ser mayor a 0');
            }
            
            const contratoData = {
                idCuarto: idCuarto,
                idInquilino: idInquilino,
                fechaInicio: fechaInicio,
                fechaFinalizacion: formData.get('fechaFinalizacion') || null,
                fechaPagoEstablecida: formData.get('fechaPagoEstablecida') || null,
                estadoContrato: formData.get('estadoContrato') || 'activo',
                montoRentaAcordada: parseFloat(montoRenta)
            };

            console.log('Enviando datos de contrato:', contratoData);

            let url = '/contratos';
            let method = 'POST';

            if (this.currentContrato) {
                url = `/contratos/${this.currentContrato.idContrato}`;
                method = 'PUT';
            }

            const responseData = await this.makeRequest(url, {
                method: method,
                body: JSON.stringify(contratoData)
            });

            console.log('Respuesta del servidor:', responseData);

            this.showSuccess(`Contrato ${this.currentContrato ? 'actualizado' : 'creado'} correctamente`);
            this.hideModals();
            
            // Recargar los contratos después de guardar
            await this.loadContratos();

        } catch (error) {
            console.error('Error guardando contrato:', error);
            this.showError('Error al guardar: ' + error.message);
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
            const mensaje = `¿Estás seguro de eliminar el contrato C-${contrato.idContrato ? contrato.idContrato.toString().padStart(3, '0') : 'N/A'}?`;
            this.showConfirmModal(mensaje, 'eliminarContrato');
        }
    }

    showConfirmModal(message, action) {
        this.currentAction = action;
        const modal = document.getElementById('modalConfirmacion');
        const messageElement = document.getElementById('confirmacionMensaje');
        
        if (!modal || !messageElement) {
            console.error('Modal de confirmación no encontrado');
            return;
        }
        
        messageElement.textContent = message;
        modal.style.display = 'block';
    }

    async confirmarAccion() {
        try {
            this.showLoading(true, 'btnConfirmarAccion');
            
            if (this.currentAction === 'eliminarContrato' && this.currentContrato) {
                await this.makeRequest(`/contratos/${this.currentContrato.idContrato}`, {
                    method: 'DELETE'
                });

                this.showSuccess('Contrato eliminado correctamente');
                this.hideModals();
                await this.loadContratos();
            }
        } catch (error) {
            console.error('Error confirmando acción:', error);
            this.showError('Error: ' + error.message);
        } finally {
            this.showLoading(false, 'btnConfirmarAccion');
        }
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
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES');
        } catch (error) {
            console.error('Error formateando fecha:', dateString, error);
            return 'Fecha inválida';
        }
    }

    showLoading(show, buttonId = null) {
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (!button) return;
            
            if (show) {
                button.disabled = true;
                button.innerHTML = '<span class="spinner"></span> Procesando...';
            } else {
                button.disabled = false;
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

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type) {
        document.querySelectorAll('.notification').forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let backgroundColor = '#28a745';
        if (type === 'error') backgroundColor = '#dc3545';
        if (type === 'warning') backgroundColor = '#ffc107';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${backgroundColor};
            color: ${type === 'warning' ? '#212529' : 'white'};
            border-radius: 6px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
            font-weight: 500;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

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

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    window.contratosManager = new ContratosManager();
    
    const style = document.createElement('style');
    style.textContent = `
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            margin-right: 8px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});