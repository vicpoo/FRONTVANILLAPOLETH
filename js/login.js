//login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    
    // URL base de tu API
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
        if (!username || !password) {
            showAlert('warning', 'Campos requeridos', 'Por favor, completa todos los campos');
            return;
        }
        
        // Mostrar estado de carga
        setLoadingState(true);
        
        try {
            // Llamada real a la API
            const response = await authenticateWithAPI(username, password);
            
            // Guardar el token en localStorage
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('userData', JSON.stringify(response.login));
            
            console.log('Login exitoso:', response);
            
            // Mostrar alerta de éxito
            showAlert('success', '¡Éxito!', 'Inicio de sesión exitoso', 2000);
            
            // Redirigir según el rol del usuario después de mostrar la alerta
            setTimeout(() => {
                redirectByRole(response.login.rol.idRol);
            }, 2000);
            
        } catch (error) {
            console.error('Error en login:', error);
            
            // Mostrar alerta de error específica
            let errorTitle = 'Error de inicio de sesión';
            let errorMessage = 'Credenciales incorrectas o problema del servidor';
            
            if (error.message.includes('401') || error.message.includes('credenciales')) {
                errorTitle = 'Credenciales incorrectas';
                errorMessage = 'El usuario o contraseña son incorrectos. Por favor, verifica tus datos.';
            } else if (error.message.includes('500') || error.message.includes('servidor')) {
                errorTitle = 'Error del servidor';
                errorMessage = 'Problema temporal con el servidor. Por favor, intenta más tarde.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorTitle = 'Error de conexión';
                errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
            }
            
            showAlert('error', errorTitle, errorMessage);
            
        } finally {
            setLoadingState(false);
        }
    }
    
    // Función para autenticar con la API real
    async function authenticateWithAPI(username, password) {
        const response = await fetch(`${API_BASE_URL}/logins/autenticar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usuario: username,
                contrasena: password
            })
        });

        if (!response.ok) {
            let errorMessage = 'Error de autenticación';
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (parseError) {
                // Si no se puede parsear la respuesta, usar el status
                if (response.status === 401) {
                    errorMessage = 'Credenciales incorrectas';
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
    
    // Función para redirigir según el rol
    function redirectByRole(roleId) {
        let redirectUrl = '';
        
        switch(roleId) {
            case 1: // Rol ID 1 -> contratos.html
                redirectUrl = '/pages/contratos.html';
                break;
            case 2: // Rol ID 2 -> pagos.html
                redirectUrl = '/pages/pagos.html';
                break;
            default:
                console.warn('Rol no reconocido, redirigiendo a página por defecto');
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
                loginBtn.textContent = 'Iniciando sesión...';
                loginBtn.classList.add('loading');
            } else {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Entrar';
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
                    setTimeout(() => alert.remove(), 300);
                }
            });
        }
    });
    
    // Exponer función showAlert globalmente para uso en la consola (debug)
    window.showAlert = showAlert;
});