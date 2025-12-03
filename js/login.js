//login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    
    // URL base de tu API - Asegúrate que el puerto 8000 es correcto
    const API_BASE_URL = 'http://localhost:8000/api';
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    // Función para mostrar alertas
    function showAlert(type, title, message, duration = 5000) {
        const alertContainer = document.getElementById('alertContainer');
        
        // Limpiar alertas anteriores si hay muchas
        const alerts = alertContainer.querySelectorAll('.alert');
        if (alerts.length > 3) {
            alerts[0].remove();
        }
        
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        alert.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <div class="alert-content">
                <div class="alert-title">${title}</div>
                <div class="alert-message">${message}</div>
            </div>
            <button class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        alertContainer.appendChild(alert);
        
        // Auto-remover después del tiempo especificado
        if (duration > 0) {
            setTimeout(() => {
                if (alert.parentElement) {
                    alert.classList.add('hiding');
                    setTimeout(() => {
                        if (alert.parentElement) {
                            alert.remove();
                        }
                    }, 300);
                }
            }, duration);
        }
        
        return alert;
    }
    
    // Función para manejar el login
    async function handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Validaciones básicas
        if (!username) {
            showAlert('warning', 'Usuario requerido', 'Por favor, ingresa tu nombre de usuario');
            document.getElementById('username').focus();
            return;
        }
        
        if (!password) {
            showAlert('warning', 'Contraseña requerida', 'Por favor, ingresa tu contraseña');
            document.getElementById('password').focus();
            return;
        }
        
        // Mostrar estado de carga
        setLoadingState(true);
        
        try {
            // Llamada a la API con la ruta correcta
            const response = await authenticateWithAPI(username, password);
            
            // Verificar si la respuesta es exitosa
            if (response.success && response.token) {
                // Guardar el token y datos del usuario
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('username', response.username);
                
                console.log('Login exitoso:', response);
                
                // Mostrar alerta de éxito
                showAlert('success', '¡Éxito!', response.message || 'Inicio de sesión exitoso', 2000);
                
                // Obtener información del usuario para redirigir por rol
                // Primero obtenemos el usuario completo usando el token
                setTimeout(async () => {
                    try {
                        // Obtener información del usuario usando el token
                        const userInfo = await getUserInfo(response.token);
                        
                        if (userInfo && userInfo.rol) {
                            redirectByRole(userInfo.rol.idRoles || userInfo.rol.idRol);
                        } else {
                            console.warn('No se pudo obtener información del rol, redirigiendo a home');
                            window.location.href = '/pages/home.html';
                        }
                    } catch (error) {
                        console.error('Error obteniendo info del usuario:', error);
                        window.location.href = '/pages/home.html';
                    }
                }, 2000);
                
            } else {
                throw new Error(response.message || 'Error en la autenticación');
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            
            // Determinar el tipo de error
            let errorTitle = 'Error de inicio de sesión';
            let errorMessage = error.message || 'Credenciales incorrectas o problema del servidor';
            
            if (error.message.includes('401') || 
                error.message.includes('credenciales') || 
                error.message.includes('incorrectos')) {
                errorTitle = 'Credenciales incorrectas';
                errorMessage = 'El usuario o contraseña son incorrectos.';
            } else if (error.message.includes('500') || error.message.includes('servidor')) {
                errorTitle = 'Error del servidor';
                errorMessage = 'Problema temporal con el servidor. Intenta más tarde.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorTitle = 'Error de conexión';
                errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión.';
            } else if (error.message.includes('activo')) {
                errorTitle = 'Usuario inactivo';
                errorMessage = 'Tu cuenta no está activa. Contacta al administrador.';
            }
            
            showAlert('error', errorTitle, errorMessage);
            
        } finally {
            setLoadingState(false);
        }
    }
    
    // Función para autenticar con la API
    async function authenticateWithAPI(username, password) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        // Verificar si la respuesta es OK
        if (!response.ok) {
            let errorMessage = 'Error de autenticación';
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
                // Si no se puede parsear la respuesta, usar el status
                if (response.status === 401) {
                    errorMessage = 'Credenciales incorrectas';
                } else if (response.status === 404) {
                    errorMessage = 'Usuario no encontrado';
                } else if (response.status === 500) {
                    errorMessage = 'Error interno del servidor';
                } else {
                    errorMessage = `Error HTTP: ${response.status}`;
                }
            }
            
            throw new Error(errorMessage);
        }

        return await response.json();
    }
    
    // Función para obtener información del usuario (necesario para saber el rol)
    async function getUserInfo(token) {
        try {
            // Primero intentamos obtener el usuario actual usando el token
            // Puedes necesitar una ruta en tu API para obtener el usuario por token
            // Por ahora, intentaremos obtenerlo del localStorage o hacer una petición
            
            // Si no tienes una ruta específica, puedes intentar obtenerlo del token
            // O crear una ruta en tu API: /api/auth/me
            const response = await fetch(`${API_BASE_URL}/usuarios/username/${localStorage.getItem('username')}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
            
            // Si falla, retornar null
            return null;
        } catch (error) {
            console.error('Error obteniendo info usuario:', error);
            return null;
        }
    }
    
    // Función para redirigir según el rol
    function redirectByRole(roleId) {
        let redirectUrl = '';
        
        // Ajusta estos IDs según los roles en tu base de datos
        switch(parseInt(roleId)) {
            case 1: // Administrador -> contratos.html
                redirectUrl = '/pages/contratos.html';
                break;
            case 2: // Usuario normal -> pagos.html
                redirectUrl = '/pages/pagos.html';
                break;
            case 3: // Otro rol -> home.html
                redirectUrl = '/pages/home.html';
                break;
            default:
                console.warn(`Rol no reconocido: ${roleId}, redirigiendo a home`);
                redirectUrl = '/pages/home.html';
        }
        
        // Redirigir
        window.location.href = redirectUrl;
    }
    
    // Controlar estado de carga
    function setLoadingState(loading) {
        if (loginBtn) {
            if (loading) {
                loginBtn.disabled = true;
                btnText.textContent = 'Iniciando sesión...';
                loginBtn.classList.add('loading');
            } else {
                loginBtn.disabled = false;
                btnText.textContent = 'Entrar';
                loginBtn.classList.remove('loading');
            }
        }
    }
    
    // Permitir enviar el formulario con Enter
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (loginForm && !loginBtn.disabled) {
                handleLogin();
            }
        }
    });
    
    // Limpiar alertas al hacer clic en cualquier parte (opcional)
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.alert')) {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(alert => {
                if (!alert.contains(e.target)) {
                    alert.classList.add('hiding');
                    setTimeout(() => {
                        if (alert.parentElement) {
                            alert.remove();
                        }
                    }, 300);
                }
            });
        }
    });
    
    // Exponer función showAlert globalmente para uso en la consola (debug)
    window.showAlert = showAlert;
    
    // Verificar si ya está logueado
    checkExistingLogin();
    
    function checkExistingLogin() {
        const token = localStorage.getItem('authToken');
        if (token) {
            console.log('Usuario ya autenticado, token encontrado');
            // Opcional: Verificar si el token sigue siendo válido
            // y redirigir automáticamente
        }
    }
});