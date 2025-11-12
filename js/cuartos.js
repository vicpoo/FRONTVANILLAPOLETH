document.addEventListener('DOMContentLoaded', function() {
    const cuartosContainer = document.getElementById('cuartos-container');
    
    // Mostrar estado de carga
    cuartosContainer.innerHTML = '<div class="loading">Cargando cuartos...</div>';
    
    // Hacer petición a la API
    fetch('http://localhost:8000/api/cuartos')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta de la red');
            }
            return response.json();
        })
        .then(cuartos => {
            // Limpiar el contenedor
            cuartosContainer.innerHTML = '';
            
            // Verificar si hay cuartos
            if (cuartos.length === 0) {
                cuartosContainer.innerHTML = '<div class="error">No hay cuartos disponibles</div>';
                return;
            }
            
            // Crear tarjetas para cada cuarto
            cuartos.forEach(cuarto => {
                const cuartoCard = crearCuartoCard(cuarto);
                cuartosContainer.appendChild(cuartoCard);
            });
        })
        .catch(error => {
            console.error('Error al cargar los cuartos:', error);
            cuartosContainer.innerHTML = '<div class="error">Error al cargar los cuartos. Verifica que la API esté funcionando.</div>';
        });
});

function crearCuartoCard(cuarto) {
    const card = document.createElement('div');
    card.className = 'cuarto-card';
    
    // Obtener servicios del cuarto (esto es un ejemplo, ajusta según tu modelo de datos)
    const servicios = obtenerServiciosDelCuarto(cuarto);
    
    card.innerHTML = `
        <div class="cuarto-header">
            <h2 class="cuarto-numero">Cuarto número ${cuarto.idCuarto || cuarto.nombreCuarto}</h2>
        </div>
        <div class="cuarto-body">
            <div class="cuarto-servicios">
                <h3 class="servicios-titulo">Incluye:</h3>
                <ul class="servicios-lista">
                    ${servicios.map(servicio => `<li>${servicio}</li>`).join('')}
                </ul>
            </div>
            ${cuarto.precioAlquiler ? `<p class="cuarto-precio"><strong>Precio:</strong> $${cuarto.precioAlquiler}</p>` : ''}
            ${cuarto.descripcionCuarto ? `<p class="cuarto-descripcion">${cuarto.descripcionCuarto}</p>` : ''}
        </div>
        <div class="cuarto-footer">
            <button class="btn-ver-debates" data-cuarto-id="${cuarto.idCuarto}">Ver debates</button>
        </div>
    `;
    
    // Agregar evento al botón
    const btnVerDebates = card.querySelector('.btn-ver-debates');
    btnVerDebates.addEventListener('click', function() {
        const cuartoId = this.getAttribute('data-cuarto-id');
        verDebates(cuartoId);
    });
    
    return card;
}

// Función para obtener servicios del cuarto (ejemplo - ajusta según tu modelo de datos)
function obtenerServiciosDelCuarto(cuarto) {
    // Esta es una implementación de ejemplo
    // En una aplicación real, obtendrías estos datos de la API o de relaciones en el modelo
    
    // Servicios básicos que podrían venir de la API
    const serviciosBasicos = [];
    
    // Agregar servicios según propiedades del cuarto
    if (cuarto.descripcionCuarto) {
        if (cuarto.descripcionCuarto.toLowerCase().includes('baño')) {
            serviciosBasicos.push('baño');
        }
        if (cuarto.descripcionCuarto.toLowerCase().includes('luz')) {
            serviciosBasicos.push('luz');
        }
        if (cuarto.descripcionCuarto.toLowerCase().includes('agua')) {
            serviciosBasicos.push('agua');
        }
        if (cuarto.descripcionCuarto.toLowerCase().includes('mueble')) {
            serviciosBasicos.push('muebles');
        }
    }
    
    // Si no se encontraron servicios en la descripción, usar unos por defecto
    if (serviciosBasicos.length === 0) {
        serviciosBasicos.push('luz', 'agua', 'muebles');
    }
    
    return serviciosBasicos;
}

function verDebates(cuartoId) {
    alert(`Ver debates del cuarto ID: ${cuartoId}`);
    // Aquí puedes implementar la lógica para mostrar los debates del cuarto
    // Por ejemplo, redirigir a otra página o mostrar un modal
}