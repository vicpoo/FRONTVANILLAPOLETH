class BitacoraManager {
    constructor() {
        this.reportes = [];
        this.historial = [];
        this.inquilinos = []; // Usuarios con rol id 2
        this.cuartos = [];
        this.contratos = []; // Necesitamos contratos para relacionar inquilinos con cuartos
        this.currentReporte = null;
        this.currentHistorial = null;
        this.currentAction = null;
        this.API_BASE = 'http://44.222.55.146:8000/api';
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadInquilinos(); // Cargar usuarios con rol id 2
        await this.loadCuartos();
        await this.loadContratos(); // Cargar contratos para relacionar inquilinos con cuartos
        await this.loadReportes();
        await this.loadHistorial();
        this.setupFilters();
        this.updateStats();
    }

    bindEvents() {
        // Botones principales
        const btnNuevoReporte = document.getElementById('btnNuevoReporte');
        if (btnNuevoReporte) {
            btnNuevoReporte.addEventListener('click', () => this.showModalReporte());
        }

        const btnAgregarHistorial = document.getElementById('btnAgregarHistorial');
        if (btnAgregarHistorial) {
            btnAgregarHistorial.addEventListener('click', () => this.showModalHistorial());
        }

        // Modal events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideModals());
        });

        // Botones de cancelar
        const cancelButtons = ['btnCancelar', 'btnCancelarHistorial', 'btnCancelarAccion'];
        cancelButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => this.hideModals());
            }
        });

        // Form events
        const reporteForm = document.getElementById('reporteForm');
        if (reporteForm) {
            reporteForm.addEventListener('submit', (e) => this.guardarReporte(e));
        }

        const historialForm = document.getElementById('historialForm');
        if (historialForm) {
            historialForm.addEventListener('submit', (e) => this.guardarHistorial(e));
        }

        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.buscarReportes(e.target.value));
        }

        // Confirmación
        const btnConfirmarAccion = document.getElementById('btnConfirmarAccion');
        if (btnConfirmarAccion) {
            btnConfirmarAccion.addEventListener('click', () => this.confirmarAccion());
        }

        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });

        // Cambio en select de reporte para historial
        const historialSelect = document.getElementById('historialIdReporte');
        if (historialSelect) {
            historialSelect.addEventListener('change', (e) => {
                this.cargarDatosReporteParaHistorial(e.target.value);
            });
        }

        // Cuando se cambia el inquilino, cargar sus cuartos (basado en contratos)
        const idInquilinoSelect = document.getElementById('idInquilino');
        if (idInquilinoSelect) {
            idInquilinoSelect.addEventListener('change', (e) => {
                this.cargarCuartosPorInquilino(e.target.value);
            });
        }
    }

    setupFilters() {
        const filters = ['filterEstado', 'filterTipo', 'filterInquilino', 'filterFecha'];
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => this.aplicarFiltros());
            }
        });
    }

    async loadContratos() {
        try {
            console.log('Cargando contratos desde:', `${this.API_BASE}/contratos`);
            const response = await fetch(`${this.API_BASE}/contratos`);

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Contratos recibidos:', data);
            this.contratos = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los contratos: ' + error.message);
        }
    }

    async loadReportes() {
        try {
            this.showLoading(true);
            console.log('Cargando reportes desde:', `${this.API_BASE}/reportes-inquilinos`);
            const response = await fetch(`${this.API_BASE}/reportes-inquilinos`);

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Reportes recibidos:', data);
            this.reportes = Array.isArray(data) ? data : [];
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
            
            console.log('Cargando historial desde:', url);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Historial recibido:', data);
            this.historial = Array.isArray(data) ? data : [];
            this.renderHistorial();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar el historial: ' + error.message);
        }
    }

    async loadInquilinos() {
        try {
            console.log('Cargando inquilinos (usuarios rol 2) desde:', `${this.API_BASE}/usuarios/rol/2`);
            const response = await fetch(`${this.API_BASE}/usuarios/rol/2`);

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Inquilinos recibidos:', data);
            this.inquilinos = Array.isArray(data) ? data : [];
            
            // Poblar selectores
            this.populateInquilinosSelect('idInquilino');
            this.populateInquilinosSelect('filterInquilino');
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los inquilinos: ' + error.message);
        }
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
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los cuartos: ' + error.message);
        }
    }

    async cargarCuartosPorInquilino(idInquilino) {
        try {
            if (!idInquilino) {
                this.populateCuartosSelect([], 'idCuarto');
                return;
            }

            // Buscar contratos activos donde el inquilino esté asociado a cuartos
            const cuartosDelInquilino = [];
            
            // Opción 1: Buscar por contratos (la forma correcta)
            const contratosInquilino = this.contratos.filter(contrato => 
                contrato.idUsuario == idInquilino && 
                contrato.estadoContrato === 'activo'
            );
            
            contratosInquilino.forEach(contrato => {
                // Encontrar el cuarto por su ID
                const cuarto = this.cuartos.find(c => c.idCuarto == contrato.idCuarto);
                if (cuarto) {
                    cuartosDelInquilino.push(cuarto);
                }
            });
            
            // Si no hay cuartos por contrato, mostrar todos los cuartos disponibles
            if (cuartosDelInquilino.length === 0) {
                // Mostrar cuartos disponibles en general
                cuartosDelInquilino.push(...this.cuartos.filter(cuarto => 
                    cuarto.estadoCuarto === 'disponible' || cuarto.estadoCuarto === 'ocupado'
                ));
            }
            
            this.populateCuartosSelect(cuartosDelInquilino, 'idCuarto');
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar cuartos del inquilino: ' + error.message);
        }
    }

    populateInquilinosSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">Seleccionar inquilino...</option>';

        this.inquilinos.forEach(inquilino => {
            const option = document.createElement('option');
            option.value = inquilino.idUsuario;
            option.textContent = `${inquilino.username || inquilino.nombre || 'Inquilino ' + inquilino.idUsuario}`;
            select.appendChild(option);
        });
    }

    populateCuartosSelect(cuartos, selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">Seleccionar cuarto...</option>';

        if (cuartos.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No hay cuartos disponibles";
            option.disabled = true;
            select.appendChild(option);
            return;
        }

        cuartos.forEach(cuarto => {
            const option = document.createElement('option');
            option.value = cuarto.idCuarto;
            option.textContent = `${cuarto.nombreCuarto || 'Cuarto ' + cuarto.idCuarto} (${cuarto.estadoCuarto})`;
            select.appendChild(option);
        });
    }

    populateReportesSelect() {
        const select = document.getElementById('historialIdReporte');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccionar reporte...</option>';

        this.reportes.forEach(reporte => {
            const option = document.createElement('option');
            option.value = reporte.idReporte;
            option.textContent = `R-${reporte.idReporte} - ${reporte.nombre || 'Sin nombre'} (${this.getNombreInquilino(reporte.idInquilino)})`;
            select.appendChild(option);
        });
    }

    cargarDatosReporteParaHistorial(idReporte) {
        const nombreReporteHist = document.getElementById('nombreReporteHist');
        if (!nombreReporteHist) return;

        if (!idReporte) {
            nombreReporteHist.value = '';
            this.currentReporte = null;
            return;
        }

        const reporte = this.reportes.find(r => r.idReporte == idReporte);
        if (reporte) {
            nombreReporteHist.value = reporte.nombre || 'Historial de reporte';
            this.currentReporte = reporte;
        }
    }

    renderReportes(reportes = this.reportes) {
        const tbody = document.getElementById('reportesTableBody');
        if (!tbody) return;

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
            const descripcion = reporte.descripcion || 'Sin descripción';
            const descripcionCorta = descripcion.length > 100 ? 
                descripcion.substring(0, 100) + '...' : descripcion;

            return `
                <tr data-reporte-id="${reporte.idReporte}">
                    <td>R-${reporte.idReporte}</td>
                    <td>${this.escapeHtml(nombreInquilino)}</td>
                    <td>${this.escapeHtml(nombreCuarto)}</td>
                    <td>${this.escapeHtml(reporte.nombre || 'N/A')}</td>
                    <td>${this.getTipoText(reporte.tipo)}</td>
                    <td title="${this.escapeHtml(descripcion)}">${this.escapeHtml(descripcionCorta)}</td>
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

    renderHistorial() {
        const tbody = document.getElementById('historialTableBody');
        if (!tbody) return;

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
            const descripcion = historial.descripcionHist || 'Sin descripción';
            const descripcionCorta = descripcion.length > 100 ? 
                descripcion.substring(0, 100) + '...' : descripcion;

            return `
                <tr>
                    <td>${this.formatDateTime(historial.fechaRegistro)}</td>
                    <td>${this.escapeHtml(historial.usuarioRegistro || 'Sistema')}</td>
                    <td>${this.getTipoHistorialText(historial.tipoReporteHist)}</td>
                    <td title="${this.escapeHtml(descripcion)}">${this.escapeHtml(descripcionCorta)}</td>
                    <td class="table-actions-cell">
                        <button class="btn-action btn-delete" onclick="bitacoraManager.eliminarHistorial(${historial.idHistorial})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Métodos de utilidad
    getNombreInquilino(idInquilino) {
        if (!idInquilino) return 'N/A';
        const inquilino = this.inquilinos.find(i => i.idUsuario === idInquilino);
        return inquilino ? (inquilino.username || inquilino.nombre || `Inquilino ${idInquilino}`) : `Inquilino ${idInquilino}`;
    }

    getNombreCuarto(idCuarto) {
        if (!idCuarto) return 'N/A';
        const cuarto = this.cuartos.find(c => c.idCuarto === idCuarto);
        return cuarto ? (cuarto.nombreCuarto || `Cuarto ${idCuarto}`) : `Cuarto ${idCuarto}`;
    }

    getStatusClass(status) {
        if (!status) return 'status-pendiente';
        
        const statusLower = status.toLowerCase();
        if (statusLower.includes('pendiente')) return 'status-pendiente';
        if (statusLower.includes('proceso') || statusLower.includes('en proceso')) return 'status-en-proceso';
        if (statusLower.includes('resuelto') || statusLower.includes('completado') || statusLower.includes('cerrado')) return 'status-resuelto';
        if (statusLower.includes('cancelado')) return 'status-cancelado';
        
        return 'status-pendiente';
    }

    getStatusText(status) {
        if (!status) return 'Pendiente';
        
        const statusLower = status.toLowerCase();
        if (statusLower.includes('pendiente')) return 'Pendiente';
        if (statusLower.includes('proceso') || statusLower.includes('en proceso')) return 'En Proceso';
        if (statusLower.includes('resuelto') || statusLower.includes('completado') || statusLower.includes('cerrado')) return 'Resuelto';
        if (statusLower.includes('cancelado')) return 'Cancelado';
        
        return status;
    }

    getTipoText(tipo) {
        if (!tipo) return 'General';
        
        const tipoLower = tipo.toLowerCase();
        if (tipoLower.includes('mantenimiento')) return 'Mantenimiento';
        if (tipoLower.includes('urgente')) return 'Urgente';
        if (tipoLower.includes('queja')) return 'Queja';
        if (tipoLower.includes('sugerencia')) return 'Sugerencia';
        
        return tipo;
    }

    getTipoHistorialText(tipo) {
        if (!tipo) return 'Actualización';
        
        const tipoLower = tipo.toLowerCase();
        if (tipoLower.includes('actualizacion') || tipoLower.includes('actualización')) return 'Actualización';
        if (tipoLower.includes('resolucion') || tipoLower.includes('resolución')) return 'Resolución';
        if (tipoLower.includes('cancelacion') || tipoLower.includes('cancelación')) return 'Cancelación';
        if (tipoLower.includes('revision') || tipoLower.includes('revisión')) return 'Revisión';
        
        return tipo;
    }

    updateStats() {
        const total = this.reportes.length;
        const pendientes = this.reportes.filter(r => 
            this.getStatusText(r.estadoReporte) === 'Pendiente'
        ).length;
        const resueltos = this.reportes.filter(r => 
            this.getStatusText(r.estadoReporte) === 'Resuelto'
        ).length;
        const cancelados = this.reportes.filter(r => 
            this.getStatusText(r.estadoReporte) === 'Cancelado'
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
                this.getStatusText(r.estadoReporte) === estado
            );
        }

        if (tipo) {
            reportesFiltrados = reportesFiltrados.filter(r => 
                r.tipo && r.tipo.toUpperCase() === tipo.toUpperCase()
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
                this.getStatusText(reporte.estadoReporte).toLowerCase().includes(searchText)
            );
        });

        this.renderReportes(reportesFiltrados);
    }

    showModalReporte(reporte = null) {
        this.currentReporte = reporte;
        const modal = document.getElementById('modalReporte');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('reporteForm');

        if (!modal || !title || !form) return;

        if (reporte) {
            title.textContent = 'Editar Reporte';
            this.populateFormReporte(reporte);
        } else {
            title.textContent = 'Nuevo Reporte';
            form.reset();
            // Establecer fecha actual por defecto
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('fecha').value = today;
            // Establecer estado por defecto
            document.getElementById('estadoReporte').value = 'PENDIENTE';
            // Limpiar cuarto
            document.getElementById('idCuarto').innerHTML = '<option value="">Seleccionar inquilino primero...</option>';
        }

        modal.style.display = 'block';
    }

    showModalHistorial() {
        const modal = document.getElementById('modalHistorial');
        const form = document.getElementById('historialForm');

        if (!modal || !form) return;

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
        document.getElementById('idInquilino').value = reporte.idInquilino || '';
        // Cargar cuartos del inquilino seleccionado
        if (reporte.idInquilino) {
            this.cargarCuartosPorInquilino(reporte.idInquilino);
            // Esperar un momento para que se carguen los cuartos
            setTimeout(() => {
                document.getElementById('idCuarto').value = reporte.idCuarto || '';
            }, 100);
        }
        document.getElementById('nombre').value = reporte.nombre || '';
        document.getElementById('tipo').value = reporte.tipo || '';
        document.getElementById('descripcion').value = reporte.descripcion || '';
        document.getElementById('fecha').value = reporte.fecha || '';
        document.getElementById('estadoReporte').value = reporte.estadoReporte || 'PENDIENTE';
    }

    async guardarReporte(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardar');
            
            const formData = new FormData(e.target);
            
            // Construir objeto según lo que espera la API
            const reporteData = {
                idInquilino: parseInt(formData.get('idInquilino')),
                nombre: formData.get('nombre'),
                tipo: formData.get('tipo'),
                descripcion: formData.get('descripcion'),
                fecha: formData.get('fecha'),
                idCuarto: parseInt(formData.get('idCuarto')),
                estadoReporte: formData.get('estadoReporte')
            };

            console.log('Enviando datos del reporte:', reporteData);

            let url = `${this.API_BASE}/reportes-inquilinos`;
            let method = 'POST';

            if (this.currentReporte && this.currentReporte.idReporte) {
                url = `${this.API_BASE}/reportes-inquilinos/${this.currentReporte.idReporte}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reporteData)
            });

            console.log('Respuesta status:', response.status);
            
            if (!response.ok) {
                // Guardar el texto de error antes de intentar leer JSON
                let errorText = await response.text();
                let errorMessage = `Error ${response.status}: `;
                
                try {
                    // Intentar parsear como JSON
                    const errorData = JSON.parse(errorText);
                    errorMessage += errorData.message || errorData.error || errorText;
                } catch (jsonError) {
                    // Si no es JSON, usar el texto plano
                    errorMessage += errorText || 'Error desconocido';
                }
                throw new Error(errorMessage);
            }

            const responseData = await response.json();
            console.log('Respuesta exitosa:', responseData);

            this.showSuccess(`Reporte ${this.currentReporte ? 'actualizado' : 'creado'} correctamente`);
            this.hideModals();
            await this.loadReportes();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'Error al guardar el reporte');
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

            // Construir objeto según lo que espera la API
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

            console.log('Respuesta status:', response.status);
            
            if (!response.ok) {
                // Guardar el texto de error antes de intentar leer JSON
                let errorText = await response.text();
                let errorMessage = `Error ${response.status}: `;
                
                try {
                    // Intentar parsear como JSON
                    const errorData = JSON.parse(errorText);
                    errorMessage += errorData.message || errorData.error || errorText;
                } catch (jsonError) {
                    // Si no es JSON, usar el texto plano
                    errorMessage += errorText || 'Error desconocido';
                }
                throw new Error(errorMessage);
            }

            const responseData = await response.json();
            console.log('Historial guardado:', responseData);

            this.showSuccess('Historial agregado correctamente');
            this.hideModals();
            await this.loadHistorial();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'Error al guardar el historial');
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
            const mensaje = `¿Estás seguro de eliminar el reporte R-${reporte.idReporte}?`;
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
        if (modal && messageElement) {
            messageElement.textContent = message;
            modal.style.display = 'block';
        }
    }

    async confirmarAccion() {
        try {
            this.showLoading(true, 'btnConfirmarAccion');
            
            if (this.currentAction === 'eliminarReporte' && this.currentReporte) {
                console.log('Eliminando reporte:', this.currentReporte.idReporte);
                
                const response = await fetch(`${this.API_BASE}/reportes-inquilinos/${this.currentReporte.idReporte}`, {
                    method: 'DELETE'
                });

                console.log('Respuesta delete:', response.status);
                
                if (!response.ok) {
                    // Guardar el texto de error antes de intentar leer JSON
                    let errorText = await response.text();
                    let errorMessage = `Error ${response.status}: `;
                    
                    try {
                        // Intentar parsear como JSON
                        const errorData = JSON.parse(errorText);
                        errorMessage += errorData.message || errorData.error || errorText;
                    } catch (jsonError) {
                        // Si no es JSON, usar el texto plano
                        errorMessage += errorText || 'Error desconocido';
                    }
                    throw new Error(errorMessage);
                }

                this.showSuccess('Reporte eliminado correctamente');
                this.hideModals();
                await this.loadReportes();
                
            } else if (this.currentAction === 'eliminarHistorial' && this.currentHistorial) {
                console.log('Eliminando historial:', this.currentHistorial.idHistorial);
                
                const response = await fetch(`${this.API_BASE}/historial-reportes/${this.currentHistorial.idHistorial}`, {
                    method: 'DELETE'
                });

                console.log('Respuesta delete:', response.status);
                
                if (!response.ok) {
                    // Guardar el texto de error antes de intentar leer JSON
                    let errorText = await response.text();
                    let errorMessage = `Error ${response.status}: `;
                    
                    try {
                        // Intentar parsear como JSON
                        const errorData = JSON.parse(errorText);
                        errorMessage += errorData.message || errorData.error || errorText;
                    } catch (jsonError) {
                        // Si no es JSON, usar el texto plano
                        errorMessage += errorText || 'Error desconocido';
                    }
                    throw new Error(errorMessage);
                }

                this.showSuccess('Registro de historial eliminado correctamente');
                this.hideModals();
                await this.loadHistorial();
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'Error al eliminar');
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
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            console.error('Error formateando fecha:', dateString, e);
            return dateString;
        }
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'N/A';
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            console.error('Error formateando fecha/hora:', dateTimeString, e);
            return dateTimeString;
        }
    }

    showLoading(show, buttonId = null) {
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                if (show) {
                    button.disabled = true;
                    const buttonText = button.querySelector('.button-text');
                    if (buttonText) {
                        buttonText.innerHTML = '<span class="spinner"></span> Procesando...';
                    } else {
                        button.innerHTML = '<span class="spinner"></span> Procesando...';
                    }
                } else {
                    button.disabled = false;
                    if (buttonId === 'btnGuardar') {
                        const buttonText = button.querySelector('.button-text');
                        if (buttonText) {
                            buttonText.textContent = this.currentReporte ? 'Actualizar Reporte' : 'Guardar Reporte';
                        } else {
                            button.textContent = this.currentReporte ? 'Actualizar Reporte' : 'Guardar Reporte';
                        }
                    } else if (buttonId === 'btnGuardarHistorial') {
                        const buttonText = button.querySelector('.button-text');
                        if (buttonText) {
                            buttonText.textContent = 'Guardar Historial';
                        } else {
                            button.textContent = 'Guardar Historial';
                        }
                    } else if (buttonId === 'btnConfirmarAccion') {
                        const buttonText = button.querySelector('.button-text');
                        if (buttonText) {
                            buttonText.textContent = 'Confirmar';
                        } else {
                            button.textContent = 'Confirmar';
                        }
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
    window.bitacoraManager = new BitacoraManager();
});