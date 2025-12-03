class CuartosMueblesManager {
    constructor() {
        this.cuartos = [];
        this.muebles = [];
        this.cuartoMuebles = [];
        this.propietarios = [];
        this.currentCuarto = null;
        this.currentMueble = null;
        this.currentAction = null;
        this.currentCuartoForAssignment = null;
        this.API_BASE = 'http://44.222.55.146:8000/api';
        this.token = localStorage.getItem('authToken');
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadPropietarios(); // Solo cargará usuarios con rol ID 1
        await this.loadCuartos();
        await this.loadMuebles();
        await this.loadCuartoMuebles();
        this.updateStats();
    }

    async makeRequest(url, options = {}) {
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.token ? `Bearer ${this.token}` : ''
                }
            };

            const finalOptions = { ...defaultOptions, ...options };
            
            const response = await fetch(`${this.API_BASE}${url}`, finalOptions);

            if (!response.ok) {
                let errorMsg = `Error ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorData.error || errorMsg;
                } catch (e) {
                    // Si no podemos parsear el error, usamos el mensaje por defecto
                }
                throw new Error(errorMsg);
            }

            // Para respuestas vacías (DELETE, etc)
            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Error en la petición:', error);
            throw error;
        }
    }

    async loadPropietarios() {
        try {
            console.log('Cargando propietarios (usuarios con rol ID 1)...');
            
            // Intentar cargar usuarios específicamente con rol 1
            const data = await this.makeRequest('/usuarios');
            
            if (Array.isArray(data)) {
                // Filtrar usuarios con rol ID 1
                this.propietarios = data
                    .filter(usuario => {
                        if (!usuario.rol) return false;
                        
                        // Verificar diferentes formas en que podría venir el rol ID
                        const rolId = usuario.rol.idRoles || usuario.rol.idRol || usuario.rol.id;
                        
                        // Solo usuarios con rol ID 1
                        return rolId === 1;
                    })
                    .map(usuario => {
                        console.log('Usuario con rol 1 encontrado:', usuario);
                        return {
                            idPropietario: usuario.idUsuario,
                            nombre: usuario.username || 'Sin nombre',
                            gmail: usuario.email || '',
                            rol: usuario.rol ? usuario.rol.titulo : 'Rol 1'
                        };
                    });
                
                console.log(`Propietarios encontrados (rol 1): ${this.propietarios.length}`);
            } else {
                console.warn('La respuesta de usuarios no es un array:', data);
                this.propietarios = [];
            }
            
            this.renderPropietariosSelect();
            this.updateStats();
            
            // Si no encontramos usuarios con rol 1, mostrar advertencia
            if (this.propietarios.length === 0) {
                console.warn('No se encontraron usuarios con rol ID 1');
                this.showWarning('No hay usuarios con rol de propietario (rol ID 1) registrados. No se podrán crear cuartos.');
            }
        } catch (error) {
            console.warn('Error cargando propietarios:', error.message);
            this.propietarios = [];
            this.renderPropietariosSelect();
        }
    }

    renderPropietariosSelect() {
        const select = document.getElementById('propietarioCuarto');
        if (!select) {
            console.error('Elemento propietarioCuarto no encontrado en el DOM');
            return;
        }
        
        select.innerHTML = '<option value="">Seleccionar propietario...</option>';
        
        if (this.propietarios.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No hay usuarios con rol de propietario disponibles";
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        
        this.propietarios.forEach(propietario => {
            const option = document.createElement('option');
            option.value = propietario.idPropietario;
            option.textContent = `${propietario.nombre}${propietario.gmail ? ` (${propietario.gmail})` : ''}`;
            select.appendChild(option);
        });
    }

    bindEvents() {
        // Botones principales
        const btnNuevoCuarto = document.getElementById('btnNuevoCuarto');
        const btnNuevoMueble = document.getElementById('btnNuevoMueble');
        
        if (btnNuevoCuarto) {
            btnNuevoCuarto.addEventListener('click', () => this.showModalCuarto());
        } else {
            console.error('Botón btnNuevoCuarto no encontrado');
        }
        
        if (btnNuevoMueble) {
            btnNuevoMueble.addEventListener('click', () => this.showModalMueble());
        } else {
            console.error('Botón btnNuevoMueble no encontrado');
        }
        
        // Modal events - Cerrar modales
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideModals());
        });
        
        const btnCancelarCuarto = document.getElementById('btnCancelarCuarto');
        if (btnCancelarCuarto) {
            btnCancelarCuarto.addEventListener('click', () => this.hideModals());
        }
        
        const btnCancelarMueble = document.getElementById('btnCancelarMueble');
        if (btnCancelarMueble) {
            btnCancelarMueble.addEventListener('click', () => this.hideModals());
        }
        
        const btnCancelarAccion = document.getElementById('btnCancelarAccion');
        if (btnCancelarAccion) {
            btnCancelarAccion.addEventListener('click', () => this.hideModals());
        }
        
        const btnCerrarAsignar = document.getElementById('btnCerrarAsignar');
        if (btnCerrarAsignar) {
            btnCerrarAsignar.addEventListener('click', () => this.hideModals());
        }
        
        // Form events
        const cuartoForm = document.getElementById('cuartoForm');
        if (cuartoForm) {
            cuartoForm.addEventListener('submit', (e) => this.guardarCuarto(e));
        }
        
        const muebleForm = document.getElementById('muebleForm');
        if (muebleForm) {
            muebleForm.addEventListener('submit', (e) => this.guardarMueble(e));
        }
        
        // Search
        const searchCuartosInput = document.getElementById('searchCuartosInput');
        if (searchCuartosInput) {
            searchCuartosInput.addEventListener('input', (e) => this.buscarCuartos(e.target.value));
        }
        
        const searchMueblesInput = document.getElementById('searchMueblesInput');
        if (searchMueblesInput) {
            searchMueblesInput.addEventListener('input', (e) => this.buscarMuebles(e.target.value));
        }
        
        // Confirmación
        const btnConfirmarAccion = document.getElementById('btnConfirmarAccion');
        if (btnConfirmarAccion) {
            btnConfirmarAccion.addEventListener('click', () => this.confirmarAccion());
        }
        
        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });
    }

    // ==================== CUARTOS ====================
    async loadCuartos() {
        try {
            this.showLoading(true);
            const data = await this.makeRequest('/cuartos');
            this.cuartos = Array.isArray(data) ? data : [];
            this.renderCuartos();
            this.updateStats();
        } catch (error) {
            console.error('Error cargando cuartos:', error);
            this.showError('Error al cargar los cuartos: ' + error.message);
            this.cuartos = [];
            this.renderCuartos();
        } finally {
            this.showLoading(false);
        }
    }

    renderCuartos(cuartos = this.cuartos) {
        const tbody = document.getElementById('cuartosTableBody');
        if (!tbody) {
            console.error('Elemento cuartosTableBody no encontrado');
            return;
        }
        
        if (cuartos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-door-closed" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                        <p>No se encontraron cuartos</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = cuartos.map(cuarto => {
            // Buscar propietario
            let nombrePropietario = 'Desconocido';
            const propietario = this.propietarios.find(p => p.idPropietario === cuarto.idPropietario);
            if (propietario) {
                nombrePropietario = propietario.nombre;
            } else if (cuarto.propietario) {
                // Si el cuarto trae el objeto propietario
                nombrePropietario = cuarto.propietario.username || 'Desconocido';
            }
            
            return `
                <tr>
                    <td>${cuarto.idCuarto}</td>
                    <td>${this.escapeHtml(cuarto.nombreCuarto)}</td>
                    <td>${this.escapeHtml(nombrePropietario)}</td>
                    <td>$${cuarto.precioAlquiler ? parseFloat(cuarto.precioAlquiler).toFixed(2) : '0.00'}</td>
                    <td>
                        <span class="status-badge ${this.getStatusClass(cuarto.estadoCuarto)}">
                            ${cuarto.estadoCuarto || 'Disponible'}
                        </span>
                    </td>
                    <td>${cuarto.descripcionCuarto ? (this.escapeHtml(cuarto.descripcionCuarto).substring(0, 50) + '...') : 'Sin descripción'}</td>
                    <td class="table-actions-cell">
                        <button class="btn-action btn-assign" onclick="cuartosMueblesManager.asignarMuebles(${cuarto.idCuarto})">
                            <i class="fas fa-link"></i> Muebles
                        </button>
                        <button class="btn-action btn-edit" onclick="cuartosMueblesManager.editarCuarto(${cuarto.idCuarto})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-action btn-delete" onclick="cuartosMueblesManager.eliminarCuarto(${cuarto.idCuarto})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showModalCuarto(cuarto = null) {
        // Verificar que tenemos propietarios antes de mostrar el modal
        if (this.propietarios.length === 0) {
            this.showError('No hay usuarios con rol de propietario (rol ID 1) registrados. Por favor, crea un usuario con rol de propietario primero.');
            return;
        }

        this.currentCuarto = cuarto;
        const modal = document.getElementById('modalCuarto');
        const title = document.getElementById('modalCuartoTitle');
        const form = document.getElementById('cuartoForm');

        if (!modal || !title || !form) {
            console.error('Elementos del modal no encontrados');
            this.showError('Error: Elementos del formulario no encontrados');
            return;
        }

        if (cuarto) {
            title.textContent = 'Editar Cuarto';
            this.populateCuartoForm(cuarto);
        } else {
            title.textContent = 'Nuevo Cuarto';
            form.reset();
            // Establecer estado por defecto
            document.getElementById('estadoCuarto').value = '';
        }

        modal.style.display = 'block';
    }

    populateCuartoForm(cuarto) {
        document.getElementById('nombreCuarto').value = cuarto.nombreCuarto || '';
        document.getElementById('precioAlquiler').value = cuarto.precioAlquiler || '';
        document.getElementById('estadoCuarto').value = cuarto.estadoCuarto || '';
        document.getElementById('descripcionCuarto').value = cuarto.descripcionCuarto || '';
        
        // Seleccionar el propietario correcto en el selector
        const propietarioSelect = document.getElementById('propietarioCuarto');
        if (propietarioSelect) {
            propietarioSelect.value = cuarto.idPropietario || '';
        }
    }

    async guardarCuarto(e) {
        e.preventDefault();
        
        if (this.propietarios.length === 0) {
            this.showError('No hay usuarios con rol de propietario (rol ID 1) registrados. No se puede guardar el cuarto.');
            return;
        }
        
        try {
            this.showLoading(true, 'btnGuardarCuarto');
            
            const formData = new FormData(e.target);
            const idPropietario = parseInt(formData.get('propietarioCuarto'));
            
            if (!idPropietario) {
                throw new Error('Debe seleccionar un usuario con rol de propietario');
            }

            const cuartoData = {
                idPropietario: idPropietario,
                nombreCuarto: formData.get('nombreCuarto').trim(),
                precioAlquiler: formData.get('precioAlquiler') ? parseFloat(formData.get('precioAlquiler')) : null,
                estadoCuarto: formData.get('estadoCuarto') || null,
                descripcionCuarto: formData.get('descripcionCuarto') || null
            };

            // Validaciones
            if (!cuartoData.nombreCuarto) {
                throw new Error('El nombre del cuarto es requerido');
            }

            let url = '/cuartos';
            let method = 'POST';

            if (this.currentCuarto) {
                url = `/cuartos/${this.currentCuarto.idCuarto}`;
                method = 'PUT';
            }

            const responseData = await this.makeRequest(url, {
                method: method,
                body: JSON.stringify(cuartoData)
            });

            this.showSuccess(`Cuarto ${this.currentCuarto ? 'actualizado' : 'creado'} correctamente`);
            this.hideModals();
            await this.loadCuartos();

        } catch (error) {
            console.error('Error guardando cuarto:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnGuardarCuarto');
        }
    }

    editarCuarto(id) {
        const cuarto = this.cuartos.find(c => c.idCuarto === id);
        if (cuarto) {
            this.showModalCuarto(cuarto);
        }
    }

    eliminarCuarto(id) {
        const cuarto = this.cuartos.find(c => c.idCuarto === id);
        if (cuarto) {
            this.currentCuarto = cuarto;
            const mensaje = `¿Estás seguro de eliminar el cuarto "${cuarto.nombreCuarto}"?`;
            this.showConfirmModal(mensaje, 'eliminarCuarto');
        }
    }

    buscarCuartos(termino) {
        if (!termino) {
            this.renderCuartos();
            return;
        }

        const cuartosFiltrados = this.cuartos.filter(cuarto => {
            const searchText = termino.toLowerCase();
            return (
                (cuarto.nombreCuarto && cuarto.nombreCuarto.toLowerCase().includes(searchText)) ||
                (cuarto.estadoCuarto && cuarto.estadoCuarto.toLowerCase().includes(searchText)) ||
                (cuarto.descripcionCuarto && cuarto.descripcionCuarto.toLowerCase().includes(searchText))
            );
        });

        this.renderCuartos(cuartosFiltrados);
    }

    // ==================== MUEBLES ====================
    async loadMuebles() {
        try {
            const data = await this.makeRequest('/catalogo-muebles');
            this.muebles = Array.isArray(data) ? data : [];
            this.renderMuebles();
            this.updateStats();
        } catch (error) {
            console.error('Error cargando muebles:', error);
            this.showError('Error al cargar los muebles: ' + error.message);
            this.muebles = [];
            this.renderMuebles();
        }
    }

    renderMuebles(muebles = this.muebles) {
        const tbody = document.getElementById('mueblesTableBody');
        if (!tbody) {
            console.error('Elemento mueblesTableBody no encontrado');
            return;
        }
        
        if (muebles.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px;">
                        <i class="fas fa-couch" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                        <p>No se encontraron muebles</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = muebles.map(mueble => `
            <tr>
                <td>${mueble.idCatalogoMueble}</td>
                <td>${this.escapeHtml(mueble.nombreMueble)}</td>
                <td>${mueble.descripcion ? (this.escapeHtml(mueble.descripcion).substring(0, 50) + '...') : 'Sin descripción'}</td>
                <td class="table-actions-cell">
                    <button class="btn-action btn-edit" onclick="cuartosMueblesManager.editarMueble(${mueble.idCatalogoMueble})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-action btn-delete" onclick="cuartosMueblesManager.eliminarMueble(${mueble.idCatalogoMueble})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    showModalMueble(mueble = null) {
        this.currentMueble = mueble;
        const modal = document.getElementById('modalMueble');
        const title = document.getElementById('modalMuebleTitle');
        const form = document.getElementById('muebleForm');

        if (!modal || !title || !form) {
            console.error('Elementos del modal de muebles no encontrados');
            this.showError('Error: Elementos del formulario de muebles no encontrados');
            return;
        }

        if (mueble) {
            title.textContent = 'Editar Mueble';
            this.populateMuebleForm(mueble);
        } else {
            title.textContent = 'Nuevo Mueble';
            form.reset();
        }

        modal.style.display = 'block';
    }

    populateMuebleForm(mueble) {
        document.getElementById('nombreMueble').value = mueble.nombreMueble || '';
        document.getElementById('descripcionMueble').value = mueble.descripcion || '';
    }

    async guardarMueble(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardarMueble');
            
            const formData = new FormData(e.target);
            
            const muebleData = {
                nombreMueble: formData.get('nombreMueble').trim(),
                descripcion: formData.get('descripcionMueble') || null,
                estadoMueble: "activo" // Estado por defecto
            };

            // Validaciones
            if (!muebleData.nombreMueble) {
                throw new Error('El nombre del mueble es requerido');
            }

            let url = '/catalogo-muebles';
            let method = 'POST';

            if (this.currentMueble) {
                url = `/catalogo-muebles/${this.currentMueble.idCatalogoMueble}`;
                method = 'PUT';
            }

            const responseData = await this.makeRequest(url, {
                method: method,
                body: JSON.stringify(muebleData)
            });

            this.showSuccess(`Mueble ${this.currentMueble ? 'actualizado' : 'creado'} correctamente`);
            this.hideModals();
            await this.loadMuebles();

        } catch (error) {
            console.error('Error guardando mueble:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnGuardarMueble');
        }
    }

    editarMueble(id) {
        const mueble = this.muebles.find(m => m.idCatalogoMueble === id);
        if (mueble) {
            this.showModalMueble(mueble);
        }
    }

    eliminarMueble(id) {
        const mueble = this.muebles.find(m => m.idCatalogoMueble === id);
        if (mueble) {
            this.currentMueble = mueble;
            const mensaje = `¿Estás seguro de eliminar el mueble "${mueble.nombreMueble}"?`;
            this.showConfirmModal(mensaje, 'eliminarMueble');
        }
    }

    buscarMuebles(termino) {
        if (!termino) {
            this.renderMuebles();
            return;
        }

        const mueblesFiltrados = this.muebles.filter(mueble => {
            const searchText = termino.toLowerCase();
            return (
                (mueble.nombreMueble && mueble.nombreMueble.toLowerCase().includes(searchText)) ||
                (mueble.descripcion && mueble.descripcion.toLowerCase().includes(searchText))
            );
        });

        this.renderMuebles(mueblesFiltrados);
    }

    // ==================== CUARTO MUEBLES ====================
    async loadCuartoMuebles() {
        try {
            const data = await this.makeRequest('/cuarto-muebles');
            this.cuartoMuebles = Array.isArray(data) ? data : [];
            this.updateStats();
        } catch (error) {
            console.warn('No se pudieron cargar las asignaciones de muebles:', error.message);
            this.cuartoMuebles = [];
        }
    }

    async asignarMuebles(idCuarto) {
        this.currentCuartoForAssignment = this.cuartos.find(c => c.idCuarto === idCuarto);
        
        if (!this.currentCuartoForAssignment) {
            this.showError('Cuarto no encontrado');
            return;
        }

        const modal = document.getElementById('modalAsignarMuebles');
        const title = document.getElementById('modalAsignarTitle');
        
        if (!modal || !title) {
            console.error('Modal de asignación no encontrado');
            this.showError('Error: Modal de asignación no encontrado');
            return;
        }
        
        title.textContent = `Asignar Muebles al Cuarto: ${this.currentCuartoForAssignment.nombreCuarto}`;
        
        await this.renderMueblesAsignacion(idCuarto);
        
        modal.style.display = 'block';
    }

    async renderMueblesAsignacion(idCuarto) {
        const disponiblesContainer = document.getElementById('mueblesDisponiblesList');
        const asignadosContainer = document.getElementById('mueblesAsignadosList');

        if (!disponiblesContainer || !asignadosContainer) {
            console.error('Contenedores de muebles no encontrados');
            this.showError('Error: Contenedores de muebles no encontrados');
            return;
        }

        try {
            // Obtener muebles asignados a este cuarto
            const mueblesAsignados = await this.makeRequest(`/cuarto-muebles/cuarto/${idCuarto}`) || [];

            // Separar muebles disponibles y asignados
            const idsAsignados = mueblesAsignados.map(cm => cm.idCatalogoMueble);
            const mueblesDisponibles = this.muebles.filter(m => !idsAsignados.includes(m.idCatalogoMueble));

            // Renderizar muebles disponibles
            disponiblesContainer.innerHTML = mueblesDisponibles.length > 0
                ? mueblesDisponibles.map(mueble => `
                    <div class="mueble-item">
                        <div class="mueble-info">
                            <h4>${this.escapeHtml(mueble.nombreMueble)}</h4>
                            <p>${mueble.descripcion ? this.escapeHtml(mueble.descripcion) : 'Sin descripción'}</p>
                        </div>
                        <button class="btn-add" onclick="cuartosMueblesManager.agregarMuebleACuarto(${idCuarto}, ${mueble.idCatalogoMueble})">
                            <i class="fas fa-plus"></i> Agregar
                        </button>
                    </div>
                `).join('')
                : '<p style="text-align: center; color: var(--dark-gray);">No hay muebles disponibles</p>';

            // Renderizar muebles asignados
            asignadosContainer.innerHTML = mueblesAsignados.length > 0
                ? mueblesAsignados.map(cm => {
                    const mueble = this.muebles.find(m => m.idCatalogoMueble === cm.idCatalogoMueble);
                    return mueble ? `
                        <div class="mueble-item">
                            <div class="mueble-info">
                                <h4>${this.escapeHtml(mueble.nombreMueble)}</h4>
                                <p>${mueble.descripcion ? this.escapeHtml(mueble.descripcion) : 'Sin descripción'}</p>
                            </div>
                            <div class="mueble-cantidad">
                                <input type="number" value="${cm.cantidad || 0}" min="0" 
                                    onchange="cuartosMueblesManager.actualizarCantidadMueble(${cm.idCuartoMueble}, this.value)">
                                <button class="btn-remove" onclick="cuartosMueblesManager.removerMuebleDeCuarto(${cm.idCuartoMueble})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ` : '<div class="mueble-item">Mueble no encontrado</div>';
                }).join('')
                : '<p style="text-align: center; color: var(--dark-gray);">No hay muebles asignados</p>';

        } catch (error) {
            console.error('Error cargando muebles del cuarto:', error);
            this.showError('Error al cargar los muebles del cuarto: ' + error.message);
        }
    }

    async agregarMuebleACuarto(idCuarto, idCatalogoMueble) {
        try {
            const cuartoMuebleData = {
                idCuarto: idCuarto,
                idCatalogoMueble: idCatalogoMueble,
                cantidad: 1,
                estado: "bueno" // Estado por defecto
            };

            await this.makeRequest('/cuarto-muebles', {
                method: 'POST',
                body: JSON.stringify(cuartoMuebleData)
            });

            this.showSuccess('Mueble agregado correctamente al cuarto');
            await this.renderMueblesAsignacion(idCuarto);
            await this.loadCuartoMuebles();

        } catch (error) {
            console.error('Error agregando mueble al cuarto:', error);
            this.showError(error.message);
        }
    }

    async removerMuebleDeCuarto(idCuartoMueble) {
        try {
            await this.makeRequest(`/cuarto-muebles/${idCuartoMueble}`, {
                method: 'DELETE'
            });

            this.showSuccess('Mueble removido correctamente del cuarto');
            if (this.currentCuartoForAssignment) {
                await this.renderMueblesAsignacion(this.currentCuartoForAssignment.idCuarto);
            }
            await this.loadCuartoMuebles();

        } catch (error) {
            console.error('Error removiendo mueble del cuarto:', error);
            this.showError(error.message);
        }
    }

    async actualizarCantidadMueble(idCuartoMueble, nuevaCantidad) {
        try {
            const cantidad = parseInt(nuevaCantidad);
            if (isNaN(cantidad) || cantidad < 0) {
                this.showError('La cantidad debe ser un número positivo');
                return;
            }

            await this.makeRequest(`/cuarto-muebles/${idCuartoMueble}/cantidad`, {
                method: 'PUT',
                body: JSON.stringify({ cantidad: cantidad })
            });

            this.showSuccess('Cantidad actualizada correctamente');
            await this.loadCuartoMuebles();

        } catch (error) {
            console.error('Error actualizando cantidad:', error);
            this.showError(error.message);
        }
    }

    // ==================== UTILIDADES ====================
    getStatusClass(status) {
        if (!status || status === '' || status === 'disponible' || status === 'Disponible') 
            return 'status-disponible';
        
        const statusMap = {
            'ocupado': 'status-ocupado',
            'Ocupado': 'status-ocupado',
            'mantenimiento': 'status-mantenimiento',
            'Mantenimiento': 'status-mantenimiento'
        };
        return statusMap[status] || 'status-disponible';
    }

    updateStats() {
        // Actualizar estadísticas
        const totalCuartos = this.cuartos.length;
        const cuartosDisponibles = this.cuartos.filter(c => 
            !c.estadoCuarto || 
            c.estadoCuarto === '' || 
            c.estadoCuarto.toLowerCase() === 'disponible'
        ).length;
        const totalMuebles = this.muebles.length;
        const totalAsignaciones = this.cuartoMuebles.length;
        const totalPropietarios = this.propietarios.length;

        // Actualizar elementos del DOM si existen
        this.updateElementContent('totalCuartos', totalCuartos);
        this.updateElementContent('cuartosDisponibles', cuartosDisponibles);
        this.updateElementContent('totalMuebles', totalMuebles);
        this.updateElementContent('totalAsignaciones', totalAsignaciones);
        this.updateElementContent('totalPropietarios', totalPropietarios);
    }

    updateElementContent(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = content;
        }
    }

    showConfirmModal(message, action) {
        this.currentAction = action;
        const modal = document.getElementById('modalConfirmacion');
        const messageElement = document.getElementById('confirmacionMensaje');
        
        if (!modal || !messageElement) {
            console.error('Modal de confirmación no encontrado');
            this.showError('Error: Modal de confirmación no encontrado');
            return;
        }
        
        messageElement.textContent = message;
        modal.style.display = 'block';
    }

    async confirmarAccion() {
        try {
            this.showLoading(true, 'btnConfirmarAccion');
            
            if (this.currentAction === 'eliminarCuarto' && this.currentCuarto) {
                await this.makeRequest(`/cuartos/${this.currentCuarto.idCuarto}`, {
                    method: 'DELETE'
                });

                this.showSuccess('Cuarto eliminado correctamente');
                this.hideModals();
                await this.loadCuartos();
                await this.loadCuartoMuebles();
                
            } else if (this.currentAction === 'eliminarMueble' && this.currentMueble) {
                await this.makeRequest(`/catalogo-muebles/${this.currentMueble.idCatalogoMueble}`, {
                    method: 'DELETE'
                });

                this.showSuccess('Mueble eliminado correctamente');
                this.hideModals();
                await this.loadMuebles();
                await this.loadCuartoMuebles();
            }
        } catch (error) {
            console.error('Error confirmando acción:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false, 'btnConfirmarAccion');
        }
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.currentCuarto = null;
        this.currentMueble = null;
        this.currentAction = null;
        this.currentCuartoForAssignment = null;
    }

    showLoading(show, buttonId = null) {
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (!button) return;
            
            if (show) {
                button.disabled = true;
                button.innerHTML = '<span class="spinner"></span> Procesando...';
            } else {
                button.disabled = false;
                if (buttonId === 'btnGuardarCuarto') {
                    button.textContent = this.currentCuarto ? 'Actualizar Cuarto' : 'Guardar Cuarto';
                } else if (buttonId === 'btnGuardarMueble') {
                    button.textContent = this.currentMueble ? 'Actualizar Mueble' : 'Guardar Mueble';
                } else if (buttonId === 'btnConfirmarAccion') {
                    button.textContent = 'Confirmar';
                }
            }
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type) {
        // Eliminar notificaciones existentes
        document.querySelectorAll('.notification').forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Colores según el tipo
        let backgroundColor = '#28a745'; // success por defecto
        if (type === 'error') backgroundColor = '#dc3545';
        if (type === 'warning') backgroundColor = '#ffc107';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${backgroundColor};
            color: ${type === 'warning' ? '#212529' : 'white'};
            border-radius: 6px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
            font-weight: 500;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Crear animación de entrada si no existe
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
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

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        // Si no está autenticado, redirigir al login
        window.location.href = 'login.html';
        return;
    }

    // Crear instancia global
    window.cuartosMueblesManager = new CuartosMueblesManager();
    
    // Agregar estilos CSS para el spinner
    const style = document.createElement('style');
    style.textContent = `
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            margin-right: 8px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});