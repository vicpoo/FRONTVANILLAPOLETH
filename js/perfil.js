// perfil.js
// perfil.js
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:8000/api';
    let userData = null;
    let authToken = null;
    let tokenClaims = null;

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
        statUsuarioId: document.getElementById('statUsuarioId'),
        statEstado: document.getElementById('statEstado'),
        statRolId: document.getElementById('statRolId'),
        
        // Información personal
        infoUsername: document.getElementById('infoUsername'),
        infoEmail: document.getElementById('infoEmail'),
        infoRole: document.getElementById('infoRole'),
        infoCreatedAt: document.getElementById('infoCreatedAt'),
        
        // Información del sistema
        systemUserId: document.getElementById('systemUserId'),
        systemUserStatus: document.getElementById('systemUserStatus'),
        systemRoleId: document.getElementById('systemRoleId'),
        systemRoleName: document.getElementById('systemRoleName'),
        
        // Información de contacto
        infoPhone: document.getElementById('infoPhone'),
        infoContactEmail: document.getElementById('infoContactEmail'),
        
        // Modal de sesión
        sessionModal: document.getElementById('sessionModal'),
        
        // Información de sesión
        sessionUsername: document.getElementById('sessionUsername'),
        sessionRole: document.getElementById('sessionRole'),
        sessionEmail: document.getElementById('sessionEmail'),
        sessionTokenTime: document.getElementById('sessionTokenTime'),
        sessionExpires: document.getElementById('sessionExpires')
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
            // Decodificar token JWT
            tokenClaims = decodeJWT(authToken);
            console.log('Token claims:', tokenClaims);

            // Cargar datos del usuario desde la API
            await loadUserProfile();
            setupEventListeners();
        } catch (error) {
            console.error('Error inicializando perfil:', error);
            showError('Error al cargar el perfil. Por favor inicia sesión nuevamente.');
            setTimeout(() => redirectToLogin(), 2000);
        }
    }

    function decodeJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Error decodificando JWT:', e);
            throw new Error('Token inválido');
        }
    }

    async function loadUserProfile() {
        try {
            setLoadingState(true);
            
            // Obtener ID del usuario desde el token
            const userId = tokenClaims.id;
            
            if (!userId) {
                throw new Error('No se pudo obtener el ID del usuario del token');
            }

            // Obtener datos completos del usuario desde la API
            const response = await fetch(`${API_BASE_URL}/usuarios/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Sesión expirada');
                }
                throw new Error('Error al cargar los datos del usuario');
            }

            userData = await response.json();
            console.log('Datos del usuario:', userData);

            // Mostrar información del usuario
            displayUserInfo();
            
        } catch (error) {
            console.error('Error cargando perfil:', error);
            showError('Error al cargar la información del perfil');
            
            // Si el error es de autenticación, redirigir al login
            if (error.message.includes('Sesión expirada') || error.message.includes('Token')) {
                setTimeout(() => redirectToLogin(), 2000);
            }
        } finally {
            setLoadingState(false);
        }
    }

    function displayUserInfo() {
        if (!userData) return;

        // Información básica del header
        const username = userData.username || tokenClaims.sub || 'Usuario';
        const email = userData.email || tokenClaims.email || 'No disponible';
        const roleName = userData.rol?.titulo || tokenClaims.rol || 'Sin rol';

        // Avatar
        elements.avatarInitials.textContent = getInitials(username);
        
        // Header del perfil
        elements.profileName.textContent = formatUsername(username);
        elements.profileRole.textContent = roleName;
        elements.profileEmail.textContent = email;
        
        // Estadísticas en el header
        elements.statUsuarioId.textContent = userData.idUsuario || tokenClaims.id || '-';
        elements.statEstado.textContent = userData.estadoUsuario || 'Activo';
        elements.statRolId.textContent = userData.rol?.idRoles || tokenClaims.rolId || '-';
        
        // Información Personal
        elements.infoUsername.textContent = username;
        elements.infoEmail.textContent = email;
        elements.infoRole.textContent = roleName;
        elements.infoCreatedAt.textContent = formatDate(userData.createdAt);
        
        // Información del Sistema
        elements.systemUserId.textContent = userData.idUsuario || '-';
        elements.systemUserStatus.textContent = userData.estadoUsuario || 'Activo';
        elements.systemRoleId.textContent = userData.rol?.idRoles || '-';
        elements.systemRoleName.textContent = roleName;
        
        // Información de Contacto
        elements.infoPhone.textContent = userData.telefono || 'No especificado';
        elements.infoContactEmail.textContent = email;
        
        // Aplicar estilos según el rol
        applyRoleStyles(userData.rol?.idRoles || tokenClaims.rolId);
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

        // Cerrar modal con tecla ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        });
    }

    function handleLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            showNotification('Sesión cerrada exitosamente', 'success');
            setTimeout(() => redirectToLogin(), 1000);
        }
    }

    function showSessionInfo() {
        if (tokenClaims) {
            // Información de la sesión desde el token
            elements.sessionUsername.textContent = tokenClaims.sub || 'No disponible';
            elements.sessionRole.textContent = tokenClaims.rol || 'No disponible';
            elements.sessionEmail.textContent = tokenClaims.email || 'No disponible';
            
            // Fecha de emisión del token (iat)
            if (tokenClaims.iat) {
                const issuedDate = new Date(tokenClaims.iat * 1000);
                elements.sessionTokenTime.textContent = issuedDate.toLocaleString('es-ES');
            } else {
                elements.sessionTokenTime.textContent = 'No disponible';
            }
            
            // Fecha de expiración del token (exp)
            if (tokenClaims.exp) {
                const expirationDate = new Date(tokenClaims.exp * 1000);
                elements.sessionExpires.textContent = expirationDate.toLocaleString('es-ES');
                
                // Mostrar tiempo restante
                const now = new Date();
                const timeLeft = expirationDate - now;
                
                if (timeLeft > 0) {
                    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                    elements.sessionExpires.textContent += ` (${hoursLeft}h ${minutesLeft}m restantes)`;
                } else {
                    elements.sessionExpires.textContent += ' (EXPIRADO)';
                    showError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
                }
            } else {
                elements.sessionExpires.textContent = 'No disponible';
            }
        }
        elements.sessionModal.style.display = 'block';
    }

    // Utilidades
    function getInitials(username) {
        if (!username) return 'US';
        const words = username.trim().split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return username.substring(0, 2).toUpperCase();
    }

    function formatUsername(username) {
        if (!username) return 'Usuario';
        return username.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    function formatDate(dateString) {
        if (!dateString) return 'No disponible';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Fecha inválida';
        }
    }

    function applyRoleStyles(roleId) {
        const roleBadge = elements.profileRole;
        roleBadge.className = 'profile-role';
        
        // Aplicar estilos según el ID del rol
        switch(Number(roleId)) {
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
        if (loading) {
            document.body.style.cursor = 'wait';
            // Opcionalmente, mostrar un spinner
        } else {
            document.body.style.cursor = 'default';
        }
    }

    function showNotification(message, type = 'success') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            ${message}
        `;
        
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
        // Ajusta esta ruta según tu estructura de carpetas
        window.location.href = '../pages/login.html';
    }

    // Manejar errores no capturados
    window.addEventListener('error', function(e) {
        console.error('Error no capturado:', e.error);
    });

    // Manejar promesas rechazadas no capturadas
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Promesa rechazada no capturada:', e.reason);
    });

    // Verificar expiración del token cada minuto
    setInterval(() => {
        if (tokenClaims && tokenClaims.exp) {
            const now = Date.now() / 1000;
            if (now > tokenClaims.exp) {
                showError('Tu sesión ha expirado. Serás redirigido al login.');
                setTimeout(() => redirectToLogin(), 2000);
            }
        }
    }, 60000); // Cada minuto
});