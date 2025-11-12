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
    
    // Función para manejar el login
    async function handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Validaciones básicas
        if (!username || !password) {
            alert('Por favor, completa todos los campos');
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
            
            // Redirigir según el rol del usuario
            redirectByRole(response.login.rol.idRol);
            
        } catch (error) {
            console.error('Error en login:', error);
            alert(error.message || 'Error al iniciar sesión');
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
            const errorData = await response.json().catch(() => ({ message: 'Error de servidor' }));
            throw new Error(errorData.message || `Error HTTP: ${response.status}`);
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
            case 2: // Rol ID 2 -> index.html
                redirectUrl = 'index.html';
                break;
            default:
                console.warn('Rol no reconocido, redirigiendo a página por defecto');
                redirectUrl = 'index.html';
        }
        
        // Redirigir después de un breve delay para mostrar feedback
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1000);
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
});