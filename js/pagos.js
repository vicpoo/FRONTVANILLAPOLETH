class PagosManager {
    constructor() {
        this.pagos = [];
        this.contratos = [];
        this.currentPago = null;
        this.currentAction = null;
        this.currentUserId = null;
        this.currentUserRole = null;
        this.API_BASE = 'http://44.222.55.146:8000/api';
        this.init();
    }

    async init() {
        // Verificar autenticación antes de continuar
        if (!this.checkAuth()) {
            window.location.href = '/pages/login.html';
            return;
        }
        
        this.bindEvents();
        
        // Cargar contratos primero, luego pagos
        await this.loadContratos();
        await this.loadPagos();
    }

    // Verificar autenticación y obtener datos del usuario
    checkAuth() {
        const token = localStorage.getItem('authToken');
        const username = localStorage.getItem('username');
        
        if (!token || !username) {
            return false;
        }
        
        // Decodificar el token JWT para obtener el ID del usuario
        try {
            const payload = this.decodeJWT(token);
            // Tu JWTUtil usa "id" como claim para el ID del usuario
            this.currentUserId = payload.id;
            this.currentUserRole = payload.rolId;
            
            console.log('✅ Usuario autenticado:', {
                userId: this.currentUserId,
                username: username,
                role: this.currentUserRole,
                roleName: payload.rol,
                email: payload.email
            });
            
            if (!this.currentUserId) {
                console.error('❌ No se pudo obtener el ID del usuario del token');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error al decodificar token:', error);
            return false;
        }
    }

    // Decodificar JWT (parte del payload)
    decodeJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            console.log('🔓 Token decodificado:', payload);
            return payload;
        } catch (error) {
            throw new Error('Token inválido');
        }
    }

    // Obtener headers con autenticación
    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    bindEvents() {
        // Botones principales
        document.getElementById('btnNuevoPago').addEventListener('click', () => this.showModal());
        
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
            
            console.log(`📥 Cargando pagos para el usuario ID: ${this.currentUserId}`);
            
            // Cargar SOLO los pagos del usuario actual
            const response = await fetch(`${this.API_BASE}/pagos/inquilino/${this.currentUserId}`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Error al cargar pagos');
            }
            
            this.pagos = await response.json();
            console.log(`✅ Pagos cargados: ${this.pagos.length} registro(s)`);
            this.renderPagos();
            this.updateStats();
        } catch (error) {
            console.error('❌ Error:', error);
            this.showError('Error al cargar los pagos: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async loadContratos() {
        try {
            console.log(`📋 Cargando contratos para el usuario ID: ${this.currentUserId}`);
            
            // Opción 1: Usar el endpoint específico para el inquilino
            const response = await fetch(`${this.API_BASE}/contratos/inquilino/${this.currentUserId}`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                console.warn('⚠️ No se pudo usar endpoint específico, intentando cargar todos los contratos');
                // Fallback: cargar todos y filtrar
                return this.loadContratosAlternative();
            }
            
            this.contratos = await response.json();
            
            // Filtrar solo contratos ACTIVOS
            this.contratos = this.contratos.filter(contrato => 
                contrato.estadoContrato && contrato.estadoContrato.toUpperCase() === 'ACTIVO'
            );
            
            console.log(`✅ Contratos activos encontrados: ${this.contratos.length}`);
            console.log('📄 Contratos cargados:', this.contratos);
            
            this.populateContratosSelect();
        } catch (error) {
            console.error('❌ Error:', error);
            this.showError('Error al cargar los contratos: ' + error.message);
        }
    }

    // Método alternativo para cargar contratos
    async loadContratosAlternative() {
        try {
            const response = await fetch(`${this.API_BASE}/contratos`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Error al cargar contratos');
            }
            
            const todosLosContratos = await response.json();
            
            console.log('📦 Total de contratos en el sistema:', todosLosContratos.length);
            console.log('🔍 Filtrando contratos para usuario ID:', this.currentUserId);
            
            // Filtrar contratos del usuario actual que estén activos
            this.contratos = todosLosContratos.filter(contrato => {
                const esDelUsuario = contrato.idInquilino === this.currentUserId;
                const estaActivo = contrato.estadoContrato && 
                                  contrato.estadoContrato.toUpperCase() === 'ACTIVO';
                
                if (esDelUsuario) {
                    console.log(`📌 Contrato encontrado:`, {
                        id: contrato.idContrato,
                        idInquilino: contrato.idInquilino,
                        estado: contrato.estadoContrato,
                        activo: estaActivo
                    });
                }
                
                return esDelUsuario && estaActivo;
            });
            
            console.log(`✅ Contratos activos encontrados: ${this.contratos.length}`);
            this.populateContratosSelect();
            
        } catch (error) {
            console.error('❌ Error en loadContratosAlternative:', error);
            throw error;
        }
    }

    populateContratosSelect() {
        const select = document.getElementById('idContrato');
        const btnNuevoPago = document.getElementById('btnNuevoPago');
        
        if (!this.contratos || this.contratos.length === 0) {
            select.innerHTML = '<option value="">No tienes contratos activos</option>';
            btnNuevoPago.disabled = true;
            btnNuevoPago.style.opacity = '0.5';
            btnNuevoPago.style.cursor = 'not-allowed';
            
            console.warn('⚠️ Usuario sin contratos activos');
            this.showNotification('No tienes contratos activos para registrar pagos. Contacta al administrador.', 'warning');
            return;
        }
        
        // Habilitar el botón de nuevo pago
        btnNuevoPago.disabled = false;
        btnNuevoPago.style.opacity = '1';
        btnNuevoPago.style.cursor = 'pointer';
        
        select.innerHTML = '<option value="">Seleccionar contrato...</option>';
        
        this.contratos.forEach(contrato => {
            const option = document.createElement('option');
            option.value = contrato.idContrato;
            
            // Construir texto descriptivo del contrato
            let descripcion = `C-${contrato.idContrato.toString().padStart(3, '0')}`;
            
            // Agregar información del cuarto o propiedad si existe
            if (contrato.cuarto && contrato.cuarto.numeroCuarto) {
                descripcion += ` - Cuarto ${contrato.cuarto.numeroCuarto}`;
            }
            
            // Agregar dirección de la propiedad si existe
            if (contrato.cuarto && contrato.cuarto.propiedad && contrato.cuarto.propiedad.direccion) {
                descripcion += ` (${contrato.cuarto.propiedad.direccion})`;
            }
            
            // Agregar monto si existe
            if (contrato.montoRentaAcordada) {
                descripcion += ` - ${parseFloat(contrato.montoRentaAcordada).toFixed(2)}`;
            }
            
            option.textContent = descripcion;
            select.appendChild(option);
        });
        
        console.log(`✅ Selector de contratos poblado con ${this.contratos.length} opcion(es)`);
    }

    renderPagos(pagos = this.pagos) {
        const tbody = document.getElementById('pagosTableBody');
        
        if (pagos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-money-bill-wave" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                        <p>No has registrado pagos aún</p>
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

        // Ingresos totales (en este caso, lo que el usuario ha pagado)
        const ingresosTotales = this.pagos.reduce((total, pago) => {
            return total + (pago.montoPagado || 0);
        }, 0);

        document.getElementById('totalPagos').textContent = total;
        document.getElementById('pagosEsteMes').textContent = pagosEsteMes;
        document.getElementById('pagosPendientes').textContent = 0;
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

    showModal() {
        const modal = document.getElementById('modalPago');
        const form = document.getElementById('pagoForm');

        form.reset();
        // Establecer fecha por defecto como hoy
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('fechaPago').value = hoy;

        modal.style.display = 'block';
    }

    async guardarPago(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardar');
            
            const formData = new FormData(e.target);
            
            const pagoData = {
                idContrato: parseInt(formData.get('idContrato')),
                idInquilino: this.currentUserId, // Usar el ID del usuario autenticado
                fechaPago: formData.get('fechaPago'),
                concepto: formData.get('concepto') || null,
                montoPagado: parseFloat(formData.get('montoPagado'))
            };

            console.log('💾 Guardando pago:', pagoData);

            // Crear nuevo pago
            const response = await fetch(`${this.API_BASE}/pagos`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(pagoData)
            });

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
            console.log('✅ Pago guardado exitosamente:', savedPago);
            this.showSuccess('Pago registrado correctamente');
            this.hideModals();
            this.loadPagos();

        } catch (error) {
            console.error('❌ Error:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnGuardar');
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
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
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
                if (buttonId === 'btnGuardar') {
                    button.textContent = 'Registrar Pago';
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
        // Crear contenedor de notificaciones si no existe
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const bgColors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        notification.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            margin-bottom: 10px;
            background: ${bgColors[type] || bgColors.info};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
            font-size: 14px;
            line-height: 1.5;
        `;
        
        notification.innerHTML = `
            <span style="font-size: 20px; font-weight: bold;">${icons[type] || icons.info}</span>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="
                background: transparent;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.8;
                transition: opacity 0.2s;
            " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">×</button>
        `;

        container.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
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