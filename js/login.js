//login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    
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
            // Simular llamada a la API
            await simulateAPILogin(username, password);
            
            // Mostrar éxito
            console.log('Login exitoso');
            
            // Redirigir después del login (aquí puedes cambiar la URL)
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } catch (error) {
            alert(error.message || 'Error al iniciar sesión');
        } finally {
            setLoadingState(false);
        }
    }
    
    // Simular llamada a la API
    function simulateAPILogin(username, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simular validación (en producción esto vendrá de la API)
                if (username && password) {
                    // Simular credenciales incorrectas para demo
                    if (password === 'error') {
                        reject(new Error('Credenciales incorrectas'));
                    } else {
                        resolve({
                            success: true,
                            user: {
                                username: username,
                                token: 'simulated-token-' + Date.now()
                            }
                        });
                    }
                } else {
                    reject(new Error('Datos incompletos'));
                }
            }, 1500);
        });
    }
    
    // Controlar estado de carga
    function setLoadingState(loading) {
        if (loginBtn) {
            if (loading) {
                loginBtn.disabled = true;
                loginBtn.classList.add('loading');
            } else {
                loginBtn.disabled = false;
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