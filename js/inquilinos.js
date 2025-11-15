//inquilinos.html
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:8000/api';
    let authToken = null;
    let currentEditingId = null;
    let currentEditingLoginId = null;
    let inquilinosData = [];
    let rolesData = [];

    // Elementos del DOM
    const elements = {
        // Botones principales
        btnNuevoInquilino: document.getElementById('btnNuevoInquilino'),
        btnExportar: document.getElementById('btnExportar'),
        btnLimpiarFiltros: document.getElementById('btnLimpiarFiltros'),
        
        // Estadísticas
        totalInquilinos: document.getElementById('totalInquilinos'),
        inquilinosConUsuario: document.getElementById('inquilinosConUsuario'),
        inquilinosSinUsuario: document.getElementById('inquilinosSinUsuario'),
        usuariosActivos: document.getElementById('usuariosActivos'),
        
        // Filtros
        filterEstado: document.getElementById('filterEstado'),
        filterRol: document.getElementById('filterRol'),
        
        // Tabla
        searchInput: document.getElementById('searchInput'),
        inquilinosTableBody: document.getElementById('inquilinosTableBody'),
        
        // Modales
        modalInquilino: document.getElementById('modalInquilino'),
        modalUsuario: document.getElementById('modalUsuario'),
        modalInfoUsuario: document.getElementById('modalInfoUsuario'),
        modalConfirmacion: document.getElementById('modalConfirmacion'),
        inquilinoForm: document.getElementById('inquilinoForm'),
        usuarioForm: document.getElementById('usuarioForm'),
        modalTitle: document.getElementById('modalTitle'),
        modalUsuarioTitle: document.getElementById('modalUsuarioTitle'),
        
        // Formulario inquilino
        nombreInquilino: document.getElementById('nombreInquilino'),
        telefonoInquilino: document.getElementById('telefonoInquilino'),
        email: document.getElementById('email'),
        ine: document.getElementById('ine'),
        
        // Formulario usuario
        usuario: document.getElementById('usuario'),
        contrasena: document.getElementById('contrasena'),
        confirmarContrasena: document.getElementById('confirmarContrasena'),
        rol: document.getElementById('rol'),
        
        // Modal información usuario
        infoUsuario: document.getElementById('infoUsuario'),
        infoContrasena: document.getElementById('infoContrasena'),
        btnCopiarContrasena: document.getElementById('btnCopiarContrasena'),
        btnCerrarInfo: document.getElementById('btnCerrarInfo'),
        
        // Botones de acción
        btnCancelar: document.getElementById('btnCancelar'),
        btnGuardar: document.getElementById('btnGuardar'),
        btnCancelarUsuario: document.getElementById('btnCancelarUsuario'),
        btnGuardarUsuario: document.getElementById('btnGuardarUsuario'),
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
            await loadInquilinos();
            setupEventListeners();
            populateFilterRoles();
        } catch (error) {
            console.error('Error inicializando inquilinos:', error);
            showError('Error al cargar la vista de inquilinos');
        }
    }

    async function loadRoles() {
        try {
            const response = await fetch(`${API_BASE_URL}/roles`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                rolesData = await response.json();
            } else {
                // Si no hay endpoint de roles, usar valores por defecto
                rolesData = [
                    { idRol: 1, nombreRol: 'Administrador' },
                    { idRol: 2, nombreRol: 'Propietario' },
                    { idRol: 3, nombreRol: 'Inquilino' }
                ];
            }
        } catch (error) {
            console.error('Error cargando roles:', error);
            // Valores por defecto en caso de error
            rolesData = [
                { idRol: 1, nombreRol: 'Administrador' },
                { idRol: 2, nombreRol: 'Propietario' },
                { idRol: 3, nombreRol: 'Inquilino' }
            ];
        }
    }

    function populateFilterRoles() {
        const filterRol = elements.filterRol;
        filterRol.innerHTML = '<option value="all">Todos los roles</option>';
        
        rolesData.forEach(rol => {
            const option = document.createElement('option');
            option.value = rol.idRol;
            option.textContent = rol.nombreRol;
            filterRol.appendChild(option);
        });
    }

    function populateRolSelect(selectElement) {
        selectElement.innerHTML = '<option value="">Seleccione un rol</option>';
        
        rolesData.forEach(rol => {
            const option = document.createElement('option');
            option.value = rol.idRol;
            option.textContent = rol.nombreRol;
            selectElement.appendChild(option);
        });
    }

    async function loadDashboardStats() {
        try {
            const [inquilinosResponse, loginsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/inquilinos`, {
                    headers: getAuthHeaders()
                }),
                fetch(`${API_BASE_URL}/logins`, {
                    headers: getAuthHeaders()
                })
            ]);

            if (inquilinosResponse.ok && loginsResponse.ok) {
                const inquilinos = await inquilinosResponse.json();
                const logins = await loginsResponse.json();
                
                // Contar inquilinos con usuario
                const inquilinosConUsuario = logins.filter(login => login.inquilino !== null).length;
                const usuariosActivos = logins.length;
                
                // Actualizar estadísticas
                elements.totalInquilinos.textContent = inquilinos.length;
                elements.inquilinosConUsuario.textContent = inquilinosConUsuario;
                elements.inquilinosSinUsuario.textContent = inquilinos.length - inquilinosConUsuario;
                elements.usuariosActivos.textContent = usuariosActivos;
                
            } else {
                throw new Error('Error al cargar las estadísticas');
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            // Valores por defecto en caso de error
            elements.totalInquilinos.textContent = '0';
            elements.inquilinosConUsuario.textContent = '0';
            elements.inquilinosSinUsuario.textContent = '0';
            elements.usuariosActivos.textContent = '0';
        }
    }

    async function loadInquilinos() {
        try {
            setLoadingState(true);
            
            const [inquilinosResponse, loginsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/inquilinos`, {
                    headers: getAuthHeaders()
                }),
                fetch(`${API_BASE_URL}/logins`, {
                    headers: getAuthHeaders()
                })
            ]);

            if (inquilinosResponse.ok && loginsResponse.ok) {
                const inquilinos = await inquilinosResponse.json();
                const logins = await loginsResponse.json();
                
                // Combinar datos de inquilinos con sus usuarios
                inquilinosData = inquilinos.map(inquilino => {
                    const login = logins.find(l => l.inquilino && l.inquilino.idInquilino === inquilino.idInquilino);
                    return {
                        ...inquilino,
                        login: login || null
                    };
                });
                
                applyFilters();
            } else {
                throw new Error('Error al cargar los inquilinos');
            }
        } catch (error) {
            console.error('Error cargando inquilinos:', error);
            showError('Error al cargar la lista de inquilinos');
        } finally {
            setLoadingState(false);
        }
    }

    function applyFilters() {
        const estadoFilter = elements.filterEstado.value;
        const rolFilter = elements.filterRol.value;
        const searchTerm = elements.searchInput.value.toLowerCase();

        let filteredData = [...inquilinosData];

        // Filtrar por estado
        if (estadoFilter === 'with-user') {
            filteredData = filteredData.filter(item => item.login !== null);
        } else if (estadoFilter === 'without-user') {
            filteredData = filteredData.filter(item => item.login === null);
        }

        // Filtrar por rol
        if (rolFilter !== 'all') {
            filteredData = filteredData.filter(item => 
                item.login && item.login.rol && item.login.rol.idRol === parseInt(rolFilter)
            );
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            filteredData = filteredData.filter(item => 
                item.nombreInquilino.toLowerCase().includes(searchTerm) ||
                item.email.toLowerCase().includes(searchTerm) ||
                item.ine.toLowerCase().includes(searchTerm) ||
                (item.login && item.login.usuario.toLowerCase().includes(searchTerm)) ||
                (item.login && item.login.rol && item.login.rol.nombreRol.toLowerCase().includes(searchTerm))
            );
        }

        displayInquilinos(filteredData);
    }

    function displayInquilinos(inquilinos) {
        const tbody = elements.inquilinosTableBody;
        tbody.innerHTML = '';

        if (inquilinos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 40px;">
                        <i class="fas fa-users" style="font-size: 48px; color: var(--gray); margin-bottom: 16px;"></i>
                        <p>No hay inquilinos que coincidan con los filtros</p>
                    </td>
                </tr>
            `;
            return;
        }

        inquilinos.forEach(inquilino => {
            const tieneUsuario = inquilino.login !== null;
            const nombreRol = tieneUsuario && inquilino.login.rol ? inquilino.login.rol.nombreRol : 'N/A';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${inquilino.idInquilino}</td>
                <td>${escapeHtml(inquilino.nombreInquilino)}</td>
                <td>${escapeHtml(inquilino.telefonoInquilino || 'No especificado')}</td>
                <td>${escapeHtml(inquilino.email)}</td>
                <td>${escapeHtml(inquilino.ine)}</td>
                <td>${tieneUsuario ? escapeHtml(inquilino.login.usuario) : 'Sin usuario'}</td>
                <td>${escapeHtml(nombreRol)}</td>
                <td>
                    <span class="status-badge ${tieneUsuario ? 'status-with-user' : 'status-without-user'}">
                        ${tieneUsuario ? 'Con Usuario' : 'Sin Usuario'}
                    </span>
                </td>
                <td class="table-actions-cell">
                    <button class="btn-action btn-edit-inquilino" data-id="${inquilino.idInquilino}">
                        <i class="fas fa-edit"></i> Editar Inquilino
                    </button>
                    ${tieneUsuario ? `
                    <button class="btn-action btn-edit-usuario" data-id="${inquilino.login.idLogin}">
                        <i class="fas fa-user-edit"></i> Editar Usuario
                    </button>
                    <button class="btn-action btn-delete-usuario" data-id="${inquilino.login.idLogin}" data-usuario="${inquilino.login.usuario}">
                        <i class="fas fa-user-times"></i> Eliminar Usuario
                    </button>
                    ` : `
                    <button class="btn-generate-user" data-id="${inquilino.idInquilino}" data-email="${inquilino.email}">
                        <i class="fas fa-user-plus"></i> Crear Usuario
                    </button>
                    `}
                    <button class="btn-action btn-delete-inquilino" data-id="${inquilino.idInquilino}" data-nombre="${inquilino.nombreInquilino}">
                        <i class="fas fa-trash"></i> Eliminar Inquilino
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Agregar event listeners a los botones de acción
        addTableEventListeners();
    }

    function addTableEventListeners() {
        // Botones editar inquilino
        document.querySelectorAll('.btn-edit-inquilino').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                editInquilino(id);
            });
        });

        // Botones editar usuario
        document.querySelectorAll('.btn-edit-usuario').forEach(btn => {
            btn.addEventListener('click', function() {
                const loginId = this.getAttribute('data-id');
                editUsuario(loginId);
            });
        });

        // Botones crear usuario
        document.querySelectorAll('.btn-generate-user').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const email = this.getAttribute('data-email');
                showUsuarioModal(id, email);
            });
        });

        // Botones eliminar usuario
        document.querySelectorAll('.btn-delete-usuario').forEach(btn => {
            btn.addEventListener('click', function() {
                const loginId = this.getAttribute('data-id');
                const usuario = this.getAttribute('data-usuario');
                confirmDeleteUsuario(loginId, usuario);
            });
        });

        // Botones eliminar inquilino
        document.querySelectorAll('.btn-delete-inquilino').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const nombre = this.getAttribute('data-nombre');
                confirmDeleteInquilino(id, nombre);
            });
        });
    }

    async function editInquilino(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/inquilinos/${id}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const inquilino = await response.json();
                showInquilinoModal(inquilino);
            } else {
                throw new Error('Error al cargar los datos del inquilino');
            }
        } catch (error) {
            console.error('Error cargando inquilino:', error);
            showError('Error al cargar los datos del inquilino');
        }
    }

    async function editUsuario(loginId) {
        try {
            const response = await fetch(`${API_BASE_URL}/logins/${loginId}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const login = await response.json();
                showUsuarioModal(null, null, login);
            } else {
                throw new Error('Error al cargar los datos del usuario');
            }
        } catch (error) {
            console.error('Error cargando usuario:', error);
            showError('Error al cargar los datos del usuario');
        }
    }

    function showInquilinoModal(inquilino = null) {
        if (inquilino) {
            // Modo edición
            currentEditingId = inquilino.idInquilino;
            elements.modalTitle.textContent = 'Editar Inquilino';
            elements.nombreInquilino.value = inquilino.nombreInquilino;
            elements.telefonoInquilino.value = inquilino.telefonoInquilino || '';
            elements.email.value = inquilino.email;
            elements.ine.value = inquilino.ine;
        } else {
            // Modo nuevo
            currentEditingId = null;
            elements.modalTitle.textContent = 'Nuevo Inquilino';
            elements.inquilinoForm.reset();
        }
        
        elements.modalInquilino.style.display = 'block';
    }

    function showUsuarioModal(inquilinoId = null, email = null, login = null) {
        populateRolSelect(elements.rol);
        
        if (login) {
            // Modo edición de usuario existente
            currentEditingLoginId = login.idLogin;
            elements.modalUsuarioTitle.textContent = 'Editar Usuario';
            elements.usuario.value = login.usuario;
            elements.contrasena.value = '';
            elements.confirmarContrasena.value = '';
            elements.rol.value = login.rol ? login.rol.idRol : '';
            
            // Ocultar campos de contraseña o hacerlos opcionales
            elements.contrasena.required = false;
            elements.confirmarContrasena.required = false;
            elements.contrasena.placeholder = 'Dejar vacío para mantener contraseña actual';
            elements.confirmarContrasena.placeholder = 'Dejar vacío para mantener contraseña actual';
        } else {
            // Modo creación de nuevo usuario
            currentEditingLoginId = null;
            elements.modalUsuarioTitle.textContent = 'Crear Usuario para Inquilino';
            elements.usuarioForm.reset();
            
            // Hacer campos de contraseña obligatorios
            elements.contrasena.required = true;
            elements.confirmarContrasena.required = true;
            elements.contrasena.placeholder = 'Contraseña para el usuario';
            elements.confirmarContrasena.placeholder = 'Confirmar contraseña';
            
            // Establecer rol por defecto como inquilino
            const rolInquilino = rolesData.find(rol => rol.nombreRol.toLowerCase() === 'inquilino');
            if (rolInquilino) {
                elements.rol.value = rolInquilino.idRol;
            }
            
            // Generar usuario automáticamente basado en el email
            if (email) {
                const usuario = email.split('@')[0].toLowerCase();
                elements.usuario.value = usuario;
            }
        }
        
        // Guardar el ID del inquilino para cuando creemos el usuario
        if (inquilinoId) {
            elements.usuarioForm.dataset.inquilinoId = inquilinoId;
        } else {
            delete elements.usuarioForm.dataset.inquilinoId;
        }
        
        elements.modalUsuario.style.display = 'block';
    }

    async function crearUsuarioParaInquilino(inquilinoId, usuario, contrasena, rolId) {
        try {
            // Crear el objeto login
            const loginData = {
                usuario: usuario,
                contrasena: contrasena,
                rol: { idRol: parseInt(rolId) },
                inquilino: { idInquilino: parseInt(inquilinoId) }
            };

            const response = await fetch(`${API_BASE_URL}/logins`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(loginData)
            });

            if (response.ok) {
                const loginCreado = await response.json();
                showUserInfo(usuario, contrasena);
                await loadDashboardStats();
                await loadInquilinos();
                return true;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear el usuario');
            }
        } catch (error) {
            console.error('Error creando usuario:', error);
            throw error;
        }
    }

    async function actualizarUsuario(loginId, usuario, contrasena = null, rolId) {
        try {
            let loginData = {
                usuario: usuario,
                rol: { idRol: parseInt(rolId) }
            };

            // Solo incluir contraseña si se proporcionó una nueva
            if (contrasena && contrasena.trim() !== '') {
                loginData.contrasena = contrasena;
            }

            const response = await fetch(`${API_BASE_URL}/logins/${loginId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(loginData)
            });

            if (response.ok) {
                const loginActualizado = await response.json();
                showNotification('Usuario actualizado correctamente', 'success');
                await loadDashboardStats();
                await loadInquilinos();
                return true;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al actualizar el usuario');
            }
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            throw error;
        }
    }

    function showUserInfo(usuario, contrasena) {
        elements.infoUsuario.textContent = usuario;
        elements.infoContrasena.textContent = contrasena;
        elements.modalInfoUsuario.style.display = 'block';
    }

    function confirmDeleteUsuario(loginId, usuario) {
        const confirmModal = elements.modalConfirmacion;
        const message = document.getElementById('confirmacionMensaje');
        
        message.textContent = `¿Estás seguro de que quieres eliminar el usuario "${usuario}"? Esta acción no se puede deshacer.`;
        
        // Configurar el botón de confirmación
        elements.btnConfirmarAccion.onclick = function() {
            deleteUsuario(loginId);
            confirmModal.style.display = 'none';
        };
        
        confirmModal.style.display = 'block';
    }

    function confirmDeleteInquilino(id, nombre) {
        const confirmModal = elements.modalConfirmacion;
        const message = document.getElementById('confirmacionMensaje');
        
        const inquilino = inquilinosData.find(i => i.idInquilino === parseInt(id));
        const tieneUsuario = inquilino && inquilino.login !== null;
        
        if (tieneUsuario) {
            message.textContent = `¿Estás seguro de que quieres eliminar al inquilino "${nombre}"? Se eliminará tanto el inquilino como su usuario asociado. Esta acción no se puede deshacer.`;
        } else {
            message.textContent = `¿Estás seguro de que quieres eliminar al inquilino "${nombre}"? Esta acción no se puede deshacer.`;
        }
        
        // Configurar el botón de confirmación
        elements.btnConfirmarAccion.onclick = function() {
            deleteInquilino(id);
            confirmModal.style.display = 'none';
        };
        
        confirmModal.style.display = 'block';
    }

    async function deleteUsuario(loginId) {
        try {
            const response = await fetch(`${API_BASE_URL}/logins/${loginId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                showNotification('Usuario eliminado correctamente', 'success');
                await loadDashboardStats();
                await loadInquilinos();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar el usuario');
            }
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            showError(error.message || 'Error al eliminar el usuario');
        }
    }

    async function deleteInquilino(id) {
        try {
            // Primero verificar si tiene usuario asociado
            const inquilino = inquilinosData.find(i => i.idInquilino === parseInt(id));
            
            // Si tiene usuario, eliminarlo primero
            if (inquilino && inquilino.login) {
                try {
                    await deleteUsuario(inquilino.login.idLogin);
                } catch (error) {
                    console.warn('No se pudo eliminar el usuario asociado:', error);
                    // Continuar con la eliminación del inquilino aunque falle la eliminación del usuario
                }
            }

            // Luego eliminar el inquilino
            const response = await fetch(`${API_BASE_URL}/inquilinos/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                showNotification('Inquilino eliminado correctamente', 'success');
                await loadDashboardStats();
                await loadInquilinos();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar el inquilino');
            }
        } catch (error) {
            console.error('Error eliminando inquilino:', error);
            showError(error.message || 'Error al eliminar el inquilino');
        }
    }

    function setupEventListeners() {
        // Botón nuevo inquilino
        elements.btnNuevoInquilino.addEventListener('click', () => showInquilinoModal());
        
        // Botones cancelar
        elements.btnCancelar.addEventListener('click', () => {
            elements.modalInquilino.style.display = 'none';
        });
        
        elements.btnCancelarUsuario.addEventListener('click', () => {
            elements.modalUsuario.style.display = 'none';
        });
        
        // Botón cancelar en confirmación
        elements.btnCancelarAccion.addEventListener('click', () => {
            elements.modalConfirmacion.style.display = 'none';
        });
        
        // Botón copiar contraseña
        elements.btnCopiarContrasena.addEventListener('click', () => {
            navigator.clipboard.writeText(elements.infoContrasena.textContent)
                .then(() => showNotification('Contraseña copiada al portapapeles', 'success'))
                .catch(() => showError('Error al copiar la contraseña'));
        });
        
        // Botón cerrar información de usuario
        elements.btnCerrarInfo.addEventListener('click', () => {
            elements.modalInfoUsuario.style.display = 'none';
        });
        
        // Botón limpiar filtros
        elements.btnLimpiarFiltros.addEventListener('click', () => {
            elements.filterEstado.value = 'all';
            elements.filterRol.value = 'all';
            elements.searchInput.value = '';
            applyFilters();
        });
        
        // Formularios
        elements.inquilinoForm.addEventListener('submit', handleSaveInquilino);
        elements.usuarioForm.addEventListener('submit', handleSaveUsuario);
        
        // Filtros y búsqueda
        elements.filterEstado.addEventListener('change', applyFilters);
        elements.filterRol.addEventListener('change', applyFilters);
        elements.searchInput.addEventListener('input', applyFilters);
        
        // Validación de contraseña en tiempo real
        elements.contrasena.addEventListener('input', validatePassword);
        elements.confirmarContrasena.addEventListener('input', validatePassword);
        
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

    async function handleSaveInquilino(e) {
        e.preventDefault();
        
        const formData = {
            nombreInquilino: elements.nombreInquilino.value.trim(),
            telefonoInquilino: elements.telefonoInquilino.value.trim() || null,
            email: elements.email.value.trim(),
            ine: elements.ine.value.trim()
        };

        // Validaciones básicas del inquilino
        if (!formData.nombreInquilino || !formData.email || !formData.ine) {
            showError('Todos los campos marcados con * son obligatorios');
            return;
        }

        try {
            setLoadingState(true);
            
            let savedInquilino;

            // Guardar o actualizar inquilino
            if (currentEditingId) {
                // Editar inquilino existente
                const response = await fetch(`${API_BASE_URL}/inquilinos/${currentEditingId}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Error al actualizar el inquilino');
                }

                savedInquilino = await response.json();
                showNotification('Inquilino actualizado correctamente', 'success');
                
            } else {
                // Crear nuevo inquilino
                const inquilinoResponse = await fetch(`${API_BASE_URL}/inquilinos`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(formData)
                });

                if (!inquilinoResponse.ok) {
                    const errorData = await inquilinoResponse.json();
                    throw new Error(errorData.message || 'Error al crear el inquilino');
                }

                savedInquilino = await inquilinoResponse.json();
                showNotification('Inquilino creado correctamente', 'success');
                
                // Ofrecer crear usuario inmediatamente
                const crearUsuario = confirm('¿Desea crear un usuario para este inquilino ahora?');
                if (crearUsuario) {
                    showUsuarioModal(savedInquilino.idInquilino, savedInquilino.email);
                }
            }
            
            elements.modalInquilino.style.display = 'none';
            await loadDashboardStats();
            await loadInquilinos();
            
        } catch (error) {
            console.error('Error guardando inquilino:', error);
            showError(error.message || 'Error al guardar el inquilino');
        } finally {
            setLoadingState(false);
        }
    }

    async function handleSaveUsuario(e) {
        e.preventDefault();
        
        const usuario = elements.usuario.value.trim();
        const contrasena = elements.contrasena.value;
        const confirmarContrasena = elements.confirmarContrasena.value;
        const rolId = elements.rol.value;
        const inquilinoId = elements.usuarioForm.dataset.inquilinoId;

        // Validaciones básicas
        if (!usuario) {
            showError('El usuario es requerido');
            return;
        }

        if (!rolId) {
            showError('El rol es requerido');
            return;
        }

        // Si es creación nueva, validar contraseña
        if (!currentEditingLoginId) {
            if (!contrasena || !confirmarContrasena) {
                showError('La contraseña y confirmación son requeridas');
                return;
            }

            if (contrasena !== confirmarContrasena) {
                showError('Las contraseñas no coinciden');
                return;
            }

            if (!isPasswordStrong(contrasena)) {
                showError('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y números');
                return;
            }
        } else if (contrasena && contrasena !== '') {
            // Si es edición y se proporcionó contraseña, validarla
            if (contrasena !== confirmarContrasena) {
                showError('Las contraseñas no coinciden');
                return;
            }

            if (!isPasswordStrong(contrasena)) {
                showError('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y números');
                return;
            }
        }

        try {
            setLoadingState(true);
            
            let success;
            
            if (currentEditingLoginId) {
                // Actualizar usuario existente
                success = await actualizarUsuario(currentEditingLoginId, usuario, contrasena, rolId);
            } else {
                // Crear nuevo usuario
                success = await crearUsuarioParaInquilino(inquilinoId, usuario, contrasena, rolId);
            }
            
            if (success) {
                elements.modalUsuario.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error guardando usuario:', error);
            showError(error.message || 'Error al guardar el usuario');
        } finally {
            setLoadingState(false);
        }
    }

    function validatePassword() {
        const contrasena = elements.contrasena.value;
        const confirmarContrasena = elements.confirmarContrasena.value;
        
        if (contrasena && confirmarContrasena) {
            if (contrasena !== confirmarContrasena) {
                elements.confirmarContrasena.style.borderColor = 'var(--danger)';
            } else {
                elements.confirmarContrasena.style.borderColor = 'var(--success)';
            }
        }
        
        if (contrasena && !isPasswordStrong(contrasena)) {
            elements.contrasena.style.borderColor = 'var(--warning)';
        } else if (contrasena) {
            elements.contrasena.style.borderColor = 'var(--success)';
        }
    }

    // Utilidades
    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        };
    }

    function isPasswordStrong(password) {
        if (password.length < 8) {
            return false;
        }
        
        // Validar que tenga al menos una mayúscula, una minúscula y un número
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return strongRegex.test(password);
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