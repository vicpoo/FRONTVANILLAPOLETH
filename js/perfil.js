// perfil.js
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:8000/api';
    let userData = null;
    let authToken = null;

    // Elementos del DOM
    const elements = {
        // Botones principales
        sessionInfoBtn: document.getElementById('sessionInfoBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        
        // Información del perfil
        avatarInitials: document.getElementById('avatarInitials'),
        profileName: document.getElementById('profileName'),
        profileRole: document.getElementById('profileRole'),
        profileEmail: document.getElementById('profileEmail'),
        
        // Estadísticas
        statContratos: document.getElementById('statContratos'),
        statPagos: document.getElementById('statPagos'),
        statActivo: document.getElementById('statActivo'),
        
        // Información personal
        infoUsername: document.getElementById('infoUsername'),
        infoUserType: document.getElementById('infoUserType'),
        infoRole: document.getElementById('infoRole'),
        infoCreatedAt: document.getElementById('infoCreatedAt'),
        
        // Información de contacto
        infoPhone: document.getElementById('infoPhone'),
        infoAddress: document.getElementById('infoAddress'),
        infoAdditional: document.getElementById('infoAdditional'),
        
        // Información específica
        specificInfoContent: document.getElementById('specificInfoContent'),
        
        // Modal de sesión
        sessionModal: document.getElementById('sessionModal'),
        
        // Información de sesión
        sessionUsername: document.getElementById('sessionUsername'),
        sessionRole: document.getElementById('sessionRole'),
        sessionTokenTime: document.getElementById('sessionTokenTime'),
        sessionExpires: document.getElementById('sessionExpires')
    };

    // Inicializar la aplicación
    init();

    async function init() {
        // Verificar autenticación
        authToken = localStorage.getItem('authToken');
        const storedUserData = localStorage.getItem('userData');

        if (!authToken || !storedUserData) {
            redirectToLogin();
            return;
        }

        try {
            userData = JSON.parse(storedUserData);
            await loadUserProfile();
            setupEventListeners();
        } catch (error) {
            console.error('Error inicializando perfil:', error);
            showError('Error al cargar el perfil');
        }
    }

    async function loadUserProfile() {
        try {
            setLoadingState(true);
            
            // Cargar datos básicos del usuario
            displayBasicUserInfo();
            
            // Cargar información específica según el tipo de usuario
            await loadSpecificUserInfo();
            
            // Cargar información adicional si está disponible
            await loadAdditionalUserInfo();
            
            // Cargar estadísticas
            await loadUserStats();
            
        } catch (error) {
            console.error('Error cargando perfil:', error);
            showError('Error al cargar la información del perfil');
        } finally {
            setLoadingState(false);
        }
    }

    function displayBasicUserInfo() {
        if (!userData) return;

        const { usuario, rol, propietario, inquilino, invitado, createdAt } = userData;
        
        // Información básica
        elements.avatarInitials.textContent = getInitials(usuario);
        elements.profileName.textContent = formatUsername(usuario);
        elements.profileRole.textContent = rol?.nombreRol || 'Sin rol';
        elements.profileEmail.textContent = usuario;
        
        // Información personal
        elements.infoUsername.textContent = usuario;
        elements.infoUserType.textContent = getUserType(propietario, inquilino, invitado);
        elements.infoRole.textContent = rol?.nombreRol || 'No especificado';
        elements.infoCreatedAt.textContent = formatDate(createdAt);
        
        // Aplicar estilos según el rol
        applyRoleStyles(rol?.idRol);
    }

    async function loadSpecificUserInfo() {
        if (!userData) return;

        const { propietario, inquilino, invitado } = userData;
        
        try {
            if (propietario) {
                await loadPropietarioInfo(propietario.idPropietario);
            } else if (inquilino) {
                await loadInquilinoInfo(inquilino.idInquilino);
            } else if (invitado) {
                await loadInvitadoInfo(invitado.idInvitado);
            } else {
                showGenericUserInfo();
            }
        } catch (error) {
            console.error('Error cargando información específica:', error);
            elements.specificInfoContent.innerHTML = '<p class="error">Error al cargar información específica</p>';
        }
    }

    async function loadPropietarioInfo(propietarioId) {
        try {
            const response = await fetch(`${API_BASE_URL}/propietarios/${propietarioId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const propietario = await response.json();
                displayPropietarioInfo(propietario);
            } else {
                throw new Error('Error al cargar información del propietario');
            }
        } catch (error) {
            console.error('Error:', error);
            elements.specificInfoContent.innerHTML = `
                <div class="info-grid">
                    <div class="info-item">
                        <label>Tipo</label>
                        <p>Propietario</p>
                    </div>
                    <div class="info-item">
                        <label>Información</label>
                        <p>No se pudo cargar la información detallada</p>
                    </div>
                </div>
            `;
        }
    }

    async function loadInquilinoInfo(inquilinoId) {
        try {
            const response = await fetch(`${API_BASE_URL}/inquilinos/${inquilinoId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const inquilino = await response.json();
                displayInquilinoInfo(inquilino);
            } else {
                throw new Error('Error al cargar información del inquilino');
            }
        } catch (error) {
            console.error('Error:', error);
            elements.specificInfoContent.innerHTML = `
                <div class="info-grid">
                    <div class="info-item">
                        <label>Tipo</label>
                        <p>Inquilino</p>
                    </div>
                    <div class="info-item">
                        <label>Información</label>
                        <p>No se pudo cargar la información detallada</p>
                    </div>
                </div>
            `;
        }
    }

    async function loadInvitadoInfo(invitadoId) {
        elements.specificInfoContent.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <label>Tipo</label>
                    <p>Invitado</p>
                </div>
                <div class="info-item">
                    <label>Acceso</label>
                    <p>Usuario invitado con acceso limitado</p>
                </div>
            </div>
        `;
    }

    function displayPropietarioInfo(propietario) {
        const html = `
            <div class="info-grid">
                <div class="info-item">
                    <label>Tipo de Usuario</label>
                    <p>Propietario</p>
                </div>
                <div class="info-item">
                    <label>ID Propietario</label>
                    <p>${propietario.idPropietario || 'N/A'}</p>
                </div>
                <div class="info-item">
                    <label>Estado</label>
                    <p>${propietario.estado || 'Activo'}</p>
                </div>
                <div class="info-item full-width">
                    <label>Propiedades</label>
                    <p>${propietario.cantidadPropiedades || '0'} propiedades registradas</p>
                </div>
            </div>
        `;
        elements.specificInfoContent.innerHTML = html;
        
        // Actualizar información de contacto si está disponible
        if (propietario.telefono) {
            elements.infoPhone.textContent = propietario.telefono;
        }
        if (propietario.direccion) {
            elements.infoAddress.textContent = propietario.direccion;
        }
    }

    function displayInquilinoInfo(inquilino) {
        const html = `
            <div class="info-grid">
                <div class="info-item">
                    <label>Tipo de Usuario</label>
                    <p>Inquilino</p>
                </div>
                <div class="info-item">
                    <label>ID Inquilino</label>
                    <p>${inquilino.idInquilino || 'N/A'}</p>
                </div>
                <div class="info-item">
                    <label>Estado</label>
                    <p>${inquilino.estado || 'Activo'}</p>
                </div>
                <div class="info-item">
                    <label>Contrato Activo</label>
                    <p>${inquilino.contratoActivo ? 'Sí' : 'No'}</p>
                </div>
            </div>
        `;
        elements.specificInfoContent.innerHTML = html;
        
        // Actualizar información de contacto si está disponible
        if (inquilino.telefono) {
            elements.infoPhone.textContent = inquilino.telefono;
        }
        if (inquilino.direccion) {
            elements.infoAddress.textContent = inquilino.direccion;
        }
    }

    function showGenericUserInfo() {
        elements.specificInfoContent.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <label>Tipo de Usuario</label>
                    <p>Usuario del Sistema</p>
                </div>
                <div class="info-item full-width">
                    <label>Descripción</label>
                    <p>Usuario con acceso general al sistema</p>
                </div>
            </div>
        `;
    }

    async function loadUserStats() {
        try {
            // Cargar estadísticas reales desde la API
            const [contratosResponse, pagosResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/contratos/count`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${API_BASE_URL}/pagos/count`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            let contratosCount = 0;
            let pagosCount = 0;

            if (contratosResponse.ok) {
                const data = await contratosResponse.json();
                contratosCount = data.count || 0;
            }

            if (pagosResponse.ok) {
                const data = await pagosResponse.json();
                pagosCount = data.count || 0;
            }

            elements.statContratos.textContent = contratosCount;
            elements.statPagos.textContent = pagosCount;
            elements.statActivo.textContent = 'Sí';

        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            // Valores por defecto en caso de error
            elements.statContratos.textContent = '0';
            elements.statPagos.textContent = '0';
            elements.statActivo.textContent = 'Sí';
        }
    }

    async function loadAdditionalUserInfo() {
        // Aquí puedes cargar información adicional de otras APIs si es necesario
        console.log('Cargando información adicional del usuario...');
    }

    function setupEventListeners() {
        // Botones de acción
        elements.sessionInfoBtn.addEventListener('click', showSessionInfo);
        elements.logoutBtn.addEventListener('click', handleLogout);
        
        // Modal
        setupModalEvents();
    }

    function setupModalEvents() {
        // Cerrar modal al hacer click en la X
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });

        // Cerrar modal al hacer click fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.style.display = 'none';
                }
            });
        });
    }

    function handleLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            redirectToLogin();
        }
    }

    function showSessionInfo() {
        if (userData) {
            elements.sessionUsername.textContent = userData.usuario;
            elements.sessionRole.textContent = userData.rol?.nombreRol || 'No especificado';
            elements.sessionTokenTime.textContent = new Date().toLocaleString();
            
            // Calcular expiración (24 horas desde ahora)
            const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000);
            elements.sessionExpires.textContent = expiration.toLocaleString();
        }
        elements.sessionModal.style.display = 'block';
    }

    // Utilidades
    function getInitials(username) {
        return username ? username.substring(0, 2).toUpperCase() : 'US';
    }

    function formatUsername(username) {
        return username ? username.charAt(0).toUpperCase() + username.slice(1) : 'Usuario';
    }

    function getUserType(propietario, inquilino, invitado) {
        if (propietario) return 'Propietario';
        if (inquilino) return 'Inquilino';
        if (invitado) return 'Invitado';
        return 'Usuario del Sistema';
    }

    function formatDate(dateString) {
        if (!dateString) return 'No disponible';
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function applyRoleStyles(roleId) {
        const roleBadge = elements.profileRole;
        roleBadge.className = 'profile-role ';
        
        switch(roleId) {
            case 1:
                roleBadge.classList.add('badge-administrador');
                break;
            case 2:
                roleBadge.classList.add('badge-propietario');
                break;
            case 3:
                roleBadge.classList.add('badge-inquilino');
                break;
            default:
                roleBadge.style.background = 'var(--primary-light)';
                roleBadge.style.color = 'var(--primary-color)';
        }
    }

    function setLoadingState(loading) {
        // Implementar indicador de carga si es necesario
        if (loading) {
            document.body.style.cursor = 'wait';
        } else {
            document.body.style.cursor = 'default';
        }
    }

    function showNotification(message, type = 'success') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Agregar al body
        document.body.appendChild(notification);
        
        // Remover después de 5 segundos
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

    function redirectToLogin() {
        window.location.href = '/pages/login.html';
    }

    // Manejar errores no capturados
    window.addEventListener('error', function(e) {
        console.error('Error no capturado:', e.error);
        showError('Ha ocurrido un error inesperado');
    });

    // Manejar promesas rechazadas no capturadas
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Promesa rechazada no capturada:', e.reason);
        showError('Ha ocurrido un error inesperado');
    });
});