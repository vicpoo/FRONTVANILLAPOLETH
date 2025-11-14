// index.js
document.addEventListener('DOMContentLoaded', function() {
    const options = document.querySelectorAll('.option');
    
    options.forEach(option => {
        option.addEventListener('click', function() {
            const role = this.id;
            
            // Aquí puedes agregar la lógica para redirigir según el rol seleccionado
            console.log(`Seleccionaste: ${role}`);
            
            // Ejemplo de redirección (descomenta cuando tengas las páginas)
            // window.location.href = `login.html?type=${role}`;
        });
    });

    // También agregar evento a los botones por si acaso
    const buttons = document.querySelectorAll('.option-button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Evita que se dispare el evento del contenedor
            const role = this.closest('.option').id;
            
            console.log(`Seleccionaste: ${role}`);
            
            // Ejemplo de redirección
            // window.location.href = `login.html?type=${role}`;
        });
    });
});