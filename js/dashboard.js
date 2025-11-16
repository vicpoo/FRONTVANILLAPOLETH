class DashboardManager {
    constructor() {
        this.API_BASE = 'http://localhost:8000/api';
        this.charts = {};
        this.data = {
            estadisticas: {},
            contratos: [],
            reportes: [],
            cuartos: []
        };
        this.init();
    }

    init() {
        this.loadDashboardData();
        this.initializeCharts();
    }

    async loadDashboardData() {
        this.showLoading(true);
        
        try {
            // Cargar datos en paralelo
            const [
                contratosResponse,
                reportesResponse,
                estadisticasResponse,
                cuartosResponse
            ] = await Promise.all([
                fetch(`${this.API_BASE}/contratos`),
                fetch(`${this.API_BASE}/reportes-inquilinos`),
                fetch(`${this.API_BASE}/reportes-inquilinos/estadisticas/tipos`),
                fetch(`${this.API_BASE}/cuartos`)
            ]);

            // Procesar respuestas
            if (contratosResponse.ok) {
                this.data.contratos = await contratosResponse.json();
            }

            if (reportesResponse.ok) {
                this.data.reportes = await reportesResponse.json();
            }

            if (estadisticasResponse.ok) {
                this.data.estadisticas = await estadisticasResponse.json();
            }

            if (cuartosResponse.ok) {
                this.data.cuartos = await cuartosResponse.json();
            }

            // Actualizar la UI
            this.updateStats();
            this.updateCharts();

        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
            this.showError('Error al cargar los datos del dashboard');
        } finally {
            this.showLoading(false);
        }
    }

    initializeCharts() {
        // Gráfica de Tipos de Reportes (Barras)
        const tiposReportesCtx = document.getElementById('tiposReportesChart').getContext('2d');
        this.charts.tiposReportes = new Chart(tiposReportesCtx, {
            type: 'bar',
            data: {
                labels: ['Mantenimiento', 'Reparación', 'Limpieza', 'Seguridad', 'Otro'],
                datasets: [{
                    label: 'Cantidad de Reportes',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#FF6B35',
                        '#4CAF50',
                        '#2196F3',
                        '#FF9800',
                        '#9C27B0'
                    ],
                    borderColor: [
                        '#E55A2B',
                        '#45a049',
                        '#1976D2',
                        '#F57C00',
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
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
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
                        '#4CAF50',
                        '#F44336',
                        '#FF9800',
                        '#757575'
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
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 12
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
                    animateRotate: true
                }
            }
        });
    }

    updateStats() {
        // Total de contratos
        const totalContratos = this.data.contratos.length;
        document.getElementById('totalContratos').textContent = totalContratos;

        // Inquilinos activos (contratos activos)
        const inquilinosActivos = this.data.contratos.filter(c => c.estadoContrato === 'ACTIVO').length;
        document.getElementById('totalInquilinos').textContent = inquilinosActivos;

        // Reportes pendientes
        const reportesPendientes = this.data.reportes.filter(r => 
            r.estadoReporte === 'PENDIENTE' || !r.estadoReporte
        ).length;
        document.getElementById('reportesPendientes').textContent = reportesPendientes;

        // Cuartos disponibles
        const cuartosDisponibles = this.data.cuartos ? 
            this.data.cuartos.filter(c => c.estado === 'DISPONIBLE').length : 0;
        document.getElementById('cuartosDisponibles').textContent = cuartosDisponibles;
    }

    updateCharts() {
        // Actualizar gráfica de tipos de reportes
        if (this.data.estadisticas.datos) {
            const datos = this.data.estadisticas.datos;
            this.charts.tiposReportes.data.datasets[0].data = [
                datos.Mantenimiento || 0,
                datos.Reparacion || 0,
                datos.Limpieza || 0,
                datos.Seguridad || 0,
                datos.Otro || 0
            ];
            this.charts.tiposReportes.update();
        }

        // Actualizar gráfica de estado de contratos
        const estadosContratos = {
            'ACTIVO': 0,
            'INACTIVO': 0,
            'PENDIENTE': 0,
            'FINALIZADO': 0
        };

        this.data.contratos.forEach(contrato => {
            if (estadosContratos.hasOwnProperty(contrato.estadoContrato)) {
                estadosContratos[contrato.estadoContrato]++;
            }
        });

        this.charts.estadoContratos.data.datasets[0].data = [
            estadosContratos.ACTIVO,
            estadosContratos.INACTIVO,
            estadosContratos.PENDIENTE,
            estadosContratos.FINALIZADO
        ];
        this.charts.estadoContratos.update();
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        
        if (show) {
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
        }
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
            box-shadow: var(--shadow-lg);
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

// Inicializar el dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});

// Agregar estilos CSS para las animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);