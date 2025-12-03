document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://44.222.55.146:8000/api';
    let authToken = null;
    let userData = null;
    let idInquilino = null;
    let reportes = [];
    let cuartos = [];
    let currentReporteId = null;

    // Elementos del DOM
    const elements = {
        // Botones principales
        nuevoReporteBtn: document.getElementById('nuevoReporteBtn'),
        
        // Estadísticas
        totalReportes: document.getElementById('totalReportes'),
        reportesPendientes: document.getElementById('reportesPendientes'),
        reportesResueltos: document.getElementById('reportesResueltos'),
        reportesProceso: document.getElementById('reportesProceso'),
        
        // Tabla y búsqueda
        reportesTableBody: document.getElementById('reportesTableBody'),
        searchInput: document.getElementById('searchInput'),
        filterStatus: document.getElementById('filterStatus'),
        paginationInfo: document.getElementById('paginationInfo'),
        
        // Modales
        nuevoReporteModal: document.getElementById('nuevoReporteModal'),
        verReporteModal: document.getElementById('verReporteModal'),
        editarReporteModal: document.getElementById('editarReporteModal'),
        confirmModal: document.getElementById('confirmModal'),
        
        // Formularios
        nuevoReporteForm: document.getElementById('nuevoReporteForm'),
        editarReporteForm: document.getElementById('editarReporteForm'),
        
        // Elementos de formulario nuevo reporte
        reporteNombre: document.getElementById('reporteNombre'),
        reporteTipo: document.getElementById('reporteTipo'),
        reporteDescripcion: document.getElementById('reporteDescripcion'),
        reporteCuarto: document.getElementById('reporteCuarto'),
        reporteFecha: document.getElementById('reporteFecha'),
        descripcionCounter: document.getElementById('descripcionCounter'),
        
        // Elementos de formulario editar reporte
        editarReporteId: document.getElementById('editarReporteId'),
        editarNombre: document.getElementById('editarNombre'),
        editarTipo: document.getElementById('editarTipo'),
        editarDescripcion: document.getElementById('editarDescripcion'),
        editarCuarto: document.getElementById('editarCuarto'),
        editarFecha: document.getElementById('editarFecha'),
        editarDescripcionCounter: document.getElementById('editarDescripcionCounter'),
        
        // Elementos de detalles del reporte
        detailId: document.getElementById('detailId'),
        detailNombre: document.getElementById('detailNombre'),
        detailTipo: document.getElementById('detailTipo'),
        detailDescripcion: document.getElementById('detailDescripcion'),
        detailFecha: document.getElementById('detailFecha'),
        detailCuarto: document.getElementById('detailCuarto'),
        detailEstado: document.getElementById('detailEstado'),
        
        // Modal de confirmación
        confirmMessage: document.getElementById('confirmMessage'),
        confirmCancel: document.getElementById('confirmCancel'),
        confirmAction: document.getElementById('confirmAction')
    };

    // Inicializar la aplicación
    init();

    async function init() {
        console.log('🚀 Iniciando aplicación de reportes...');
        
        // Verificar autenticación
        authToken = localStorage.getItem('authToken');
        const storedUserData = localStorage.getItem('userData');

        if (!authToken || !storedUserData) {
            console.error('❌ No se encontró token o datos de usuario');
            redirectToLogin();
            return;
        }

        try {
            userData = JSON.parse(storedUserData);
            console.log('👤 Datos de usuario cargados:', userData);
            
            // OBTENER idInquilino DESDE userData
            idInquilino = obtenerInquilinoIdDesdeDatosUsuario(userData);
            
            if (!idInquilino) {
                console.error('❌ No se pudo identificar el inquilino');
                showError('No se pudo identificar el inquilino. Por favor inicia sesión nuevamente.');
                setTimeout(() => redirectToLogin(), 2000);
                return;
            }

            console.log('✅ ID Inquilino confirmado:', idInquilino);
            
            // Cargar cuartos primero
            await loadCuartos();
            await loadReportes();
            setupEventListeners();
            console.log('✅ Aplicación inicializada correctamente');
        } catch (error) {
            console.error('❌ Error inicializando reportes:', error);
            showError('Error al cargar los reportes: ' + error.message);
        }
    }

    // Nueva función para cargar los cuartos
    async function loadCuartos() {
        try {
            console.log('📥 Cargando lista de cuartos...');
            
            const response = await fetch(`${API_BASE_URL}/cuartos`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                cuartos = await response.json();
                console.log('✅ Cuartos cargados:', cuartos.length);
                populateCuartosSelect();
            } else if (response.status === 404) {
                console.log('ℹ️ No hay cuartos disponibles');
                cuartos = [];
                populateCuartosSelect();
            } else {
                console.error('❌ Error al cargar cuartos:', response.status);
                throw new Error('Error al cargar los cuartos');
            }
        } catch (error) {
            console.error('❌ Error cargando cuartos:', error);
            showError('Error al cargar la lista de cuartos');
            cuartos = [];
            populateCuartosSelect();
        }
    }

    // Función para poblar los select de cuartos
    function populateCuartosSelect() {
        console.log('🔄 Poblando select de cuartos...');
        
        // Limpiar selects
        elements.reporteCuarto.innerHTML = '<option value="">Seleccionar cuarto (opcional)</option>';
        elements.editarCuarto.innerHTML = '<option value="">Seleccionar cuarto (opcional)</option>';
        
        if (cuartos.length === 0) {
            console.log('ℹ️ No hay cuartos para mostrar en el select');
            return;
        }

        // Agregar opciones de cuartos
        cuartos.forEach(cuarto => {
            const option = document.createElement('option');
            option.value = cuarto.idCuarto;
            option.textContent = cuarto.nombreCuarto || `Cuarto ${cuarto.idCuarto}`;
            
            elements.reporteCuarto.appendChild(option.cloneNode(true));
            elements.editarCuarto.appendChild(option);
        });
        
        console.log(`✅ Selects de cuartos poblados con ${cuartos.length} opciones`);
    }

    // Función para obtener el nombre del cuarto por ID
    function getCuartoNombreById(idCuarto) {
        if (!idCuarto) return 'No especificado';
        
        const cuarto = cuartos.find(c => c.idCuarto == idCuarto);
        return cuarto ? (cuarto.nombreCuarto || `Cuarto ${cuarto.idCuarto}`) : `Cuarto ID: ${idCuarto}`;
    }

    // Función corregida para obtener idInquilino desde userData
    function obtenerInquilinoIdDesdeDatosUsuario(userData) {
        console.log('🔍 Obteniendo idInquilino desde userData...');
        
        try {
            // Intentar obtener idInquilino de diferentes posibles ubicaciones en userData
            let idInquilino = null;
            
            if (userData.inquilino && userData.inquilino.idInquilino) {
                idInquilino = userData.inquilino.idInquilino;
            } else if (userData.idInquilino) {
                idInquilino = userData.idInquilino;
            } else if (userData.id) {
                idInquilino = userData.id;
            }
            
            if (idInquilino) {
                console.log('✅ ID Inquilino encontrado en userData:', idInquilino);
                return idInquilino;
            }
            
            console.warn('⚠️ idInquilino no encontrado en userData');
            console.warn('📋 Estructura de userData:', JSON.stringify(userData, null, 2));
            return null;
        } catch (error) {
            console.error('❌ Error obteniendo idInquilino:', error);
            return null;
        }
    }

    async function loadReportes() {
        try {
            console.log('📥 Cargando reportes para inquilino:', idInquilino);
            setLoadingState(true);
            
            const response = await fetch(`${API_BASE_URL}/reportes-inquilinos/inquilino/${idInquilino}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                reportes = await response.json();
                console.log('✅ Reportes cargados:', reportes.length);
                console.log('📋 Primer reporte:', reportes.length > 0 ? reportes[0] : 'Ninguno');
                updateDashboardStats();
                renderReportesTable();
            } else if (response.status === 404) {
                console.log('ℹ️ No hay reportes para este inquilino');
                reportes = [];
                updateDashboardStats();
                showEmptyState();
            } else {
                console.error('❌ Error al cargar reportes:', response.status);
                throw new Error('Error al cargar los reportes');
            }
        } catch (error) {
            console.error('❌ Error cargando reportes:', error);
            showError('Error al cargar los reportes');
            reportes = [];
            updateDashboardStats();
            showEmptyState();
        } finally {
            setLoadingState(false);
        }
    }

    function updateDashboardStats() {
        const total = reportes.length;
        const pendientes = reportes.filter(r => 
            r.estadoReporte === 'Pendiente' || 
            r.estadoReporte === 'abierto' || 
            !r.estadoReporte
        ).length;
        const resueltos = reportes.filter(r => 
            r.estadoReporte === 'Resuelto' || 
            r.estadoReporte === 'resuelto' ||
            r.estadoReporte === 'cerrado'
        ).length;
        const proceso = reportes.filter(r => 
            r.estadoReporte === 'En Proceso' || 
            r.estadoReporte === 'proceso'
        ).length;

        elements.totalReportes.textContent = total;
        elements.reportesPendientes.textContent = pendientes;
        elements.reportesResueltos.textContent = resueltos;
        elements.reportesProceso.textContent = proceso;
        
        console.log('📊 Estadísticas actualizadas - Total:', total, 'Pendientes:', pendientes);
    }

    function renderReportesTable(filteredReportes = null) {
        const data = filteredReportes || reportes;
        
        if (data.length === 0) {
            showEmptyState();
            return;
        }

        elements.reportesTableBody.innerHTML = '';

        data.forEach(reporte => {
            const row = document.createElement('tr');
            const estado = reporte.estadoReporte || 'Pendiente';
            
            // Convertir estado a formato legible
            const estadoLegible = convertirEstado(estado);
            
            row.innerHTML = `
                <td>${reporte.idReporte || 'N/A'}</td>
                <td>${escapeHtml(reporte.nombre || 'Sin nombre')}</td>
                <td>${escapeHtml(reporte.tipo || 'No especificado')}</td>
                <td>${truncateText(reporte.descripcion || '', 50)}</td>
                <td>${formatDate(reporte.fecha)}</td>
                <td><span class="status-badge status-${getStatusClass(estado)}">${estadoLegible}</span></td>
                <td class="table-actions-cell">
                    <button class="btn-action btn-view view-reporte" data-id="${reporte.idReporte}">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    ${(estado === 'Pendiente' || estado === 'abierto') ? `
                    <button class="btn-action btn-edit edit-reporte" data-id="${reporte.idReporte}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-action btn-delete delete-reporte" data-id="${reporte.idReporte}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                    ` : ''}
                </td>
            `;
            elements.reportesTableBody.appendChild(row);
        });

        updatePaginationInfo(data.length);
        attachTableEventListeners();
    }

    function convertirEstado(estado) {
        const estados = {
            'abierto': 'Pendiente',
            'pendiente': 'Pendiente',
            'proceso': 'En Proceso',
            'resuelto': 'Resuelto',
            'cerrado': 'Cerrado'
        };
        return estados[estado.toLowerCase()] || estado;
    }

    function showEmptyState() {
        elements.reportesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No hay reportes</h3>
                    <p>No se encontraron reportes para mostrar.</p>
                    <button class="btn-primary" id="createFirstReporteBtn">
                        <i class="fas fa-plus"></i> Crear Primer Reporte
                    </button>
                </td>
            </tr>
        `;
        
        const createBtn = document.getElementById('createFirstReporteBtn');
        if (createBtn) {
            createBtn.addEventListener('click', showNuevoReporteModal);
        }
        updatePaginationInfo(0);
    }

    function updatePaginationInfo(count) {
        elements.paginationInfo.textContent = `Mostrando ${count} de ${reportes.length} reportes`;
    }

    function setupEventListeners() {
        // Botones principales
        elements.nuevoReporteBtn.addEventListener('click', showNuevoReporteModal);
        
        // Búsqueda y filtros
        elements.searchInput.addEventListener('input', handleSearch);
        elements.filterStatus.addEventListener('change', handleFilter);
        
        // Formularios
        elements.nuevoReporteForm.addEventListener('submit', handleNuevoReporte);
        elements.editarReporteForm.addEventListener('submit', handleEditarReporte);
        
        // Contadores de caracteres
        elements.reporteDescripcion.addEventListener('input', updateDescripcionCounter);
        elements.editarDescripcion.addEventListener('input', updateEditarDescripcionCounter);
        
        // Fecha por defecto (hoy)
        const today = new Date().toISOString().split('T')[0];
        elements.reporteFecha.value = today;
        elements.editarFecha.value = today;
        
        // Modales
        setupModalEvents();
        
        // Modal de confirmación
        elements.confirmCancel.addEventListener('click', closeConfirmModal);
        elements.confirmAction.addEventListener('click', handleConfirmAction);
    }

    function setupModalEvents() {
        // Cerrar modales al hacer click en la X
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });

        // Cerrar modales al hacer click fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.style.display = 'none';
                }
            });
        });

        // Botones cancelar
        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });

        // Botón cerrar en modal de detalles
        const closeBtn = document.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                elements.verReporteModal.style.display = 'none';
            });
        }
    }

    function attachTableEventListeners() {
        // Ver reporte
        document.querySelectorAll('.view-reporte').forEach(btn => {
            btn.addEventListener('click', function() {
                const reporteId = this.getAttribute('data-id');
                showVerReporteModal(reporteId);
            });
        });

        // Editar reporte
        document.querySelectorAll('.edit-reporte').forEach(btn => {
            btn.addEventListener('click', function() {
                const reporteId = this.getAttribute('data-id');
                showEditarReporteModal(reporteId);
            });
        });

        // Eliminar reporte
        document.querySelectorAll('.delete-reporte').forEach(btn => {
            btn.addEventListener('click', function() {
                const reporteId = this.getAttribute('data-id');
                showConfirmDeleteModal(reporteId);
            });
        });
    }

    function showNuevoReporteModal() {
        console.log('📝 Abriendo modal de nuevo reporte');
        elements.nuevoReporteForm.reset();
        const today = new Date().toISOString().split('T')[0];
        elements.reporteFecha.value = today;
        updateDescripcionCounter();
        elements.nuevoReporteModal.style.display = 'block';
    }

    function showVerReporteModal(reporteId) {
        console.log('👁️ Mostrando detalles del reporte:', reporteId);
        const reporte = reportes.find(r => r.idReporte == reporteId);
        if (!reporte) {
            console.error('❌ Reporte no encontrado:', reporteId);
            return;
        }

        elements.detailId.textContent = reporte.idReporte || 'N/A';
        elements.detailNombre.textContent = reporte.nombre || 'Sin nombre';
        elements.detailTipo.textContent = reporte.tipo || 'No especificado';
        elements.detailDescripcion.textContent = reporte.descripcion || 'Sin descripción';
        elements.detailFecha.textContent = formatDate(reporte.fecha);
        
        // Mostrar nombre del cuarto en lugar del ID
        elements.detailCuarto.textContent = getCuartoNombreById(reporte.idCuarto);
        
        // Estado convertido a formato legible
        const estado = reporte.estadoReporte || 'Pendiente';
        elements.detailEstado.textContent = convertirEstado(estado);
        elements.detailEstado.className = `status-badge status-${getStatusClass(estado)}`;

        elements.verReporteModal.style.display = 'block';
    }

    function showEditarReporteModal(reporteId) {
        console.log('✏️ Abriendo modal de edición para reporte:', reporteId);
        const reporte = reportes.find(r => r.idReporte == reporteId);
        if (!reporte) {
            console.error('❌ Reporte no encontrado:', reporteId);
            return;
        }

        elements.editarReporteId.value = reporte.idReporte;
        elements.editarNombre.value = reporte.nombre || '';
        elements.editarTipo.value = reporte.tipo || '';
        elements.editarDescripcion.value = reporte.descripcion || '';
        elements.editarCuarto.value = reporte.idCuarto || '';
        
        // Formatear fecha para input date
        if (reporte.fecha) {
            const date = new Date(reporte.fecha + 'T00:00:00');
            elements.editarFecha.value = date.toISOString().split('T')[0];
        } else {
            elements.editarFecha.value = new Date().toISOString().split('T')[0];
        }
        
        updateEditarDescripcionCounter();
        elements.editarReporteModal.style.display = 'block';
    }

    function showConfirmDeleteModal(reporteId) {
        console.log('⚠️ Solicitando confirmación para eliminar reporte:', reporteId);
        currentReporteId = reporteId;
        const reporte = reportes.find(r => r.idReporte == reporteId);
        
        elements.confirmMessage.textContent = `¿Estás seguro de que quieres eliminar el reporte "${reporte.nombre}"?`;
        elements.confirmModal.style.display = 'block';
    }

    function closeConfirmModal() {
        elements.confirmModal.style.display = 'none';
        currentReporteId = null;
    }

    async function handleConfirmAction() {
        if (!currentReporteId) return;

        console.log('🗑️ Eliminando reporte:', currentReporteId);
        try {
            const response = await fetch(`${API_BASE_URL}/reportes-inquilinos/${currentReporteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok || response.status === 204) {
                console.log('✅ Reporte eliminado correctamente');
                showNotification('Reporte eliminado correctamente', 'success');
                await loadReportes();
            } else {
                const errorData = await response.text();
                console.error('❌ Error al eliminar reporte:', response.status, errorData);
                throw new Error('Error al eliminar el reporte');
            }
        } catch (error) {
            console.error('❌ Error eliminando reporte:', error);
            showNotification('Error al eliminar el reporte: ' + error.message, 'error');
        } finally {
            closeConfirmModal();
        }
    }

    async function handleNuevoReporte(e) {
        e.preventDefault();
        
        console.log('📤 Creando nuevo reporte para inquilino:', idInquilino);
        
        const reporteData = {
            idInquilino: idInquilino,
            nombre: elements.reporteNombre.value.trim(),
            tipo: elements.reporteTipo.value,
            descripcion: elements.reporteDescripcion.value.trim(),
            fecha: elements.reporteFecha.value,
            idCuarto: elements.reporteCuarto.value ? parseInt(elements.reporteCuarto.value) : null,
            estadoReporte: 'abierto'
        };

        console.log('📋 Datos del reporte:', reporteData);

        // Validaciones
        if (!reporteData.nombre) {
            showNotification('El nombre del reporte es requerido', 'error');
            return;
        }

        if (!reporteData.tipo) {
            showNotification('El tipo de reporte es requerido', 'error');
            return;
        }

        if (!reporteData.descripcion) {
            showNotification('La descripción del reporte es requerida', 'error');
            return;
        }

        if (!reporteData.fecha) {
            showNotification('La fecha del reporte es requerida', 'error');
            return;
        }

        try {
            // Mostrar estado de carga
            const submitBtn = elements.nuevoReporteForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<div class="spinner"></div> Enviando...';
            submitBtn.disabled = true;

            const response = await fetch(`${API_BASE_URL}/reportes-inquilinos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reporteData)
            });

            if (response.ok) {
                const nuevoReporte = await response.json();
                console.log('✅ Reporte creado correctamente:', nuevoReporte);
                showNotification('Reporte creado correctamente', 'success');
                elements.nuevoReporteModal.style.display = 'none';
                await loadReportes();
            } else {
                const errorData = await response.text();
                console.error('❌ Error del servidor:', response.status, errorData);
                throw new Error(errorData || 'Error al crear el reporte');
            }

        } catch (error) {
            console.error('❌ Error creando reporte:', error);
            showNotification('Error al crear el reporte: ' + error.message, 'error');
        } finally {
            // Restaurar estado del botón
            const submitBtn = elements.nuevoReporteForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Reporte';
            submitBtn.disabled = false;
        }
    }

    async function handleEditarReporte(e) {
        e.preventDefault();
        
        const reporteId = elements.editarReporteId.value;
        console.log('✏️ Actualizando reporte:', reporteId);
        
        const reporteData = {
            idInquilino: idInquilino,
            nombre: elements.editarNombre.value.trim(),
            tipo: elements.editarTipo.value,
            descripcion: elements.editarDescripcion.value.trim(),
            fecha: elements.editarFecha.value,
            idCuarto: elements.editarCuarto.value ? parseInt(elements.editarCuarto.value) : null,
            estadoReporte: 'abierto'
        };

        console.log('📋 Datos actualizados:', reporteData);

        // Validaciones
        if (!reporteData.nombre) {
            showNotification('El nombre del reporte es requerido', 'error');
            return;
        }

        if (!reporteData.tipo) {
            showNotification('El tipo de reporte es requerido', 'error');
            return;
        }

        if (!reporteData.descripcion) {
            showNotification('La descripción del reporte es requerida', 'error');
            return;
        }

        if (!reporteData.fecha) {
            showNotification('La fecha del reporte es requerida', 'error');
            return;
        }

        try {
            // Mostrar estado de carga
            const submitBtn = elements.editarReporteForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<div class="spinner"></div> Guardando...';
            submitBtn.disabled = true;

            const response = await fetch(`${API_BASE_URL}/reportes-inquilinos/${reporteId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reporteData)
            });

            if (response.ok) {
                const updatedReporte = await response.json();
                console.log('✅ Reporte actualizado correctamente:', updatedReporte);
                showNotification('Reporte actualizado correctamente', 'success');
                elements.editarReporteModal.style.display = 'none';
                await loadReportes();
            } else {
                const errorData = await response.text();
                console.error('❌ Error del servidor:', response.status, errorData);
                throw new Error(errorData || 'Error al actualizar el reporte');
            }

        } catch (error) {
            console.error('❌ Error actualizando reporte:', error);
            showNotification('Error al actualizar el reporte: ' + error.message, 'error');
        } finally {
            // Restaurar estado del botón
            const submitBtn = elements.editarReporteForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            submitBtn.disabled = false;
        }
    }

    function handleSearch() {
        const searchTerm = elements.searchInput.value.toLowerCase();
        console.log('🔍 Buscando:', searchTerm);
        
        const filteredReportes = reportes.filter(reporte => 
            (reporte.nombre && reporte.nombre.toLowerCase().includes(searchTerm)) ||
            (reporte.descripcion && reporte.descripcion.toLowerCase().includes(searchTerm)) ||
            (reporte.tipo && reporte.tipo.toLowerCase().includes(searchTerm))
        );
        
        console.log('📊 Resultados encontrados:', filteredReportes.length);
        renderReportesTable(filteredReportes);
    }

    function handleFilter() {
        const statusFilter = elements.filterStatus.value;
        console.log('🔽 Filtrando por estado:', statusFilter || 'Todos');
        
        let filteredReportes = reportes;

        if (statusFilter) {
            filteredReportes = reportes.filter(reporte => {
                const estado = reporte.estadoReporte || 'Pendiente';
                const estadoLegible = convertirEstado(estado);
                return estadoLegible === statusFilter;
            });
        }

        console.log('📊 Reportes filtrados:', filteredReportes.length);
        renderReportesTable(filteredReportes);
    }

    function updateDescripcionCounter() {
        const length = elements.reporteDescripcion.value.length;
        elements.descripcionCounter.textContent = `${length}/500 caracteres`;
    }

    function updateEditarDescripcionCounter() {
        const length = elements.editarDescripcion.value.length;
        elements.editarDescripcionCounter.textContent = `${length}/500 caracteres`;
    }

    // Utilidades
    function getStatusClass(estado) {
        const estadoLower = estado.toLowerCase();
        const statusMap = {
            'pendiente': 'pendiente',
            'abierto': 'pendiente',
            'en proceso': 'proceso',
            'proceso': 'proceso',
            'resuelto': 'resuelto',
            'cerrado': 'cerrado'
        };
        return statusMap[estadoLower] || 'pendiente';
    }

    function formatDate(dateString) {
        if (!dateString) return 'No especificada';
        try {
            // Asegurar que la fecha tenga el formato correcto
            const date = new Date(dateString + 'T00:00:00');
            if (isNaN(date.getTime())) {
                return dateString;
            }
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.error('❌ Error formateando fecha:', dateString, error);
            return dateString;
        }
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function setLoadingState(loading) {
        if (loading) {
            document.body.style.cursor = 'wait';
        } else {
            document.body.style.cursor = 'default';
        }
    }

    function showNotification(message, type = 'success') {
        console.log(`📢 Notificación [${type}]:`, message);
        
        // Eliminar notificaciones anteriores
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Mostrar notificación
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    function showError(message) {
        showNotification(message, 'error');
    }



    // Estilos para notificaciones
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            opacity: 0;
            transform: translateY(-100%);
            transition: opacity 0.3s, transform 0.3s;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .notification.success {
            background-color: #4CAF50;
        }
        .notification.error {
            background-color: #f44336;
        }
        .notification i {
            font-size: 1.2em;
        }
    `;
    document.head.appendChild(style);

    // Manejar errores no capturados
    window.addEventListener('error', function(e) {
        console.error('❌ Error no capturado:', e.error);
    });

    window.addEventListener('unhandledrejection', function(e) {
        console.error('❌ Promesa rechazada no capturada:', e.reason);
    });
});