//cuartos.js
class CuartosManager {
    constructor() {
        this.cuartos = [];
        this.muebles = [];
        this.cuartoMuebles = [];
        this.API_BASE = 'http://localhost:8000/api';
        this.init();
    }

    async init() {
        await this.cargarDatos();
        this.configurarEventos();
    }

    async cargarDatos() {
        try {
            this.mostrarEstado('loading');
            
            // Cargar cuartos, muebles y cuarto-muebles en paralelo
            const [cuartosData, mueblesData, cuartoMueblesData] = await Promise.all([
                this.fetchData('cuartos'),
                this.fetchData('catalogo-muebles'),
                this.fetchData('cuarto-muebles')
            ]);

            this.cuartos = cuartosData;
            this.muebles = mueblesData;
            this.cuartoMuebles = cuartoMueblesData;

            this.renderizarCuartos();
            this.actualizarEstadisticas();

        } catch (error) {
            console.error('Error cargando datos:', error);
            this.mostrarEstado('error', error.message);
        }
    }

    async fetchData(endpoint) {
        const response = await fetch(`${this.API_BASE}/${endpoint}`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }

    configurarEventos() {
        const searchInput = document.getElementById('search-input');
        const filterStatus = document.getElementById('filter-status');

        searchInput.addEventListener('input', (e) => this.filtrarCuartos());
        filterStatus.addEventListener('change', () => this.filtrarCuartos());
    }

    filtrarCuartos() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const statusFilter = document.getElementById('filter-status').value;

        const cuartosFiltrados = this.cuartos.filter(cuarto => {
            const matchesSearch = cuarto.nombreCuarto.toLowerCase().includes(searchTerm) ||
                                cuarto.descripcionCuarto?.toLowerCase().includes(searchTerm);
            
            const matchesStatus = !statusFilter || cuarto.estadoCuarto === statusFilter || 
                                (!cuarto.estadoCuarto && statusFilter === 'Disponible');

            return matchesSearch && matchesStatus;
        });

        this.renderizarCuartos(cuartosFiltrados);
    }

    renderizarCuartos(cuartos = this.cuartos) {
        const container = document.getElementById('cuartos-container');
        
        if (cuartos.length === 0) {
            this.mostrarEstado('empty');
            return;
        }

        this.mostrarEstado('content');

        container.innerHTML = cuartos.map(cuarto => this.crearCardCuarto(cuarto)).join('');
    }

    crearCardCuarto(cuarto) {
        const mueblesDelCuarto = this.obtenerMueblesDelCuarto(cuarto.idCuarto);
        const servicios = this.obtenerServiciosDelCuarto(cuarto);
        const estado = cuarto.estadoCuarto || 'Disponible';

        return `
            <div class="cuarto-card">
                <div class="cuarto-header">
                    <div>
                        <h3 class="cuarto-numero">${this.escapeHtml(cuarto.nombreCuarto)}</h3>
                        ${cuarto.propietario ? `<p class="cuarto-propietario">Propietario: ${this.escapeHtml(cuarto.propietario.nombre)}</p>` : ''}
                    </div>
                    <span class="status-badge status-${estado.toLowerCase()}">${estado}</span>
                </div>
                
                <div class="cuarto-body">
                    <div class="cuarto-info">
                        ${cuarto.precioAlquiler ? `<p class="cuarto-precio">$${parseFloat(cuarto.precioAlquiler).toFixed(2)}/mes</p>` : ''}
                        ${cuarto.descripcionCuarto ? `<p class="cuarto-descripcion">${this.escapeHtml(cuarto.descripcionCuarto)}</p>` : ''}
                    </div>
                    
                    <div class="cuarto-servicios">
                        <h4>Muebles Incluidos</h4>
                        <div class="servicios-lista">
                            ${servicios.map(servicio => `
                                <span class="servicio-item">
                                    <i class="fas fa-check"></i>
                                    ${this.escapeHtml(servicio)}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="cuarto-footer">
                    <span class="muebles-count">
                        <i class="fas fa-couch"></i>
                        ${mueblesDelCuarto.length} muebles
                    </span>
                    <button class="btn-ver-debates" onclick="cuartosManager.verDebates(${cuarto.idCuarto})">
                        <i class="fas fa-comments"></i>
                        Ver Debates
                    </button>
                </div>
            </div>
        `;
    }

    obtenerMueblesDelCuarto(idCuarto) {
        return this.cuartoMuebles.filter(cm => cm.idCuarto === idCuarto && cm.cantidad > 0);
    }

    obtenerServiciosDelCuarto(cuarto) {
        const serviciosBasicos = ['Luz', 'Agua', 'Internet'];
        const mueblesDelCuarto = this.obtenerMueblesDelCuarto(cuarto.idCuarto);
        
        const nombresMuebles = mueblesDelCuarto.map(cm => {
            const mueble = this.muebles.find(m => m.idCatalogoMueble === cm.idCatalogoMueble);
            return mueble ? mueble.nombreMueble : 'Mueble';
        });

        return [...serviciosBasicos, ...nombresMuebles];
    }

    verDebates(cuartoId) {
        alert(`Ver debates del cuarto ID: ${cuartoId}`);
        // Aquí puedes implementar la lógica para mostrar los debates
    }

    actualizarEstadisticas() {
        const totalElement = document.getElementById('total-cuartos');
        if (totalElement) {
            totalElement.textContent = this.cuartos.length;
        }
    }

    mostrarEstado(estado, mensajeError = '') {
        const loading = document.getElementById('loading-state');
        const empty = document.getElementById('empty-state');
        const error = document.getElementById('error-state');
        const content = document.getElementById('cuartos-container');

        // Ocultar todos primero
        loading.style.display = 'none';
        empty.style.display = 'none';
        error.style.display = 'none';
        content.style.display = 'none';

        // Mostrar el estado correspondiente
        switch (estado) {
            case 'loading':
                loading.style.display = 'block';
                break;
            case 'empty':
                empty.style.display = 'block';
                break;
            case 'error':
                error.style.display = 'block';
                document.getElementById('error-message').textContent = mensajeError;
                break;
            case 'content':
                content.style.display = 'grid';
                break;
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Función global para recargar
function cargarCuartos() {
    window.cuartosManager.cargarDatos();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.cuartosManager = new CuartosManager();
});