class DashboardManager {
    constructor() {
        this.API_BASE = 'http://44.222.55.146:8000/api';
        this.charts = {};
        this.data = {
            estadisticas: {},
            contratos: [],
            reportes: [],
            cuartos: [],
            tiposReportes: ['Mantenimiento', 'Urgente', 'Queja', 'Sugerencia', 'Otro']
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboardData();
        this.initializeCharts();
    }

    setupEventListeners() {
        // Botón de actualizar
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.loadDashboardData();
        });

        // Filtro de tipos de reportes
        document.getElementById('tipoReporteFilter')?.addEventListener('change', (e) => {
            this.filterReportsByType(e.target.value);
        });
    }

    async loadDashboardData() {
        this.showLoading(true);
        
        try {
            // Cargar datos en paralelo
            const [
                contratosResponse,
                reportesResponse,
                estadisticasResponse,
                cuartosResponse,
                reportesRecientesResponse
            ] = await Promise.all([
                fetch(`${this.API_BASE}/contratos`),
                fetch(`${this.API_BASE}/reportes-inquilinos`),
                fetch(`${this.API_BASE}/reportes-inquilinos/estadisticas/tipos`),
                fetch(`${this.API_BASE}/cuartos`),
                fetch(`${this.API_BASE}/reportes-inquilinos?limit=5`)
            ]);

            // Procesar respuestas
            this.data.contratos = contratosResponse.ok ? await contratosResponse.json() : [];
            this.data.reportes = reportesResponse.ok ? await reportesResponse.json() : [];
            this.data.cuartos = cuartosResponse.ok ? await cuartosResponse.json() : [];
            
            // Procesar estadísticas de tipos de reportes
            if (estadisticasResponse.ok) {
                const estadisticasData = await estadisticasResponse.json();
                // Asegurar que tenemos todos los tipos de reportes
                this.data.estadisticas = this.normalizeReportTypes(estadisticasData);
            } else {
                this.data.estadisticas = this.getDefaultStatistics();
            }

            // Actualizar la UI
            this.updateStats();
            this.updateCharts();
            
            // Cargar reportes recientes
            if (reportesRecientesResponse.ok) {
                const recentReports = await reportesRecientesResponse.json();
                this.displayRecentReports(recentReports);
            }

            this.showNotification('Datos actualizados correctamente', 'success');

        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
            this.showNotification('Error al cargar los datos del dashboard', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    normalizeReportTypes(estadisticasData) {
        // Normalizar los tipos de reportes según los que realmente usas
        const normalized = {
            Mantenimiento: 0,
            Urgente: 0,
            Queja: 0,
            Sugerencia: 0,
            Otro: 0
        };

        // Mapear los datos del backend a los tipos que usas
        Object.keys(estadisticasData).forEach(tipo => {
            const tipoLower = tipo.toLowerCase();
            if (tipoLower.includes('mantenimiento')) {
                normalized.Mantenimiento += estadisticasData[tipo];
            } else if (tipoLower.includes('urgente') || tipoLower.includes('emergencia')) {
                normalized.Urgente += estadisticasData[tipo];
            } else if (tipoLower.includes('queja') || tipoLower.includes('reclamo')) {
                normalized.Queja += estadisticasData[tipo];
            } else if (tipoLower.includes('sugerencia') || tipoLower.includes('sugerir')) {
                normalized.Sugerencia += estadisticasData[tipo];
            } else {
                normalized.Otro += estadisticasData[tipo];
            }
        });

        return normalized;
    }

    getDefaultStatistics() {
        return {
            Mantenimiento: 0,
            Urgente: 0,
            Queja: 0,
            Sugerencia: 0,
            Otro: 0
        };
    }

    initializeCharts() {
        // Gráfica de Tipos de Reportes (Barras)
        const tiposReportesCtx = document.getElementById('tiposReportesChart').getContext('2d');
        this.charts.tiposReportes = new Chart(tiposReportesCtx, {
            type: 'bar',
            data: {
                labels: this.data.tiposReportes,
                datasets: [{
                    label: 'Cantidad de Reportes',
                    data: this.data.tiposReportes.map(tipo => this.data.estadisticas[tipo] || 0),
                    backgroundColor: [
                        '#FF6B35',  // Mantenimiento - Naranja
                        '#FF4444',  // Urgente - Rojo
                        '#2196F3',  // Queja - Azul
                        '#4CAF50',  // Sugerencia - Verde
                        '#9C27B0'   // Otro - Morado
                    ],
                    borderColor: [
                        '#E55A2B',
                        '#CC0000',
                        '#1976D2',
                        '#45a049',
                        '#7B1FA2'
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 12
                            },
                            callback: function(value) {
                                return Number.isInteger(value) ? value : '';
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        title: {
                            display: true,
                            text: 'Cantidad',
                            font: {
                                size: 13,
                                weight: 'bold'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        // Gráfica de Estado de Contratos (Doughnut)
        const estadoContratosCtx = document.getElementById('estadoContratosChart').getContext('2d');
        this.charts.estadoContratos = new Chart(estadoContratosCtx, {
            type: 'doughnut',
            data: {
                labels: ['Activos', 'Inactivos', 'Pendientes', 'Finalizados'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#4CAF50',  // Activos - Verde
                        '#F44336',  // Inactivos - Rojo
                        '#FF9800',  // Pendientes - Naranja
                        '#757575'   // Finalizados - Gris
                    ],
                    borderColor: '#FFFFFF',
                    borderWidth: 3,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 12
                            },
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                        
                                        return {
                                            text: `${label}: ${value} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            strokeStyle: data.datasets[0].borderColor,
                                            lineWidth: data.datasets[0].borderWidth,
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    title: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }

    updateStats() {
        // Total de contratos
        const totalContratos = this.data.contratos.length;
        this.updateElementText('totalContratos', totalContratos);

        // Inquilinos activos (contratos activos)
        const inquilinosActivos = this.data.contratos.filter(c => 
            c.estadoContrato && c.estadoContrato.toUpperCase() === 'ACTIVO'
        ).length;
        this.updateElementText('totalInquilinos', inquilinosActivos);

        // Reportes pendientes
        const reportesPendientes = this.data.reportes.filter(r => 
            r.estadoReporte && (
                r.estadoReporte.toUpperCase() === 'PENDIENTE' || 
                r.estadoReporte.toLowerCase() === 'abierto'
            )
        ).length;
        this.updateElementText('reportesPendientes', reportesPendientes);

        // Cuartos disponibles
        const cuartosDisponibles = this.data.cuartos ? 
            this.data.cuartos.filter(c => 
                c.estado && c.estado.toUpperCase() === 'DISPONIBLE'
            ).length : 0;
        this.updateElementText('cuartosDisponibles', cuartosDisponibles);
    }

    updateCharts() {
        // Actualizar gráfica de tipos de reportes
        if (this.data.estadisticas) {
            const chartData = this.data.tiposReportes.map(tipo => 
                this.data.estadisticas[tipo] || 0
            );
            
            this.charts.tiposReportes.data.datasets[0].data = chartData;
            this.charts.tiposReportes.update('none');
        }

        // Actualizar gráfica de estado de contratos
        const estadosContratos = {
            'ACTIVO': 0,
            'INACTIVO': 0,
            'PENDIENTE': 0,
            'FINALIZADO': 0
        };

        this.data.contratos.forEach(contrato => {
            if (contrato.estadoContrato) {
                const estado = contrato.estadoContrato.toUpperCase();
                if (estadosContratos.hasOwnProperty(estado)) {
                    estadosContratos[estado]++;
                } else if (estado.includes('FINAL')) {
                    estadosContratos.FINALIZADO++;
                } else if (estado.includes('PEND')) {
                    estadosContratos.PENDIENTE++;
                } else {
                    estadosContratos.INACTIVO++;
                }
            }
        });

        this.charts.estadoContratos.data.datasets[0].data = [
            estadosContratos.ACTIVO,
            estadosContratos.INACTIVO,
            estadosContratos.PENDIENTE,
            estadosContratos.FINALIZADO
        ];
        this.charts.estadoContratos.update('none');
    }

    filterReportsByType(tipo) {
        if (tipo === 'all') {
            // Mostrar todos los datos
            this.updateCharts();
            return;
        }

        // Filtrar reportes por tipo
        const filteredReports = this.data.reportes.filter(reporte => 
            reporte.tipo && reporte.tipo.toLowerCase() === tipo.toLowerCase()
        );

        // Actualizar estadísticas filtradas
        const filteredStats = { ...this.data.estadisticas };
        Object.keys(filteredStats).forEach(key => {
            filteredStats[key] = key === tipo ? filteredStats[key] : 0;
        });

        // Actualizar gráfica
        this.charts.tiposReportes.data.datasets[0].data = 
            this.data.tiposReportes.map(t => filteredStats[t] || 0);
        this.charts.tiposReportes.update();
    }

    displayRecentReports(reports) {
        const container = document.getElementById('recentReports');
        if (!container) return;

        if (!reports || reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No hay reportes recientes</p>
                </div>
            `;
            return;
        }

        container.innerHTML = reports.map(reporte => `
            <div class="recent-item ${reporte.estadoReporte === 'abierto' ? 'pending' : 'resolved'}">
                <div class="recent-icon">
                    <i class="fas fa-${this.getReportIcon(reporte.tipo)}"></i>
                </div>
                <div class="recent-details">
                    <h4>${reporte.nombre || 'Reporte sin nombre'}</h4>
                    <p class="recent-description">${this.truncateText(reporte.descripcion || '', 80)}</p>
                    <div class="recent-meta">
                        <span class="recent-type">${reporte.tipo || 'Sin tipo'}</span>
                        <span class="recent-date">${this.formatDate(reporte.fecha)}</span>
                        <span class="recent-status ${reporte.estadoReporte}">${this.getStatusText(reporte.estadoReporte)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getReportIcon(tipo) {
        if (!tipo) return 'exclamation-circle';
        
        const tipoLower = tipo.toLowerCase();
        if (tipoLower.includes('mantenimiento')) return 'tools';
        if (tipoLower.includes('urgente')) return 'exclamation-triangle';
        if (tipoLower.includes('queja')) return 'comment-exclamation';
        if (tipoLower.includes('sugerencia')) return 'lightbulb';
        return 'exclamation-circle';
    }

    getStatusText(status) {
        if (!status) return 'Desconocido';
        
        const statusLower = status.toLowerCase();
        if (statusLower === 'abierto') return 'Pendiente';
        if (statusLower === 'cerrado') return 'Resuelto';
        if (statusLower === 'pendiente') return 'En proceso';
        return status;
    }

    formatDate(dateString) {
        if (!dateString) return 'Fecha desconocida';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    updateElementText(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Animación de conteo
            const currentValue = parseInt(element.textContent) || 0;
            this.animateCounter(element, currentValue, value, 1000);
        }
    }

    animateCounter(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const currentValue = Math.floor(progress * (end - start) + start);
            element.textContent = currentValue;
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                element.textContent = end;
            }
        };
        window.requestAnimationFrame(step);
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Eliminar notificaciones anteriores
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        });

        // Crear nueva notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto-remover después de 3 segundos
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

// Inicializar el dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
    
    // Actualizar automáticamente cada 30 segundos
    setInterval(() => {
        window.dashboardManager.loadDashboardData();
    }, 30000);
});