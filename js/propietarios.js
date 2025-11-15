// propietarios.js
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:8000/api';
    let authToken = null;
    let currentEditingId = null;
    let propietariosData = [];

    // Elementos del DOM
    const elements = {
        // Botones principales
        btnNuevoPropietario: document.getElementById('btnNuevoPropietario'),
        btnExportar: document.getElementById('btnExportar'),
        btnLimpiarFiltros: document.getElementById('btnLimpiarFiltros'),
        
        // Estadísticas
        totalPropietarios: document.getElementById('totalPropietarios'),
        propietariosConEmail: document.getElementById('propietariosConEmail'),
        propietariosSinEmail: document.getElementById('propietariosSinEmail'),
        propietariosActivos: document.getElementById('propietariosActivos'),
        
        // Filtros
        filterEstado: document.getElementById('filterEstado'),
        searchInput: document.getElementById('searchInput'),
        
        // Tabla
        propietariosTableBody: document.getElementById('propietariosTableBody'),
        
        // Modales
        modalPropietario: document.getElementById('modalPropietario'),
        modalConfirmacion: document.getElementById('modalConfirmacion'),
        propietarioForm: document.getElementById('propietarioForm'),
        modalTitle: document.getElementById('modalTitle'),
        
        // Formulario propietario
        nombrePropietario: document.getElementById('nombrePropietario'),
        gmail: document.getElementById('gmail'),
        nombreError: document.getElementById('nombreError'),
        emailError: document.getElementById('emailError'),
        
        // Botones de acción
        btnCancelar: document.getElementById('btnCancelar'),
        btnGuardar: document.getElementById('btnGuardar'),
        btnCancelarAccion: document.getElementById('btnCancelarAccion'),
        btnConfirmarAccion: document.getElementById('btnConfirmarAccion')
    };

    // Inicializar la aplicación
    init();

    async function init() {
        // Verificar autenticación
        authToken = localStorage.getItem('authToken');
        if (!authToken) {
            redirectToLogin();
            return;
        }

        try {
            await loadDashboardStats();
            await loadPropietarios();
            setupEventListeners();
        } catch (error) {
            console.error('Error inicializando propietarios:', error);
            showError('Error al cargar la vista de propietarios');
        }
    }

    async function loadDashboardStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/propietarios`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const propietarios = await response.json();
                
                // Contar propietarios con email
                const propietariosConEmail = propietarios.filter(p => p.gmail && p.gmail.trim() !== '').length;
                const propietariosSinEmail = propietarios.length - propietariosConEmail;
                
                // Actualizar estadísticas
                elements.totalPropietarios.textContent = propietarios.length;
                elements.propietariosConEmail.textContent = propietariosConEmail;
                elements.propietariosSinEmail.textContent = propietariosSinEmail;
                elements.propietariosActivos.textContent = propietarios.length;
                
            } else {
                throw new Error('Error al cargar las estadísticas');
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            // Valores por defecto en caso de error
            elements.totalPropietarios.textContent = '0';
            elements.propietariosConEmail.textContent = '0';
            elements.propietariosSinEmail.textContent = '0';
            elements.propietariosActivos.textContent = '0';
        }
    }

    async function loadPropietarios() {
        try {
            setLoadingState(true);
            
            const response = await fetch(`${API_BASE_URL}/propietarios`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                propietariosData = await response.json();
                applyFilters();
            } else {
                throw new Error('Error al cargar los propietarios');
            }
        } catch (error) {
            console.error('Error cargando propietarios:', error);
            showError('Error al cargar la lista de propietarios');
        } finally {
            setLoadingState(false);
        }
    }

    function applyFilters() {
        const estadoFilter = elements.filterEstado.value;
        const searchTerm = elements.searchInput.value.toLowerCase();

        let filteredData = [...propietariosData];

        // Filtrar por estado
        if (estadoFilter === 'with-email') {
            filteredData = filteredData.filter(item => item.gmail && item.gmail.trim() !== '');
        } else if (estadoFilter === 'without-email') {
            filteredData = filteredData.filter(item => !item.gmail || item.gmail.trim() === '');
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            filteredData = filteredData.filter(item => 
                item.nombre.toLowerCase().includes(searchTerm) ||
                (item.gmail && item.gmail.toLowerCase().includes(searchTerm))
            );
        }

        displayPropietarios(filteredData);
    }

    function displayPropietarios(propietarios) {
        const tbody = elements.propietariosTableBody;
        tbody.innerHTML = '';

        if (propietarios.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <i class="fas fa-user-tie" style="font-size: 48px; color: var(--gray); margin-bottom: 16px;"></i>
                        <p>No hay propietarios que coincidan con los filtros</p>
                    </td>
                </tr>
            `;
            return;
        }

        propietarios.forEach(propietario => {
            const tieneEmail = propietario.gmail && propietario.gmail.trim() !== '';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${propietario.idPropietario}</td>
                <td>${escapeHtml(propietario.nombre)}</td>
                <td>${escapeHtml(propietario.gmail || 'No especificado')}</td>
                <td>
                    <span class="status-badge ${tieneEmail ? 'status-with-email' : 'status-without-email'}">
                        ${tieneEmail ? 'Con Email' : 'Sin Email'}
                    </span>
                </td>
                <td class="table-actions-cell">
                    <button class="btn-action btn-edit" data-id="${propietario.idPropietario}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-action btn-delete" data-id="${propietario.idPropietario}" data-nombre="${propietario.nombre}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Agregar event listeners a los botones de acción
        addTableEventListeners();
    }

    function addTableEventListeners() {
        // Botones editar propietario
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                editPropietario(id);
            });
        });

        // Botones eliminar propietario
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const nombre = this.getAttribute('data-nombre');
                confirmDeletePropietario(id, nombre);
            });
        });
    }

    async function editPropietario(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/propietarios/${id}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const propietario = await response.json();
                showPropietarioModal(propietario);
            } else {
                throw new Error('Error al cargar los datos del propietario');
            }
        } catch (error) {
            console.error('Error cargando propietario:', error);
            showError('Error al cargar los datos del propietario');
        }
    }

    function showPropietarioModal(propietario = null) {
        // Limpiar mensajes de error
        clearErrorMessages();
        
        if (propietario) {
            // Modo edición
            currentEditingId = propietario.idPropietario;
            elements.modalTitle.textContent = 'Editar Propietario';
            elements.nombrePropietario.value = propietario.nombre;
            elements.gmail.value = propietario.gmail || '';
        } else {
            // Modo nuevo
            currentEditingId = null;
            elements.modalTitle.textContent = 'Nuevo Propietario';
            elements.propietarioForm.reset();
        }
        
        elements.modalPropietario.style.display = 'block';
    }

    function confirmDeletePropietario(id, nombre) {
        const confirmModal = elements.modalConfirmacion;
        const message = document.getElementById('confirmacionMensaje');
        
        message.textContent = `¿Estás seguro de que quieres eliminar al propietario "${nombre}"? Esta acción no se puede deshacer.`;
        
        // Configurar el botón de confirmación
        elements.btnConfirmarAccion.onclick = function() {
            deletePropietario(id);
            confirmModal.style.display = 'none';
        };
        
        confirmModal.style.display = 'block';
    }

    async function deletePropietario(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/propietarios/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                showNotification('Propietario eliminado correctamente', 'success');
                await loadDashboardStats();
                await loadPropietarios();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar el propietario');
            }
        } catch (error) {
            console.error('Error eliminando propietario:', error);
            showError(error.message || 'Error al eliminar el propietario');
        }
    }

    function setupEventListeners() {
        // Botón nuevo propietario
        elements.btnNuevoPropietario.addEventListener('click', () => showPropietarioModal());
        
        // Botones cancelar
        elements.btnCancelar.addEventListener('click', () => {
            elements.modalPropietario.style.display = 'none';
        });
        
        // Botón cancelar en confirmación
        elements.btnCancelarAccion.addEventListener('click', () => {
            elements.modalConfirmacion.style.display = 'none';
        });
        
        // Botón limpiar filtros
        elements.btnLimpiarFiltros.addEventListener('click', () => {
            elements.filterEstado.value = 'all';
            elements.searchInput.value = '';
            applyFilters();
        });
        
        // Botón exportar
        elements.btnExportar.addEventListener('click', exportPropietarios);
        
        // Formulario
        elements.propietarioForm.addEventListener('submit', handleSavePropietario);
        
        // Filtros y búsqueda
        elements.filterEstado.addEventListener('change', applyFilters);
        elements.searchInput.addEventListener('input', applyFilters);
        
        // Validación en tiempo real
        elements.nombrePropietario.addEventListener('blur', validateNombre);
        elements.gmail.addEventListener('blur', validateEmail);
        
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
    }

    async function handleSavePropietario(e) {
        e.preventDefault();
        
        const formData = {
            nombre: elements.nombrePropietario.value.trim(),
            gmail: elements.gmail.value.trim() || null
        };

        // Validaciones
        if (!validateForm()) {
            return;
        }

        try {
            setLoadingState(true);
            
            let savedPropietario;

            // Guardar o actualizar propietario
            if (currentEditingId) {
                // Editar propietario existente
                const response = await fetch(`${API_BASE_URL}/propietarios/${currentEditingId}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Error al actualizar el propietario');
                }

                savedPropietario = await response.json();
                showNotification('Propietario actualizado correctamente', 'success');
                
            } else {
                // Crear nuevo propietario
                const response = await fetch(`${API_BASE_URL}/propietarios`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Error al crear el propietario');
                }

                savedPropietario = await response.json();
                showNotification('Propietario creado correctamente', 'success');
            }
            
            elements.modalPropietario.style.display = 'none';
            await loadDashboardStats();
            await loadPropietarios();
            
        } catch (error) {
            console.error('Error guardando propietario:', error);
            showError(error.message || 'Error al guardar el propietario');
        } finally {
            setLoadingState(false);
        }
    }

    function validateForm() {
        let isValid = true;
        
        // Validar nombre
        if (!validateNombre()) {
            isValid = false;
        }
        
        // Validar email si se proporciona
        if (elements.gmail.value.trim() !== '' && !validateEmail()) {
            isValid = false;
        }
        
        return isValid;
    }

    function validateNombre() {
        const nombre = elements.nombrePropietario.value.trim();
        elements.nombreError.textContent = '';
        
        if (!nombre) {
            elements.nombreError.textContent = 'El nombre es requerido';
            return false;
        }
        
        if (nombre.length > 100) {
            elements.nombreError.textContent = 'El nombre no puede exceder 100 caracteres';
            return false;
        }
        
        return true;
    }

    function validateEmail() {
        const email = elements.gmail.value.trim();
        elements.emailError.textContent = '';
        
        if (email === '') {
            return true; // Email es opcional
        }
        
        if (email.length > 100) {
            elements.emailError.textContent = 'El email no puede exceder 100 caracteres';
            return false;
        }
        
        // Validación básica de formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            elements.emailError.textContent = 'El formato del email no es válido';
            return false;
        }
        
        return true;
    }

    function clearErrorMessages() {
        elements.nombreError.textContent = '';
        elements.emailError.textContent = '';
    }

    async function exportPropietarios() {
        try {
            const response = await fetch(`${API_BASE_URL}/propietarios`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const propietarios = await response.json();
                
                // Crear contenido CSV
                let csvContent = "ID,Nombre,Email\n";
                propietarios.forEach(propietario => {
                    csvContent += `"${propietario.idPropietario}","${propietario.nombre}","${propietario.gmail || ''}"\n`;
                });
                
                // Crear y descargar archivo
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'propietarios.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showNotification('Lista de propietarios exportada correctamente', 'success');
            } else {
                throw new Error('Error al exportar los propietarios');
            }
        } catch (error) {
            console.error('Error exportando propietarios:', error);
            showError('Error al exportar la lista de propietarios');
        }
    }

    // Utilidades
    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        };
    }

    function setLoadingState(loading) {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            if (loading) {
                btn.disabled = true;
            } else {
                btn.disabled = false;
            }
        });
        
        if (loading) {
            document.body.style.cursor = 'wait';
        } else {
            document.body.style.cursor = 'default';
        }
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
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

    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function redirectToLogin() {
        window.location.href = '/pages/login.html';
    }

    // Manejar errores no capturados
    window.addEventListener('error', function(e) {
        console.error('Error no capturado:', e.error);
        showError('Ha ocurrido un error inesperado');
    });

    window.addEventListener('unhandledrejection', function(e) {
        console.error('Promesa rechazada no capturada:', e.reason);
        showError('Ha ocurrido un error inesperado');
    });
});