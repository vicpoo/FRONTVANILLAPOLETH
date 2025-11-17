// bitacora.js
class BitacoraManager {
    constructor() {
        this.reportes = [];
        this.historial = [];
        this.inquilinos = [];
        this.cuartos = [];
        this.currentReporte = null;
        this.currentHistorial = null;
        this.currentAction = null;
        this.API_BASE = 'http://localhost:8000/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadReportes();
        this.loadInquilinos();
        this.loadCuartos();
        this.setupFilters();
        // Cargar historial general al inicio
        this.loadHistorial();
    }

    bindEvents() {
        // Botones principales
        document.getElementById('btnNuevoReporte').addEventListener('click', () => this.showModalReporte());
        document.getElementById('btnAgregarHistorial').addEventListener('click', () => this.showModalHistorial());
        
        // Modal events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideModals());
        });
        
        document.getElementById('btnCancelar').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCancelarHistorial').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCancelarAccion').addEventListener('click', () => this.hideModals());
        
        // Form events
        document.getElementById('reporteForm').addEventListener('submit', (e) => this.guardarReporte(e));
        document.getElementById('historialForm').addEventListener('submit', (e) => this.guardarHistorial(e));
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.buscarReportes(e.target.value));
        
        // Confirmación
        document.getElementById('btnConfirmarAccion').addEventListener('click', () => this.confirmarAccion());
        
        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });

        // Cambio en select de inquilino para cargar cuartos
        document.getElementById('idInquilino').addEventListener('change', (e) => {
            this.cargarCuartosPorInquilino(e.target.value);
        });

        // Cambio en select de reporte para historial
        document.getElementById('historialIdReporte').addEventListener('change', (e) => {
            this.cargarDatosReporteParaHistorial(e.target.value);
        });
    }

    setupFilters() {
        document.getElementById('filterEstado').addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filterTipo').addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filterInquilino').addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filterFecha').addEventListener('change', () => this.aplicarFiltros());
    }

    async loadReportes() {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.API_BASE}/reportes-inquilinos`);
            
            if (!response.ok) {
                throw new Error('Error al cargar reportes');
            }
            
            this.reportes = await response.json();
            console.log('Reportes cargados:', this.reportes);
            this.renderReportes();
            this.updateStats();
            this.populateReportesSelect();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los reportes: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async loadHistorial(idReporte = null) {
        try {
            let url = `${this.API_BASE}/historial-reportes`;
            if (idReporte) {
                url = `${this.API_BASE}/historial-reportes/reporte/${idReporte}`;
            }
            
            console.log('Cargando historial desde:', url);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Error al cargar historial');
            }
            
            this.historial = await response.json();
            console.log('Historial cargado:', this.historial);
            this.renderHistorial();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar el historial: ' + error.message);
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
            this.populateSelect('filterInquilino', this.inquilinos, 'nombreInquilino');
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
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los cuartos');
        }
    }

    async cargarCuartosPorInquilino(idInquilino) {
        if (!idInquilino) {
            this.populateSelect('idCuarto', [], 'nombreCuarto');
            return;
        }

        try {
            this.populateSelect('idCuarto', this.cuartos, 'nombreCuarto');
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los cuartos del inquilino');
        }
    }

    populateSelect(selectId, data, labelField) {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">Seleccionar...</option>';
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.idInquilino || item.idCuarto;
            option.textContent = item[labelField];
            select.appendChild(option);
        });

        if (currentValue && data.some(item => (item.idInquilino || item.idCuarto) == currentValue)) {
            select.value = currentValue;
        }
    }

    populateReportesSelect() {
        const select = document.getElementById('historialIdReporte');
        select.innerHTML = '<option value="">Seleccionar reporte...</option>';
        
        this.reportes.forEach(reporte => {
            const option = document.createElement('option');
            option.value = reporte.idReporte;
            option.textContent = `R-${reporte.idReporte.toString().padStart(3, '0')} - ${reporte.nombre || 'Sin nombre'} - ${this.getNombreInquilino(reporte.idInquilino)}`;
            option.setAttribute('data-reporte', JSON.stringify(reporte));
            select.appendChild(option);
        });
    }

    cargarDatosReporteParaHistorial(idReporte) {
        if (!idReporte) {
            document.getElementById('nombreReporteHist').value = '';
            return;
        }

        const reporte = this.reportes.find(r => r.idReporte == idReporte);
        if (reporte) {
            document.getElementById('nombreReporteHist').value = reporte.nombre || '';
            this.currentReporte = reporte;
        }
    }

    renderReportes(reportes = this.reportes) {
        const tbody = document.getElementById('reportesTableBody');
        
        if (reportes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px;">
                        <i class="fas fa-clipboard-list" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                        <p>No se encontraron reportes</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = reportes.map(reporte => {
            const nombreInquilino = this.getNombreInquilino(reporte.idInquilino);
            const nombreCuarto = this.getNombreCuarto(reporte.idCuarto);
            
            return `
            <tr data-reporte-id="${reporte.idReporte}">
                <td>R-${reporte.idReporte.toString().padStart(3, '0')}</td>
                <td>${nombreInquilino}</td>
                <td>${nombreCuarto}</td>
                <td>${reporte.nombre || 'N/A'}</td>
                <td>${this.getTipoText(reporte.tipo)}</td>
                <td class="descripcion-truncada" title="${reporte.descripcion || ''}">${reporte.descripcion || 'Sin descripción'}</td>
                <td>${this.formatDate(reporte.fecha)}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(reporte.estadoReporte)}">
                        ${this.getStatusText(reporte.estadoReporte)}
                    </span>
                </td>
                <td class="table-actions-cell">
                    <button class="btn-action btn-edit" onclick="bitacoraManager.editarReporte(${reporte.idReporte})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-action btn-delete" onclick="bitacoraManager.eliminarReporte(${reporte.idReporte})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    }

    getNombreInquilino(idInquilino) {
        if (!idInquilino) return 'N/A';
        const inquilino = this.inquilinos.find(i => i.idInquilino === idInquilino);
        return inquilino ? inquilino.nombreInquilino : `Inquilino ${idInquilino}`;
    }

    getNombreCuarto(idCuarto) {
        if (!idCuarto) return 'N/A';
        const cuarto = this.cuartos.find(c => c.idCuarto === idCuarto);
        return cuarto ? cuarto.nombreCuarto : `Cuarto ${idCuarto}`;
    }

    renderHistorial() {
        const tbody = document.getElementById('historialTableBody');
        
        if (this.historial.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <i class="fas fa-history" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                        <p>No hay historial disponible</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.historial.map(historial => {
            console.log('Renderizando historial:', historial); // Debug
            return `
            <tr>
                <td>${this.formatDateTime(historial.fechaRegistro)}</td>
                <td>${historial.usuarioRegistro || 'Sistema'}</td>
                <td>${this.getTipoHistorialText(historial.tipoReporteHist)}</td>
                <td class="descripcion-truncada" title="${historial.descripcionHist || ''}">${historial.descripcionHist || 'Sin descripción'}</td>
                <td class="table-actions-cell">
                    <button class="btn-action btn-delete" onclick="bitacoraManager.eliminarHistorial(${historial.idHistorial})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    }

    getStatusClass(status) {
        const statusMap = {
            'PENDIENTE': 'status-pendiente',
            'Pendiente': 'status-pendiente',
            'EN_PROCESO': 'status-en-proceso',
            'En Proceso': 'status-en-proceso',
            'RESUELTO': 'status-resuelto',
            'Resuelto': 'status-resuelto',
            'CANCELADO': 'status-cancelado',
            'Cancelado': 'status-cancelado'
        };
        return statusMap[status] || 'status-pendiente';
    }

    getStatusText(status) {
        const statusMap = {
            'PENDIENTE': 'Pendiente',
            'Pendiente': 'Pendiente',
            'EN_PROCESO': 'En Proceso',
            'En Proceso': 'En Proceso',
            'RESUELTO': 'Resuelto',
            'Resuelto': 'Resuelto',
            'CANCELADO': 'Cancelado',
            'Cancelado': 'Cancelado'
        };
        return statusMap[status] || status;
    }

    getTipoText(tipo) {
        const tipoMap = {
            'MANTENIMIENTO': 'Mantenimiento',
            'Mantenimiento': 'Mantenimiento',
            'URGENTE': 'Urgente',
            'Urgente': 'Urgente',
            'QUEJA': 'Queja',
            'Queja': 'Queja',
            'SUGERENCIA': 'Sugerencia',
            'Sugerencia': 'Sugerencia'
        };
        return tipoMap[tipo] || tipo;
    }

    getTipoHistorialText(tipo) {
        const tipoMap = {
            'ACTUALIZACION': 'Actualización',
            'RESOLUCION': 'Resolución',
            'CANCELACION': 'Cancelación',
            'REVISION': 'Revisión'
        };
        return tipoMap[tipo] || tipo;
    }

    updateStats() {
        const total = this.reportes.length;
        const pendientes = this.reportes.filter(r => 
            r.estadoReporte === 'PENDIENTE' || r.estadoReporte === 'Pendiente'
        ).length;
        const resueltos = this.reportes.filter(r => 
            r.estadoReporte === 'RESUELTO' || r.estadoReporte === 'Resuelto'
        ).length;
        const cancelados = this.reportes.filter(r => 
            r.estadoReporte === 'CANCELADO' || r.estadoReporte === 'Cancelado'
        ).length;

        document.getElementById('totalReportes').textContent = total;
        document.getElementById('reportesPendientes').textContent = pendientes;
        document.getElementById('reportesResueltos').textContent = resueltos;
        document.getElementById('reportesCancelados').textContent = cancelados;
    }

    aplicarFiltros() {
        const estado = document.getElementById('filterEstado').value;
        const tipo = document.getElementById('filterTipo').value;
        const inquilino = document.getElementById('filterInquilino').value;
        const fecha = document.getElementById('filterFecha').value;

        let reportesFiltrados = this.reportes;

        if (estado) {
            reportesFiltrados = reportesFiltrados.filter(r => 
                r.estadoReporte === estado || 
                (estado === 'PENDIENTE' && r.estadoReporte === 'Pendiente') ||
                (estado === 'RESUELTO' && r.estadoReporte === 'Resuelto') ||
                (estado === 'CANCELADO' && r.estadoReporte === 'Cancelado')
            );
        }

        if (tipo) {
            reportesFiltrados = reportesFiltrados.filter(r => 
                r.tipo === tipo ||
                (tipo === 'MANTENIMIENTO' && r.tipo === 'Mantenimiento') ||
                (tipo === 'URGENTE' && r.tipo === 'Urgente') ||
                (tipo === 'QUEJA' && r.tipo === 'Queja') ||
                (tipo === 'SUGERENCIA' && r.tipo === 'Sugerencia')
            );
        }

        if (inquilino) {
            reportesFiltrados = reportesFiltrados.filter(r => r.idInquilino == inquilino);
        }

        if (fecha) {
            reportesFiltrados = reportesFiltrados.filter(r => r.fecha === fecha);
        }

        this.renderReportes(reportesFiltrados);
    }

    buscarReportes(termino) {
        if (!termino) {
            this.renderReportes();
            return;
        }

        const reportesFiltrados = this.reportes.filter(reporte => {
            const searchText = termino.toLowerCase();
            const nombreInquilino = this.getNombreInquilino(reporte.idInquilino).toLowerCase();
            const nombreCuarto = this.getNombreCuarto(reporte.idCuarto).toLowerCase();
            
            return (
                reporte.idReporte.toString().includes(searchText) ||
                nombreInquilino.includes(searchText) ||
                nombreCuarto.includes(searchText) ||
                (reporte.nombre && reporte.nombre.toLowerCase().includes(searchText)) ||
                (reporte.tipo && reporte.tipo.toLowerCase().includes(searchText)) ||
                (reporte.descripcion && reporte.descripcion.toLowerCase().includes(searchText)) ||
                (reporte.estadoReporte && reporte.estadoReporte.toLowerCase().includes(searchText))
            );
        });

        this.renderReportes(reportesFiltrados);
    }

    showModalReporte(reporte = null) {
        this.currentReporte = reporte;
        const modal = document.getElementById('modalReporte');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('reporteForm');

        if (reporte) {
            title.textContent = 'Editar Reporte';
            this.populateFormReporte(reporte);
        } else {
            title.textContent = 'Nuevo Reporte';
            form.reset();
            const hoy = new Date().toISOString().split('T')[0];
            document.getElementById('fecha').value = hoy;
            document.getElementById('estadoReporte').value = 'Pendiente';
        }

        modal.style.display = 'block';
    }

    showModalHistorial() {
        const modal = document.getElementById('modalHistorial');
        const form = document.getElementById('historialForm');

        document.getElementById('modalHistorialTitle').textContent = 'Agregar al Historial';
        form.reset();
        
        // Establecer valores por defecto
        document.getElementById('tipoReporteHist').value = 'ACTUALIZACION';
        document.getElementById('usuarioRegistro').value = 'admin';
        
        // Limpiar campos dependientes
        document.getElementById('nombreReporteHist').value = '';
        document.getElementById('historialIdReporte').value = '';
        this.currentReporte = null;

        modal.style.display = 'block';
    }

    populateFormReporte(reporte) {
        console.log('Populando formulario con:', reporte);
        
        document.getElementById('idInquilino').value = reporte.idInquilino || '';
        
        this.cargarCuartosPorInquilino(reporte.idInquilino).then(() => {
            document.getElementById('idCuarto').value = reporte.idCuarto || '';
        });
        
        document.getElementById('nombre').value = reporte.nombre || '';
        document.getElementById('tipo').value = reporte.tipo || '';
        document.getElementById('descripcion').value = reporte.descripcion || '';
        document.getElementById('fecha').value = reporte.fecha || '';
        
        let estadoNormalizado = reporte.estadoReporte;
        if (estadoNormalizado === 'Pendiente') estadoNormalizado = 'PENDIENTE';
        if (estadoNormalizado === 'Resuelto') estadoNormalizado = 'RESUELTO';
        if (estadoNormalizado === 'Cancelado') estadoNormalizado = 'CANCELADO';
        
        document.getElementById('estadoReporte').value = estadoNormalizado || 'PENDIENTE';
    }

    async guardarReporte(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardar');
            
            const formData = new FormData(e.target);
            
            const reporteData = {
                idInquilino: parseInt(formData.get('idInquilino')),
                idCuarto: formData.get('idCuarto') ? parseInt(formData.get('idCuarto')) : null,
                nombre: formData.get('nombre'),
                tipo: formData.get('tipo'),
                descripcion: formData.get('descripcion'),
                fecha: formData.get('fecha'),
                estadoReporte: formData.get('estadoReporte')
            };

            console.log('Enviando datos del reporte:', reporteData);

            let response;
            if (this.currentReporte) {
                response = await fetch(`${this.API_BASE}/reportes-inquilinos/${this.currentReporte.idReporte}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(reporteData)
                });
            } else {
                response = await fetch(`${this.API_BASE}/reportes-inquilinos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(reporteData)
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Error al guardar el reporte';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData;
                } catch {
                    errorMessage = errorText || 'Error al guardar el reporte';
                }
                
                throw new Error(errorMessage);
            }

            const savedReporte = await response.json();
            console.log('Reporte guardado:', savedReporte);
            
            this.showSuccess(`Reporte ${this.currentReporte ? 'actualizado' : 'creado'} correctamente`);
            this.hideModals();
            this.loadReportes();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnGuardar');
        }
    }

    async guardarHistorial(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardarHistorial');
            
            const formData = new FormData(e.target);
            const idReporte = parseInt(formData.get('idReporte'));
            
            if (!idReporte) {
                throw new Error('Debe seleccionar un reporte');
            }

            const historialData = {
                idReporte: idReporte,
                nombreReporteHist: formData.get('nombreReporteHist'),
                tipoReporteHist: formData.get('tipoReporteHist'),
                descripcionHist: formData.get('descripcionHist'),
                usuarioRegistro: formData.get('usuarioRegistro')
            };

            console.log('Enviando datos de historial:', historialData);

            const response = await fetch(`${this.API_BASE}/historial-reportes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(historialData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Error al guardar el historial';
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData;
                } catch {
                    errorMessage = errorText || 'Error al guardar el historial';
                }
                
                throw new Error(errorMessage);
            }

            const savedHistorial = await response.json();
            console.log('Historial guardado:', savedHistorial);
            
            this.showSuccess('Historial agregado correctamente');
            this.hideModals();
            
            // Recargar el historial completo
            this.loadHistorial();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnGuardarHistorial');
        }
    }

    editarReporte(id) {
        const reporte = this.reportes.find(r => r.idReporte === id);
        if (reporte) {
            this.showModalReporte(reporte);
        }
    }

    eliminarReporte(id) {
        const reporte = this.reportes.find(r => r.idReporte === id);
        if (reporte) {
            this.currentReporte = reporte;
            const mensaje = `¿Estás seguro de eliminar el reporte R-${reporte.idReporte.toString().padStart(3, '0')}?`;
            this.showConfirmModal(mensaje, 'eliminarReporte');
        }
    }

    eliminarHistorial(id) {
        const historial = this.historial.find(h => h.idHistorial === id);
        if (historial) {
            this.currentHistorial = historial;
            const mensaje = `¿Estás seguro de eliminar este registro del historial?`;
            this.showConfirmModal(mensaje, 'eliminarHistorial');
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
            
            if (this.currentAction === 'eliminarReporte' && this.currentReporte) {
                const response = await fetch(`${this.API_BASE}/reportes-inquilinos/${this.currentReporte.idReporte}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al eliminar el reporte');
                }

                this.showSuccess('Reporte eliminado correctamente');
                this.hideModals();
                this.loadReportes();
                
            } else if (this.currentAction === 'eliminarHistorial' && this.currentHistorial) {
                const response = await fetch(`${this.API_BASE}/historial-reportes/${this.currentHistorial.idHistorial}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al eliminar el historial');
                }

                this.showSuccess('Registro de historial eliminado correctamente');
                this.hideModals();
                // Recargar el historial completo
                this.loadHistorial();
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al eliminar: ' + error.message);
        } finally {
            this.showLoading(false, 'btnConfirmarAccion');
        }
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.currentReporte = null;
        this.currentHistorial = null;
        this.currentAction = null;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES');
        } catch (error) {
            console.error('Error formateando fecha:', dateString, error);
            return dateString;
        }
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'N/A';
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString('es-ES');
        } catch (error) {
            console.error('Error formateando fecha/hora:', dateTimeString, error);
            return dateTimeString;
        }
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
                    button.textContent = this.currentReporte ? 'Actualizar Reporte' : 'Guardar Reporte';
                } else if (buttonId === 'btnGuardarHistorial') {
                    button.textContent = 'Guardar Historial';
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
    window.bitacoraManager = new BitacoraManager();
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
    
    .descripcion-truncada {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;
document.head.appendChild(style);