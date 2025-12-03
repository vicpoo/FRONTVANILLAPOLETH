// usuarios.js
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:8000/api';
    let authToken = null;
    let currentEditingId = null;
    let usuariosData = [];
    let rolesData = [];

    // Elementos del DOM
    const elements = {
        // Botones principales
        btnNuevoUsuario: document.getElementById('btnNuevoUsuario'),
        btnLimpiarFiltros: document.getElementById('btnLimpiarFiltros'),
        
        // Estadísticas
        totalUsuarios: document.getElementById('totalUsuarios'),
        usuariosActivos: document.getElementById('usuariosActivos'),
        usuariosInactivos: document.getElementById('usuariosInactivos'),
        totalRoles: document.getElementById('totalRoles'),
        
        // Filtros
        filterEstado: document.getElementById('filterEstado'),
        filterRol: document.getElementById('filterRol'),
        
        // Tabla
        searchInput: document.getElementById('searchInput'),
        usuariosTableBody: document.getElementById('usuariosTableBody'),
        
        // Modales
        modalUsuario: document.getElementById('modalUsuario'),
        modalConfirmacion: document.getElementById('modalConfirmacion'),
        usuarioForm: document.getElementById('usuarioForm'),
        modalTitle: document.getElementById('modalTitle'),
        
        // Formulario usuario
        username: document.getElementById('username'),
        password: document.getElementById('password'),
        confirmPassword: document.getElementById('confirmPassword'),
        email: document.getElementById('email'),
        telefono: document.getElementById('telefono'),
        rol: document.getElementById('rol'),
        estado: document.getElementById('estado'),
        
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
            await loadRoles();
            await loadDashboardStats();
            await loadUsuarios();
            setupEventListeners();
            populateFilterRoles();
        } catch (error) {
            console.error('Error inicializando usuarios:', error);
            showError('Error al cargar la vista de usuarios');
        }
    }

    async function loadRoles() {
        try {
            const response = await fetch(`${API_BASE_URL}/roles`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                rolesData = await response.json();
                elements.totalRoles.textContent = rolesData.length;
            } else {
                showError('Error al cargar los roles');
            }
        } catch (error) {
            console.error('Error cargando roles:', error);
            showError('Error al cargar los roles');
        }
    }

    function populateFilterRoles() {
        const filterRol = elements.filterRol;
        filterRol.innerHTML = '<option value="all">Todos los roles</option>';
        
        rolesData.forEach(rol => {
            const option = document.createElement('option');
            option.value = rol.idRoles;
            option.textContent = rol.titulo;
            filterRol.appendChild(option);
        });
    }

    function populateRolSelect(selectElement) {
        selectElement.innerHTML = '<option value="">Seleccione un rol</option>';
        
        rolesData.forEach(rol => {
            const option = document.createElement('option');
            option.value = rol.idRoles;
            option.textContent = rol.titulo;
            selectElement.appendChild(option);
        });
    }

    async function loadDashboardStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/usuarios`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const usuarios = await response.json();
                
                // Contar usuarios activos/inactivos
                const usuariosActivos = usuarios.filter(u => u.estadoUsuario === 'activo').length;
                const usuariosInactivos = usuarios.length - usuariosActivos;
                
                // Actualizar estadísticas
                elements.totalUsuarios.textContent = usuarios.length;
                elements.usuariosActivos.textContent = usuariosActivos;
                elements.usuariosInactivos.textContent = usuariosInactivos;
                
            } else {
                throw new Error('Error al cargar las estadísticas');
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    async function loadUsuarios() {
        try {
            setLoadingState(true);
            
            const response = await fetch(`${API_BASE_URL}/usuarios`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                usuariosData = await response.json();
                applyFilters();
            } else {
                throw new Error('Error al cargar los usuarios');
            }
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            showError('Error al cargar la lista de usuarios');
        } finally {
            setLoadingState(false);
        }
    }

    function applyFilters() {
        const estadoFilter = elements.filterEstado.value;
        const rolFilter = elements.filterRol.value;
        const searchTerm = elements.searchInput.value.toLowerCase();

        let filteredData = [...usuariosData];

        // Filtrar por estado
        if (estadoFilter !== 'all') {
            filteredData = filteredData.filter(item => 
                item.estadoUsuario === estadoFilter
            );
        }

        // Filtrar por rol
        if (rolFilter !== 'all') {
            filteredData = filteredData.filter(item => 
                item.rol && item.rol.idRoles === parseInt(rolFilter)
            );
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            filteredData = filteredData.filter(item => 
                item.username.toLowerCase().includes(searchTerm) ||
                item.email.toLowerCase().includes(searchTerm) ||
                (item.telefono && item.telefono.toLowerCase().includes(searchTerm)) ||
                (item.rol && item.rol.titulo.toLowerCase().includes(searchTerm))
            );
        }

        displayUsuarios(filteredData);
    }

    function displayUsuarios(usuarios) {
        const tbody = elements.usuariosTableBody;
        tbody.innerHTML = '';

        if (usuarios.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px;">
                        <i class="fas fa-users" style="font-size: 48px; color: #ccc; margin-bottom: 16px;"></i>
                        <p>No hay usuarios que coincidan con los filtros</p>
                    </td>
                </tr>
            `;
            return;
        }

        usuarios.forEach(usuario => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${usuario.idUsuario}</td>
                <td>${escapeHtml(usuario.username)}</td>
                <td>${escapeHtml(usuario.email)}</td>
                <td>${escapeHtml(usuario.telefono || 'No especificado')}</td>
                <td>${usuario.rol ? escapeHtml(usuario.rol.titulo) : 'Sin rol'}</td>
                <td>
                    <span class="status-badge status-${usuario.estadoUsuario}">
                        ${usuario.estadoUsuario === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>${formatDate(usuario.createdAt)}</td>
                <td class="table-actions-cell">
                    <button class="btn-action btn-edit" data-id="${usuario.idUsuario}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-action btn-cambiar-estado" data-id="${usuario.idUsuario}" data-estado="${usuario.estadoUsuario}">
                        <i class="fas fa-sync-alt"></i> Cambiar Estado
                    </button>
                    <button class="btn-action btn-delete" data-id="${usuario.idUsuario}" data-username="${usuario.username}">
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
        // Botones editar
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                editUsuario(id);
            });
        });

        // Botones cambiar estado
        document.querySelectorAll('.btn-cambiar-estado').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const estadoActual = this.getAttribute('data-estado');
                const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
                cambiarEstadoUsuario(id, nuevoEstado);
            });
        });

        // Botones eliminar
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const username = this.getAttribute('data-username');
                confirmDeleteUsuario(id, username);
            });
        });
    }

    function showUsuarioModal(usuario = null) {
        populateRolSelect(elements.rol);
        
        if (usuario) {
            // Modo edición
            currentEditingId = usuario.idUsuario;
            elements.modalTitle.textContent = 'Editar Usuario';
            elements.username.value = usuario.username;
            elements.username.disabled = true; // No se puede cambiar el username
            elements.password.required = false;
            elements.confirmPassword.required = false;
            elements.password.placeholder = 'Dejar vacío para mantener contraseña actual';
            elements.confirmPassword.placeholder = 'Dejar vacío para mantener contraseña actual';
            elements.email.value = usuario.email;
            elements.telefono.value = usuario.telefono || '';
            elements.rol.value = usuario.rol ? usuario.rol.idRoles : '';
            elements.estado.value = usuario.estadoUsuario || 'activo';
        } else {
            // Modo nuevo
            currentEditingId = null;
            elements.modalTitle.textContent = 'Nuevo Usuario';
            elements.username.disabled = false;
            elements.password.required = true;
            elements.confirmPassword.required = true;
            elements.password.placeholder = 'Contraseña para el usuario';
            elements.confirmPassword.placeholder = 'Confirmar contraseña';
            elements.usuarioForm.reset();
            elements.estado.value = 'activo';
        }
        
        elements.modalUsuario.style.display = 'block';
    }

    async function editUsuario(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const usuario = await response.json();
                showUsuarioModal(usuario);
            } else {
                throw new Error('Error al cargar los datos del usuario');
            }
        } catch (error) {
            console.error('Error cargando usuario:', error);
            showError('Error al cargar los datos del usuario');
        }
    }

    async function cambiarEstadoUsuario(id, nuevoEstado) {
        try {
            const response = await fetch(`${API_BASE_URL}/usuarios/${id}/estado`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (response.ok) {
                showNotification(`Estado cambiado a ${nuevoEstado}`, 'success');
                await loadDashboardStats();
                await loadUsuarios();
            } else {
                const errorText = await response.text();
                let errorMessage;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorText;
                } catch (e) {
                    errorMessage = errorText;
                }
                throw new Error(errorMessage || 'Error al cambiar el estado');
            }
        } catch (error) {
            console.error('Error cambiando estado:', error);
            showError(error.message || 'Error al cambiar el estado');
        }
    }

    async function handleSaveUsuario(e) {
        e.preventDefault();
        
        const formData = {
            username: elements.username.value.trim(),
            email: elements.email.value.trim(),
            telefono: elements.telefono.value.trim() || null,
            rol: { idRoles: parseInt(elements.rol.value) },
            estadoUsuario: elements.estado.value
        };

        // Solo incluir password si tiene valor
        if (elements.password.value && elements.password.value.trim() !== '') {
            formData.password = elements.password.value;
        }

        // Validaciones básicas
        if (!formData.username) {
            showError('El usuario es requerido');
            return;
        }

        if (!formData.email) {
            showError('El email es requerido');
            return;
        }

        if (!formData.rol.idRoles || isNaN(formData.rol.idRoles)) {
            showError('El rol es requerido');
            return;
        }

        // Si es creación nueva, validar contraseña
        if (!currentEditingId) {
            if (!formData.password) {
                showError('La contraseña es requerida');
                return;
            }

            if (formData.password !== elements.confirmPassword.value) {
                showError('Las contraseñas no coinciden');
                return;
            }

            if (formData.password.length < 8) {
                showError('La contraseña debe tener al menos 8 caracteres');
                return;
            }
        } else if (formData.password) {
            // Si es edición y se proporcionó contraseña, validarla
            if (formData.password !== elements.confirmPassword.value) {
                showError('Las contraseñas no coinciden');
                return;
            }

            if (formData.password.length < 8) {
                showError('La contraseña debe tener al menos 8 caracteres');
                return;
            }
        }

        try {
            setLoadingState(true);
            
            let response;
            let method;
            let url;

            if (currentEditingId) {
                // Actualizar usuario existente
                method = 'PUT';
                url = `${API_BASE_URL}/usuarios/${currentEditingId}`;
            } else {
                // Crear nuevo usuario
                method = 'POST';
                url = `${API_BASE_URL}/usuarios`;
            }

            response = await fetch(url, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showNotification(
                    currentEditingId ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente', 
                    'success'
                );
                
                elements.modalUsuario.style.display = 'none';
                await loadDashboardStats();
                await loadUsuarios();
                
            } else {
                const errorText = await response.text();
                let errorMessage;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorText;
                } catch (e) {
                    errorMessage = errorText;
                }
                throw new Error(errorMessage || `Error al ${currentEditingId ? 'actualizar' : 'crear'} el usuario`);
            }
            
        } catch (error) {
            console.error('Error guardando usuario:', error);
            showError(error.message || 'Error al guardar el usuario');
        } finally {
            setLoadingState(false);
        }
    }

    function confirmDeleteUsuario(id, username) {
        const confirmModal = elements.modalConfirmacion;
        const message = document.getElementById('confirmacionMensaje');
        
        message.textContent = `¿Estás seguro de que quieres eliminar el usuario "${username}"? Esta acción no se puede deshacer.`;
        
        // Configurar el botón de confirmación
        elements.btnConfirmarAccion.onclick = function() {
            deleteUsuario(id);
            confirmModal.style.display = 'none';
        };
        
        confirmModal.style.display = 'block';
    }

    async function deleteUsuario(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok || response.status === 204) {
                showNotification('Usuario eliminado correctamente', 'success');
                await loadDashboardStats();
                await loadUsuarios();
            } else {
                const errorText = await response.text();
                let errorMessage;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorText;
                } catch (e) {
                    errorMessage = errorText;
                }
                throw new Error(errorMessage || 'Error al eliminar el usuario');
            }
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            showError(error.message || 'Error al eliminar el usuario');
        }
    }

    function setupEventListeners() {
        // Botón nuevo usuario
        elements.btnNuevoUsuario.addEventListener('click', () => showUsuarioModal());
        
        // Botón cancelar
        elements.btnCancelar.addEventListener('click', () => {
            elements.modalUsuario.style.display = 'none';
        });
        
        // Botón cancelar en confirmación
        elements.btnCancelarAccion.addEventListener('click', () => {
            elements.modalConfirmacion.style.display = 'none';
        });
        
        // Botón limpiar filtros
        elements.btnLimpiarFiltros.addEventListener('click', () => {
            elements.filterEstado.value = 'all';
            elements.filterRol.value = 'all';
            elements.searchInput.value = '';
            applyFilters();
        });
        
        // Formulario
        elements.usuarioForm.addEventListener('submit', handleSaveUsuario);
        
        // Filtros y búsqueda
        elements.filterEstado.addEventListener('change', applyFilters);
        elements.filterRol.addEventListener('change', applyFilters);
        elements.searchInput.addEventListener('input', applyFilters);
        
        // Validación de contraseña en tiempo real
        elements.password.addEventListener('input', validatePassword);
        elements.confirmPassword.addEventListener('input', validatePassword);
        
        // Cerrar modales al hacer click en la X
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });

        // Cerrar modales al hacer click fuera
        window.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    function validatePassword() {
        const password = elements.password.value;
        const confirmPassword = elements.confirmPassword.value;
        
        if (password && confirmPassword) {
            if (password !== confirmPassword) {
                elements.confirmPassword.style.borderColor = '#e74c3c';
            } else {
                elements.confirmPassword.style.borderColor = '#27ae60';
            }
        } else {
            elements.confirmPassword.style.borderColor = '';
        }
        
        if (password && password.length > 0) {
            if (password.length < 8) {
                elements.password.style.borderColor = '#f39c12';
            } else {
                elements.password.style.borderColor = '#27ae60';
            }
        } else {
            elements.password.style.borderColor = '';
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
            btn.disabled = loading;
        });
        
        document.body.style.cursor = loading ? 'wait' : 'default';
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            color: white;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        `;
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
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('es-MX', options);
    }

    function redirectToLogin() {
        window.location.href = '/pages/login.html';
    }
});