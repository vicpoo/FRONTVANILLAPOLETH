// mantenimiento.js
class MantenimientoManager {
    constructor() {
        this.mantenimientos = [];
        this.cuartos = [];
        this.currentMantenimiento = null;
        this.currentAction = null;
        this.API_BASE = 'http://44.222.55.146:8000/api';
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
            console.log('Cargando cuartos desde:', `${this.API_BASE}/cuartos`);
            const response = await fetch(`${this.API_BASE}/cuartos`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Cuartos recibidos:', data);
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
        const selectAtenderCuarto = document.getElementById('atenderCuarto');
        
        if (!select) return;
        
        // Limpiar selectores
        select.innerHTML = '<option value="">Seleccionar cuarto...</option>';
        if (selectAtenderCuarto) {
            selectAtenderCuarto.innerHTML = '<option value="">Seleccionar cuarto...</option>';
        }
        
        this.cuartos.forEach(cuarto => {
            const option = document.createElement('option');
            option.value = cuarto.idCuarto;
            option.textContent = `${cuarto.nombreCuarto || 'Cuarto'} (${cuarto.estadoCuarto || 'Disponible'})`;
            select.appendChild(option);
            
            // Si existe el selector en el modal de atención
            if (selectAtenderCuarto) {
                const option2 = option.cloneNode(true);
                selectAtenderCuarto.appendChild(option2);
            }
        });
    }

    bindEvents() {
        // Botones principales
        const btnNuevo = document.getElementById('btnNuevoMantenimiento');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', () => this.showModalMantenimiento());
        }
        
        // Modal events - Cerrar modales
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideModals());
        });
        
        // Form events
        const mantenimientoForm = document.getElementById('mantenimientoForm');
        if (mantenimientoForm) {
            mantenimientoForm.addEventListener('submit', (e) => this.guardarMantenimiento(e));
        }
        
        const atenderForm = document.getElementById('atenderMantenimientoForm');
        if (atenderForm) {
            atenderForm.addEventListener('submit', (e) => this.atenderMantenimiento(e));
        }
        
        // Search y filtros
        const searchInput = document.getElementById('searchMantenimientosInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.buscarMantenimientos(e.target.value));
        }
        
        const btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
        if (btnAplicarFiltros) {
            btnAplicarFiltros.addEventListener('click', () => this.aplicarFiltros());
        }
        
        const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
        if (btnLimpiarFiltros) {
            btnLimpiarFiltros.addEventListener('click', () => this.limpiarFiltros());
        }
        
        // Confirmación
        const btnConfirmarAccion = document.getElementById('btnConfirmarAccion');
        if (btnConfirmarAccion) {
            btnConfirmarAccion.addEventListener('click', () => this.confirmarAccion());
        }
        
        // Botones de cancelar
        const cancelButtons = ['btnCancelarMantenimiento', 'btnCancelarAtender', 'btnCerrarDetalles', 'btnCancelarAccion'];
        cancelButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => this.hideModals());
            }
        });
        
        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });
    }

    async loadMantenimientos() {
        try {
            this.showLoading(true);
            console.log('Cargando mantenimientos desde:', `${this.API_BASE}/mantenimientos`);
            const response = await fetch(`${this.API_BASE}/mantenimientos`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Mantenimientos recibidos:', data);
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
        if (!tbody) return;
        
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
            // Encontrar el cuarto correspondiente
            const cuarto = this.cuartos.find(c => c.idCuarto === mantenimiento.idCuarto);
            const nombreCuarto = cuarto ? (cuarto.nombreCuarto || `Cuarto ${mantenimiento.idCuarto}`) : `Cuarto ${mantenimiento.idCuarto}`;
            
            // Obtener estado y prioridad
            const estado = mantenimiento.estadoMantenimiento || 'Pendiente';
            const prioridad = this.getPriorityFromEstado(estado);
            
            return `
                <tr>
                    <td>${mantenimiento.idMantenimiento || '-'}</td>
                    <td>${this.escapeHtml(nombreCuarto)}</td>
                    <td>${this.formatDate(mantenimiento.fechaReporte)}</td>
                    <td>${mantenimiento.descripcionProblema ? 
                        (this.escapeHtml(mantenimiento.descripcionProblema).substring(0, 50) + 
                        (mantenimiento.descripcionProblema.length > 50 ? '...' : '')) : 
                        'Sin descripción'}</td>
                    <td>
                        <span class="status-badge ${this.getStatusClass(estado)}">
                            ${estado}
                        </span>
                    </td>
                    <td>
                        <span class="priority-badge ${this.getPriorityClass(prioridad)}">
                            ${prioridad}
                        </span>
                    </td>
                    <td>${mantenimiento.fechaAtencion ? this.formatDate(mantenimiento.fechaAtencion) : 'No atendido'}</td>
                    <td>${mantenimiento.costoMantenimiento ? 
                        `$${parseFloat(mantenimiento.costoMantenimiento).toFixed(2)}` : 
                        '$0.00'}</td>
                    <td class="table-actions-cell">
                        <button class="btn-action btn-info" onclick="mantenimientoManager.verDetalles(${mantenimiento.idMantenimiento})">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        ${!mantenimiento.fechaAtencion && estado !== 'Completado' && estado !== 'Cancelado' ? `
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

        if (!modal || !title || !form) return;

        if (mantenimiento) {
            title.textContent = 'Editar Mantenimiento';
            this.populateMantenimientoForm(mantenimiento);
        } else {
            title.textContent = 'Nuevo Mantenimiento';
            form.reset();
            // Establecer fecha actual por defecto
            document.getElementById('fechaReporte').value = new Date().toISOString().split('T')[0];
            // Establecer estado por defecto
            document.getElementById('estadoMantenimiento').value = 'Pendiente';
        }

        modal.style.display = 'block';
    }

    populateMantenimientoForm(mantenimiento) {
        document.getElementById('cuartoMantenimiento').value = mantenimiento.idCuarto || '';
        document.getElementById('fechaReporte').value = mantenimiento.fechaReporte || '';
        document.getElementById('estadoMantenimiento').value = mantenimiento.estadoMantenimiento || 'Pendiente';
        document.getElementById('descripcionProblema').value = mantenimiento.descripcionProblema || '';
        document.getElementById('fechaAtencion').value = mantenimiento.fechaAtencion || '';
        document.getElementById('costoMantenimiento').value = mantenimiento.costoMantenimiento || '0.00';
    }

    async guardarMantenimiento(e) {
        e.preventDefault();
        
        console.log('Guardando mantenimiento...');
        
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

            // Construir objeto según lo que espera la API
            const mantenimientoData = {
                idCuarto: idCuarto,
                fechaReporte: formData.get('fechaReporte'),
                descripcionProblema: formData.get('descripcionProblema').trim(),
                estadoMantenimiento: formData.get('estadoMantenimiento') || 'Pendiente'
            };

            // Agregar campos opcionales solo si tienen valor
            const fechaAtencion = formData.get('fechaAtencion');
            if (fechaAtencion) {
                mantenimientoData.fechaAtencion = fechaAtencion;
            }

            const costo = formData.get('costoMantenimiento');
            if (costo && parseFloat(costo) > 0) {
                mantenimientoData.costoMantenimiento = parseFloat(costo);
            }

            console.log('Datos a enviar:', mantenimientoData);

            // Validaciones adicionales
            if (!mantenimientoData.fechaReporte) {
                throw new Error('La fecha de reporte es requerida');
            }

            if (!mantenimientoData.descripcionProblema) {
                throw new Error('La descripción del problema es requerida');
            }

            let url = `${this.API_BASE}/mantenimientos`;
            let method = 'POST';

            if (this.currentMantenimiento && this.currentMantenimiento.idMantenimiento) {
                url = `${this.API_BASE}/mantenimientos/${this.currentMantenimiento.idMantenimiento}`;
                method = 'PUT';
                console.log('Actualizando mantenimiento:', this.currentMantenimiento.idMantenimiento);
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mantenimientoData)
            });

            console.log('Respuesta status:', response.status);
            
            if (!response.ok) {
                let errorMessage = `Error ${response.status}: `;
                try {
                    const errorData = await response.json();
                    errorMessage += errorData.message || errorData;
                } catch (e) {
                    const errorText = await response.text();
                    errorMessage += errorText || 'Error desconocido';
                }
                throw new Error(errorMessage);
            }

            const responseData = await response.json();
            console.log('Respuesta exitosa:', responseData);

            this.showSuccess(`Mantenimiento ${this.currentMantenimiento ? 'actualizado' : 'creado'} correctamente`);
            this.hideModals();
            await this.loadMantenimientos();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'Error al guardar el mantenimiento');
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
            const mensaje = `¿Estás seguro de eliminar el mantenimiento ID: ${mantenimiento.idMantenimiento} del cuarto ID: ${mantenimiento.idCuarto}?`;
            this.showConfirmModal(mensaje, 'eliminarMantenimiento');
        }
    }

    atender(id) {
        const mantenimiento = this.mantenimientos.find(m => m.idMantenimiento === id);
        if (mantenimiento) {
            this.currentMantenimiento = mantenimiento;
            const modal = document.getElementById('modalAtenderMantenimiento');
            const form = document.getElementById('atenderMantenimientoForm');
            
            if (!modal || !form) return;
            
            form.reset();
            // Establecer fecha actual por defecto
            document.getElementById('atenderFechaAtencion').value = new Date().toISOString().split('T')[0];
            // Establecer costo por defecto
            document.getElementById('atenderCosto').value = '0.00';
            // Establecer estado por defecto
            document.getElementById('atenderEstado').value = 'Completado';
            
            modal.style.display = 'block';
        }
    }

    async atenderMantenimiento(e) {
        e.preventDefault();
        console.log('Atendiendo mantenimiento...');
        
        try {
            this.showLoading(true, 'btnGuardarAtender');
            
            const formData = new FormData(e.target);
            
            // Construir objeto según lo que espera la API
            const atencionData = {
                fechaAtencion: formData.get('fechaAtencion'),
                costo: formData.get('costo') ? parseFloat(formData.get('costo')) : 0.00,
                estado: formData.get('estado') || 'Completado'
            };

            console.log('Datos de atención:', atencionData);

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

            console.log('Respuesta status:', response.status);
            
            if (!response.ok) {
                let errorMessage = `Error ${response.status}: `;
                try {
                    const errorData = await response.json();
                    errorMessage += errorData.message || errorData;
                } catch (e) {
                    const errorText = await response.text();
                    errorMessage += errorText || 'Error desconocido';
                }
                throw new Error(errorMessage);
            }

            const responseData = await response.json();
            console.log('Atención exitosa:', responseData);

            this.showSuccess('Mantenimiento atendido correctamente');
            this.hideModals();
            await this.loadMantenimientos();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'Error al atender el mantenimiento');
        } finally {
            this.showLoading(false, 'btnGuardarAtender');
        }
    }

    verDetalles(id) {
        const mantenimiento = this.mantenimientos.find(m => m.idMantenimiento === id);
        if (mantenimiento) {
            const cuarto = this.cuartos.find(c => c.idCuarto === mantenimiento.idCuarto);
            const nombreCuarto = cuarto ? (cuarto.nombreCuarto || `Cuarto ${mantenimiento.idCuarto}`) : `Cuarto ${mantenimiento.idCuarto}`;
            
            document.getElementById('detalleId').textContent = mantenimiento.idMantenimiento || '-';
            document.getElementById('detalleCuarto').textContent = nombreCuarto;
            document.getElementById('detalleFechaReporte').textContent = this.formatDate(mantenimiento.fechaReporte);
            document.getElementById('detalleDescripcion').textContent = mantenimiento.descripcionProblema || 'Sin descripción';
            document.getElementById('detalleEstado').textContent = mantenimiento.estadoMantenimiento || 'Pendiente';
            document.getElementById('detalleFechaAtencion').textContent = mantenimiento.fechaAtencion ? 
                this.formatDate(mantenimiento.fechaAtencion) : 'No atendido';
            document.getElementById('detalleCosto').textContent = mantenimiento.costoMantenimiento ? 
                `$${parseFloat(mantenimiento.costoMantenimiento).toFixed(2)}` : '$0.00';
            
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
            const nombreCuarto = cuarto ? cuarto.nombreCuarto.toLowerCase() : `cuarto ${mantenimiento.idCuarto}`;
            
            return (
                nombreCuarto.includes(searchText) ||
                (mantenimiento.descripcionProblema && mantenimiento.descripcionProblema.toLowerCase().includes(searchText)) ||
                (mantenimiento.estadoMantenimiento && mantenimiento.estadoMantenimiento.toLowerCase().includes(searchText)) ||
                mantenimiento.idMantenimiento.toString().includes(searchText)
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
                this.getPriorityFromEstado(m.estadoMantenimiento) === prioridad
            );
        }

        if (fechaInicio) {
            mantenimientosFiltrados = mantenimientosFiltrados.filter(m => 
                new Date(m.fechaReporte) >= new Date(fechaInicio)
            );
        }

        if (fechaFin) {
            mantenimientosFiltrados = mantenimientosFiltrados.filter(m => 
                new Date(m.fechaReporte) <= new Date(fechaFin)
            );
        }

        this.renderMantenimientos(mantenimientosFiltrados);
    }

    limpiarFiltros() {
        document.getElementById('filtroEstado').value = '';
        document.getElementById('filtroPrioridad').value = '';
        document.getElementById('filtroFechaInicio').value = '';
        document.getElementById('filtroFechaFin').value = '';
        document.getElementById('searchMantenimientosInput').value = '';
        this.renderMantenimientos();
    }

    // ==================== UTILIDADES ====================
    getStatusClass(status) {
        if (!status) return 'status-pendiente';
        
        const statusLower = status.toLowerCase();
        if (statusLower.includes('pendiente')) return 'status-pendiente';
        if (statusLower.includes('proceso') || statusLower.includes('en proceso')) return 'status-en-proceso';
        if (statusLower.includes('completado') || statusLower.includes('resuelto')) return 'status-completado';
        if (statusLower.includes('cancelado')) return 'status-cancelado';
        
        return 'status-pendiente';
    }

    getPriorityClass(priority) {
        if (!priority) return 'priority-media';
        
        const priorityLower = priority.toLowerCase();
        if (priorityLower.includes('alta')) return 'priority-alta';
        if (priorityLower.includes('media')) return 'priority-media';
        if (priorityLower.includes('baja')) return 'priority-baja';
        
        return 'priority-media';
    }

    getPriorityFromEstado(estado) {
        if (!estado) return 'Media';
        
        const estadoLower = estado.toLowerCase();
        if (estadoLower.includes('alta')) return 'Alta';
        if (estadoLower.includes('media')) return 'Media';
        if (estadoLower.includes('baja')) return 'Baja';
        
        // Mapeo de estados a prioridades
        const estadoMap = {
            'pendiente': 'Media',
            'en proceso': 'Media',
            'completado': 'Baja',
            'cancelado': 'Baja'
        };
        
        return estadoMap[estadoLower] || 'Media';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    updateStats() {
        const totalMantenimientos = this.mantenimientos.length;
        const mantenimientosPendientes = this.mantenimientos.filter(m => 
            !m.fechaAtencion || (m.estadoMantenimiento && 
            m.estadoMantenimiento.toLowerCase().includes('pendiente'))
        ).length;
        
        const mantenimientosEnProceso = this.mantenimientos.filter(m => 
            m.estadoMantenimiento && 
            m.estadoMantenimiento.toLowerCase().includes('proceso')
        ).length;
        
        const mantenimientosCompletados = this.mantenimientos.filter(m => 
            m.estadoMantenimiento && 
            (m.estadoMantenimiento.toLowerCase().includes('completado') || 
             m.estadoMantenimiento.toLowerCase().includes('resuelto'))
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
        if (modal && messageElement) {
            messageElement.textContent = message;
            modal.style.display = 'block';
        }
    }

    async confirmarAccion() {
        try {
            this.showLoading(true, 'btnConfirmarAccion');
            
            if (this.currentAction === 'eliminarMantenimiento' && this.currentMantenimiento) {
                console.log('Eliminando mantenimiento:', this.currentMantenimiento.idMantenimiento);
                
                const response = await fetch(`${this.API_BASE}/mantenimientos/${this.currentMantenimiento.idMantenimiento}`, {
                    method: 'DELETE'
                });

                console.log('Respuesta delete:', response.status);
                
                if (!response.ok) {
                    let errorMessage = `Error ${response.status}: `;
                    try {
                        const errorData = await response.json();
                        errorMessage += errorData.message || errorData;
                    } catch (e) {
                        const errorText = await response.text();
                        errorMessage += errorText || 'Error desconocido';
                    }
                    throw new Error(errorMessage);
                }

                this.showSuccess('Mantenimiento eliminado correctamente');
                this.hideModals();
                await this.loadMantenimientos();
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'Error al eliminar el mantenimiento');
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
            if (button) {
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