// cuartos-muebles.js
class CuartosMueblesManager {
    constructor() {
        this.cuartos = [];
        this.muebles = [];
        this.cuartoMuebles = [];
        this.currentCuarto = null;
        this.currentMueble = null;
        this.currentAction = null;
        this.currentCuartoForAssignment = null;
        this.API_BASE = 'http://localhost:8000/api';
        // ID del propietario - ajusta según tu sistema
        this.ID_PROPIETARIO = 1;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCuartos();
        this.loadMuebles();
        this.loadCuartoMuebles();
    }

    bindEvents() {
        // Botones principales
        document.getElementById('btnNuevoCuarto').addEventListener('click', () => this.showModalCuarto());
        document.getElementById('btnNuevoMueble').addEventListener('click', () => this.showModalMueble());
        
        // Modal events - Cerrar modales
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideModals());
        });
        
        document.getElementById('btnCancelarCuarto').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCancelarMueble').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCancelarAccion').addEventListener('click', () => this.hideModals());
        document.getElementById('btnCerrarAsignar').addEventListener('click', () => this.hideModals());
        
        // Form events
        document.getElementById('cuartoForm').addEventListener('submit', (e) => this.guardarCuarto(e));
        document.getElementById('muebleForm').addEventListener('submit', (e) => this.guardarMueble(e));
        
        // Search
        document.getElementById('searchCuartosInput').addEventListener('input', (e) => this.buscarCuartos(e.target.value));
        document.getElementById('searchMueblesInput').addEventListener('input', (e) => this.buscarMuebles(e.target.value));
        
        // Confirmación
        document.getElementById('btnConfirmarAccion').addEventListener('click', () => this.confirmarAccion());
        
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
            const response = await fetch(`${this.API_BASE}/cuartos`);
            
            if (!response.ok) {
                throw new Error('Error al cargar cuartos');
            }
            
            this.cuartos = await response.json();
            this.renderCuartos();
            this.updateStats();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los cuartos: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    renderCuartos(cuartos = this.cuartos) {
        const tbody = document.getElementById('cuartosTableBody');
        
        if (cuartos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <i class="fas fa-door-closed" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>
                        <p>No se encontraron cuartos</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = cuartos.map(cuarto => `
            <tr>
                <td>${cuarto.idCuarto}</td>
                <td>${cuarto.nombreCuarto}</td>
                <td>$${cuarto.precioAlquiler ? cuarto.precioAlquiler.toFixed(2) : '0.00'}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(cuarto.estadoCuarto)}">
                        ${cuarto.estadoCuarto || 'Disponible'}
                    </span>
                </td>
                <td>${cuarto.descripcionCuarto ? (cuarto.descripcionCuarto.substring(0, 50) + '...') : 'Sin descripción'}</td>
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
        `).join('');
    }

    showModalCuarto(cuarto = null) {
        this.currentCuarto = cuarto;
        const modal = document.getElementById('modalCuarto');
        const title = document.getElementById('modalCuartoTitle');
        const form = document.getElementById('cuartoForm');

        if (cuarto) {
            title.textContent = 'Editar Cuarto';
            this.populateCuartoForm(cuarto);
        } else {
            title.textContent = 'Nuevo Cuarto';
            form.reset();
        }

        modal.style.display = 'block';
    }

    populateCuartoForm(cuarto) {
        document.getElementById('nombreCuarto').value = cuarto.nombreCuarto;
        document.getElementById('precioAlquiler').value = cuarto.precioAlquiler || '';
        document.getElementById('estadoCuarto').value = cuarto.estadoCuarto || '';
        document.getElementById('descripcionCuarto').value = cuarto.descripcionCuarto || '';
    }

    async guardarCuarto(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardarCuarto');
            
            const formData = new FormData(e.target);
            
            const cuartoData = {
                idPropietario: this.ID_PROPIETARIO,
                nombreCuarto: formData.get('nombreCuarto'),
                precioAlquiler: parseFloat(formData.get('precioAlquiler')),
                estadoCuarto: formData.get('estadoCuarto') || null,
                descripcionCuarto: formData.get('descripcionCuarto') || null
            };

            let response;
            if (this.currentCuarto) {
                response = await fetch(`${this.API_BASE}/cuartos/${this.currentCuarto.idCuarto}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(cuartoData)
                });
            } else {
                response = await fetch(`${this.API_BASE}/cuartos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(cuartoData)
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al guardar el cuarto');
            }

            this.showSuccess(`Cuarto ${this.currentCuarto ? 'actualizado' : 'creado'} correctamente`);
            this.hideModals();
            this.loadCuartos();

        } catch (error) {
            console.error('Error:', error);
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
                cuarto.nombreCuarto?.toLowerCase().includes(searchText) ||
                cuarto.estadoCuarto?.toLowerCase().includes(searchText) ||
                cuarto.descripcionCuarto?.toLowerCase().includes(searchText)
            );
        });

        this.renderCuartos(cuartosFiltrados);
    }

    // ==================== MUEBLES ====================
    async loadMuebles() {
        try {
            const response = await fetch(`${this.API_BASE}/catalogo-muebles`);
            
            if (!response.ok) {
                throw new Error('Error al cargar muebles');
            }
            
            this.muebles = await response.json();
            this.renderMuebles();
            this.updateStats();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los muebles: ' + error.message);
        }
    }

    renderMuebles(muebles = this.muebles) {
        const tbody = document.getElementById('mueblesTableBody');
        
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
                <td>${mueble.nombreMueble}</td>
                <td>${mueble.descripcion ? (mueble.descripcion.substring(0, 50) + '...') : 'Sin descripción'}</td>
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
        document.getElementById('nombreMueble').value = mueble.nombreMueble;
        document.getElementById('descripcionMueble').value = mueble.descripcion || '';
    }

    async guardarMueble(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true, 'btnGuardarMueble');
            
            const formData = new FormData(e.target);
            
            const muebleData = {
                nombreMueble: formData.get('nombreMueble'),
                descripcion: formData.get('descripcionMueble') || null
            };

            let response;
            if (this.currentMueble) {
                response = await fetch(`${this.API_BASE}/catalogo-muebles/${this.currentMueble.idCatalogoMueble}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(muebleData)
                });
            } else {
                response = await fetch(`${this.API_BASE}/catalogo-muebles`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(muebleData)
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al guardar el mueble');
            }

            this.showSuccess(`Mueble ${this.currentMueble ? 'actualizado' : 'creado'} correctamente`);
            this.hideModals();
            this.loadMuebles();

        } catch (error) {
            console.error('Error:', error);
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
                mueble.nombreMueble?.toLowerCase().includes(searchText) ||
                mueble.descripcion?.toLowerCase().includes(searchText)
            );
        });

        this.renderMuebles(mueblesFiltrados);
    }

    // ==================== CUARTO MUEBLES ====================
    async loadCuartoMuebles() {
        try {
            const response = await fetch(`${this.API_BASE}/cuarto-muebles`);
            
            if (!response.ok) {
                throw new Error('Error al cargar cuarto muebles');
            }
            
            this.cuartoMuebles = await response.json();
            this.updateStats();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar las asignaciones de muebles');
        }
    }

    async asignarMuebles(idCuarto) {
        this.currentCuartoForAssignment = this.cuartos.find(c => c.idCuarto === idCuarto);
        
        if (!this.currentCuartoForAssignment) return;

        const modal = document.getElementById('modalAsignarMuebles');
        const title = document.getElementById('modalAsignarTitle');
        
        title.textContent = `Asignar Muebles al Cuarto: ${this.currentCuartoForAssignment.nombreCuarto}`;
        
        await this.renderMueblesAsignacion(idCuarto);
        
        modal.style.display = 'block';
    }

    async renderMueblesAsignacion(idCuarto) {
        const disponiblesContainer = document.getElementById('mueblesDisponiblesList');
        const asignadosContainer = document.getElementById('mueblesAsignadosList');

        try {
            // Obtener muebles asignados a este cuarto
            const response = await fetch(`${this.API_BASE}/cuarto-muebles/cuarto/${idCuarto}`);
            const mueblesAsignados = response.ok ? await response.json() : [];

            // Separar muebles disponibles y asignados
            const idsAsignados = mueblesAsignados.map(cm => cm.idCatalogoMueble);
            const mueblesDisponibles = this.muebles.filter(m => !idsAsignados.includes(m.idCatalogoMueble));

            // Renderizar muebles disponibles
            disponiblesContainer.innerHTML = mueblesDisponibles.length > 0
                ? mueblesDisponibles.map(mueble => `
                    <div class="mueble-item">
                        <div class="mueble-info">
                            <h4>${mueble.nombreMueble}</h4>
                            <p>${mueble.descripcion || 'Sin descripción'}</p>
                        </div>
                        <button class="btn-add" onclick="cuartosMueblesManager.agregarMueble(${idCuarto}, ${mueble.idCatalogoMueble})">
                            <i class="fas fa-plus"></i> Agregar
                        </button>
                    </div>
                `).join('')
                : '<p style="text-align: center; color: var(--dark-gray);">No hay muebles disponibles</p>';

            // Renderizar muebles asignados
            asignadosContainer.innerHTML = mueblesAsignados.length > 0
                ? mueblesAsignados.map(cm => {
                    const mueble = this.muebles.find(m => m.idCatalogoMueble === cm.idCatalogoMueble);
                    return `
                        <div class="mueble-item">
                            <div class="mueble-info">
                                <h4>${mueble ? mueble.nombreMueble : 'Desconocido'}</h4>
                                <p>${mueble ? (mueble.descripcion || 'Sin descripción') : ''}</p>
                            </div>
                            <div class="mueble-cantidad">
                                <input type="number" value="${cm.cantidad || 0}" min="0" 
                                    onchange="cuartosMueblesManager.actualizarCantidad(${cm.idCuartoMueble}, this.value)">
                                <button class="btn-remove" onclick="cuartosMueblesManager.removerMueble(${cm.idCuartoMueble})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')
                : '<p style="text-align: center; color: var(--dark-gray);">No hay muebles asignados</p>';

        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los muebles del cuarto');
        }
    }

    async agregarMueble(idCuarto, idCatalogoMueble) {
        try {
            const response = await fetch(`${this.API_BASE}/cuarto-muebles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idCuarto: idCuarto,
                    idCatalogoMueble: idCatalogoMueble,
                    cantidad: 1,
                    estado: null
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al agregar el mueble');
            }

            this.showSuccess('Mueble agregado correctamente');
            await this.renderMueblesAsignacion(idCuarto);
            await this.loadCuartoMuebles();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        }
    }

    async removerMueble(idCuartoMueble) {
        try {
            const response = await fetch(`${this.API_BASE}/cuarto-muebles/${idCuartoMueble}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al remover el mueble');
            }

            this.showSuccess('Mueble removido correctamente');
            await this.renderMueblesAsignacion(this.currentCuartoForAssignment.idCuarto);
            await this.loadCuartoMuebles();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        }
    }

    async actualizarCantidad(idCuartoMueble, nuevaCantidad) {
        try {
            const cantidad = parseInt(nuevaCantidad);
            if (isNaN(cantidad) || cantidad < 0) {
                this.showError('La cantidad debe ser un número positivo');
                return;
            }

            const response = await fetch(`${this.API_BASE}/cuarto-muebles/${idCuartoMueble}/cantidad`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cantidad: cantidad })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al actualizar la cantidad');
            }

            this.showSuccess('Cantidad actualizada correctamente');
            await this.loadCuartoMuebles();

        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        }
    }

    // ==================== UTILIDADES ====================
    getStatusClass(status) {
        if (!status || status === '') return 'status-disponible';
        
        const statusMap = {
            'Ocupado': 'status-ocupado',
            'Mantenimiento': 'status-mantenimiento',
            'Disponible': 'status-disponible'
        };
        return statusMap[status] || 'status-disponible';
    }

    updateStats() {
        const totalCuartos = this.cuartos.length;
        const cuartosDisponibles = this.cuartos.filter(c => !c.estadoCuarto || c.estadoCuarto === '' || c.estadoCuarto === 'Disponible').length;
        const totalMuebles = this.muebles.length;
        const totalAsignaciones = this.cuartoMuebles.length;

        document.getElementById('totalCuartos').textContent = totalCuartos;
        document.getElementById('cuartosDisponibles').textContent = cuartosDisponibles;
        document.getElementById('totalMuebles').textContent = totalMuebles;
        document.getElementById('totalAsignaciones').textContent = totalAsignaciones;
    }

    showConfirmModal(message, action) {
        this.currentAction = action;
        const modal = document.getElementById('modalConfirmacion');
        const messageElement = document.getElementById('confirmacionMensaje');
        messageElement.textContent = message;
        modal.style.display = 'block';
    }

    async confirmarAccion() {
        try {
            this.showLoading(true, 'btnConfirmarAccion');
            
            if (this.currentAction === 'eliminarCuarto' && this.currentCuarto) {
                const response = await fetch(`${this.API_BASE}/cuartos/${this.currentCuarto.idCuarto}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al eliminar el cuarto');
                }

                this.showSuccess('Cuarto eliminado correctamente');
                this.hideModals();
                this.loadCuartos();
                this.loadCuartoMuebles();
            } else if (this.currentAction === 'eliminarMueble' && this.currentMueble) {
                const response = await fetch(`${this.API_BASE}/catalogo-muebles/${this.currentMueble.idCatalogoMueble}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al eliminar el mueble');
                }

                this.showSuccess('Mueble eliminado correctamente');
                this.hideModals();
                this.loadMuebles();
                this.loadCuartoMuebles();
            }
        } catch (error) {
            console.error('Error:', error);
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

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
            color: white;
            border-radius: 6px;
            box-shadow: var(--shadow);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.cuartosMueblesManager = new CuartosMueblesManager();
});