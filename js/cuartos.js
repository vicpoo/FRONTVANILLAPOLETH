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
        this.crearModalDetalles();
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
                    <button class="btn-ver-detalles" onclick="cuartosManager.mostrarDetalles(${cuarto.idCuarto})">
                        <i class="fas fa-info-circle"></i>
                        Ver Detalles
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

    crearModalDetalles() {
        const modalHTML = `
            <div id="modal-detalles" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modal-titulo">Detalles del Cuarto</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body" id="modal-body">
                        <!-- Contenido dinámico se insertará aquí -->
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cerrar">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Configurar eventos del modal
        const modal = document.getElementById('modal-detalles');
        const closeBtn = document.querySelector('.close-modal');
        const closeBtnFooter = document.querySelector('.btn-cerrar');
        
        closeBtn.addEventListener('click', () => this.cerrarModal());
        closeBtnFooter.addEventListener('click', () => this.cerrarModal());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.cerrarModal();
            }
        });
    }

    mostrarDetalles(cuartoId) {
        const cuarto = this.cuartos.find(c => c.idCuarto === cuartoId);
        if (!cuarto) return;

        const mueblesDelCuarto = this.obtenerMueblesDetallados(cuartoId);
        const serviciosBasicos = this.obtenerServiciosBasicos();
        
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = this.generarContenidoModal(cuarto, mueblesDelCuarto, serviciosBasicos);
        
        document.getElementById('modal-titulo').textContent = `Detalles - ${cuarto.nombreCuarto}`;
        document.getElementById('modal-detalles').style.display = 'block';
    }

    obtenerMueblesDetallados(cuartoId) {
        return this.cuartoMuebles
            .filter(cm => cm.idCuarto === cuartoId && cm.cantidad > 0)
            .map(cm => {
                const mueble = this.muebles.find(m => m.idCatalogoMueble === cm.idCatalogoMueble);
                return {
                    ...mueble,
                    cantidad: cm.cantidad,
                    estado: cm.estado || 'Buen estado'
                };
            });
    }

    obtenerServiciosBasicos() {
        return [
            { nombre: 'Luz', incluido: true, descripcion: 'Servicio eléctrico incluido' },
            { nombre: 'Agua', incluido: true, descripcion: 'Agua potable incluida' },
            { nombre: 'Internet', incluido: true, descripcion: 'Wi-Fi de alta velocidad' }
        ];
    }

    generarContenidoModal(cuarto, muebles, servicios) {
        return `
            <div class="detalles-container">
                <!-- Información General -->
                <div class="detalle-seccion">
                    <h3><i class="fas fa-info-circle"></i> Información General</h3>
                    <div class="detalle-grid">
                        <div class="detalle-item">
                            <strong>Nombre:</strong>
                            <span>${this.escapeHtml(cuarto.nombreCuarto)}</span>
                        </div>
                        <div class="detalle-item">
                            <strong>Precio:</strong>
                            <span class="precio-destacado">$${parseFloat(cuarto.precioAlquiler || 0).toFixed(2)}/mes</span>
                        </div>
                        ${cuarto.fechaCreacion ? `
                        <div class="detalle-item">
                            <strong>Fecha Creación:</strong>
                            <span>${new Date(cuarto.fechaCreacion).toLocaleDateString()}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Descripción -->
                ${cuarto.descripcionCuarto ? `
                <div class="detalle-seccion">
                    <h3><i class="fas fa-file-alt"></i> Descripción</h3>
                    <div class="descripcion-texto">
                        ${this.escapeHtml(cuarto.descripcionCuarto)}
                    </div>
                </div>
                ` : ''}

                <!-- Información del Propietario -->
                ${cuarto.propietario ? `
                <div class="detalle-seccion">
                    <h3><i class="fas fa-user"></i> Propietario</h3>
                    <div class="detalle-grid">
                        <div class="detalle-item">
                            <strong>Nombre:</strong>
                            <span>${this.escapeHtml(cuarto.propietario.nombre)}</span>
                        </div>
                        ${cuarto.propietario.email ? `
                        <div class="detalle-item">
                            <strong>Email:</strong>
                            <span>${this.escapeHtml(cuarto.propietario.email)}</span>
                        </div>
                        ` : ''}
                        ${cuarto.propietario.telefono ? `
                        <div class="detalle-item">
                            <strong>Teléfono:</strong>
                            <span>${this.escapeHtml(cuarto.propietario.telefono)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Servicios Básicos -->
                <div class="detalle-seccion">
                    <h3><i class="fas fa-bolt"></i> Servicios</h3>
                    <div class="servicios-lista-detalle">
                        ${servicios.map(servicio => `
                            <div class="servicio-item-detalle">
                                <i class="fas fa-check-circle"></i>
                                <div>
                                    <strong>${servicio.nombre}</strong>
                                    <span>${servicio.descripcion}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Muebles Incluidos -->
                <div class="detalle-seccion">
                    <h3><i class="fas fa-couch"></i> Muebles (${muebles.length})</h3>
                    ${muebles.length > 0 ? `
                    <div class="muebles-grid">
                        ${muebles.map(mueble => `
                            <div class="mueble-card">
                                <div class="mueble-header">
                                    <h4>${this.escapeHtml(mueble.nombreMueble)}</h4>
                                    <span class="mueble-cantidad">x${mueble.cantidad}</span>
                                </div>
                                ${mueble.descripcionMueble ? `
                                <p class="mueble-descripcion">${this.escapeHtml(mueble.descripcionMueble)}</p>
                                ` : ''}
                                <div class="mueble-info">
                                    ${mueble.precioMueble ? `
                                    <span class="mueble-precio">$${parseFloat(mueble.precioMueble).toFixed(2)}</span>
                                    ` : ''}
                                    <span class="mueble-estado ${mueble.estado.toLowerCase().replace(' ', '-')}">
                                        ${mueble.estado}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ` : `
                    <div class="sin-muebles">
                        <i class="fas fa-couch"></i>
                        <p>No hay muebles asignados</p>
                    </div>
                    `}
                </div>

                <!-- Información Adicional -->
                <div class="detalle-seccion">
                    <h3><i class="fas fa-chart-bar"></i> Resumen</h3>
                    <div class="estadisticas-grid">
                        <div class="estadistica-item">
                            <i class="fas fa-couch"></i>
                            <div>
                                <strong>Total Muebles</strong>
                                <span>${muebles.reduce((total, m) => total + m.cantidad, 0)}</span>
                            </div>
                        </div>
                        <div class="estadistica-item">
                            <i class="fas fa-shapes"></i>
                            <div>
                                <strong>Tipos</strong>
                                <span>${muebles.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    cerrarModal() {
        document.getElementById('modal-detalles').style.display = 'none';
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