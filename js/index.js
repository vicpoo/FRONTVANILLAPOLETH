// index.js
// Sistema de traducción para FRONTVANILLAPOLETH

// Textos en español
const spanishTexts = {
    // Navegación
    "site-title": "FRONTVANILLAPOLETH",
    "nav-home": "Inicio",
    "nav-features": "Características",
    "nav-solution": "Solución",
    "nav-team": "Equipo",
    "nav-login": "Login",
    "translate": "Traducir al inglés",
    
    // Hero Section
    "hero-title": "Sistema de Gestión de Contratos y Arriendos",
    "hero-description": "Una solución integral para administrar contratos, pagos y comunicación entre arrendadores e inquilinos de manera eficiente y organizada.",
    "hero-start": "Comenzar Ahora",
    "hero-info": "Más Información",
    
    // Sidebar
    "sidebar-dashboard": "Dashboard",
    "sidebar-contracts": "Contratos",
    "sidebar-tenants": "Inquilinos",
    "sidebar-reports": "Reportes",
    
    // Estadísticas
    "stat-contracts": "Contratos Activos",
    "stat-tenants": "Inquilinos",
    
    // Tabla
    "table-contract": "Contrato",
    "table-status": "Estado",
    "table-expiration": "Vencimiento",
    "status-active": "Activo",
    "status-pending": "Pendiente",
    
    // Características
    "features-title": "Características Principales",
    "features-subtitle": "Descubre cómo nuestro sistema puede transformar la gestión de tus contratos de arriendo",
    "feature1-title": "Gestión de Contratos",
    "feature1-desc": "Administra todos tus contratos de arriendo en un solo lugar, con recordatorios automáticos de vencimiento.",
    "feature2-title": "Seguimiento de Pagos",
    "feature2-desc": "Controla los pagos de renta y servicios, con estados claros y alertas de morosidad.",
    "feature3-title": "Reportes de Mantenimiento",
    "feature3-desc": "Sistema integrado para reportar y dar seguimiento a problemas de mantenimiento en los inmuebles.",
    "feature4-title": "Notificaciones Automáticas",
    "feature4-desc": "Mantén informados a arrendadores e inquilinos con recordatorios y avisos importantes.",
    "feature5-title": "Reportes y Estadísticas",
    "feature5-desc": "Visualiza el estado de tus propiedades y finanzas con reportes detallados y gráficos intuitivos.",
    "feature6-title": "Acceso Móvil",
    "feature6-desc": "Gestiona tus contratos desde cualquier dispositivo, en cualquier momento y lugar.",
    
    // Solución
    "solution-title": "Solución Integral para la Problemática de Arriendos",
    "solution-subtitle": "Nuestro sistema aborda los principales problemas identificados en la gestión tradicional de arriendos:",
    "problem1-title": "Problema: Gestión Desorganizada",
    "problem1-desc": "Falta de un sistema centralizado para administrar contratos, pagos y comunicación.",
    "solution1-title": "Solución: Plataforma Unificada",
    "solution1-desc": "Toda la información de contratos, pagos y comunicación en un solo lugar accesible.",
    "problem2-title": "Problema: Comunicación Ineficiente",
    "problem2-desc": "Dificultades para reportar problemas y mantener informadas a ambas partes.",
    "solution2-title": "Solución: Canal de Comunicación Integrado",
    "solution2-desc": "Sistema de mensajería y notificaciones para mantener una comunicación fluida.",
    "problem3-title": "Problema: Falta de Recordatorios",
    "problem3-desc": "Olvido de fechas de pago, vencimiento de contratos y mantenimientos.",
    "solution3-title": "Solución: Recordatorios Automáticos",
    "solution3-desc": "Alertas y notificaciones automáticas para fechas importantes y pagos pendientes.",
    "stat1-desc": "Reducción en pagos atrasados",
    "stat2-desc": "Mejora en comunicación",
    "stat3-desc": "Satisfacción de usuarios",
    
    // Equipo
    "team-title": "Nuestro Equipo",
    "team-subtitle": "El equipo detrás del desarrollo de FRONTVANILLAPOLETH",
    "team-name": "Proyecto Integrador 3A",
    "team-role": "Equipo de Desarrollo",
    "skill1": "Desarrollo Web",
    "skill2": "UX/UI",
    "skill3": "Base de Datos",
    "values-title": "Nuestros Valores",
    "value1": "Enfoque en la experiencia del usuario",
    "value2": "Soluciones prácticas y eficientes",
    "value3": "Comunicación clara y transparente",
    "value4": "Mejora continua del producto",
    
    // CTA
    "cta-title": "¿Listo para transformar la gestión de tus arriendos?",
    "cta-subtitle": "Comienza hoy mismo con FRONTVANILLAPOLETH y descubre una nueva forma de administrar tus contratos.",
    "cta-button": "Comenzar Ahora",
    
    // Footer
    "footer-title": "FRONTVANILLAPOLETH",
    "footer-home": "Inicio",
    "footer-features": "Características",
    "footer-solution": "Solución",
    "footer-team": "Equipo",
    "footer-copy1": "© 2023 FRONTVANILLAPOLETH. Todos los derechos reservados.",
    "footer-copy2": "Proyecto Integrador 3A - Sistema de gestión de contratos y arriendos"
};

// Textos en inglés
const englishTexts = {
    // Navegación
    "site-title": "FRONTVANILLAPOLETH",
    "nav-home": "Home",
    "nav-features": "Features",
    "nav-solution": "Solution",
    "nav-team": "Team",
    "nav-login": "Login",
    "translate": "Translate to Spanish",
    
    // Hero Section
    "hero-title": "Contract and Rental Management System",
    "hero-description": "A comprehensive solution to manage contracts, payments, and communication between landlords and tenants efficiently and organized.",
    "hero-start": "Get Started Now",
    "hero-info": "More Information",
    
    // Sidebar
    "sidebar-dashboard": "Dashboard",
    "sidebar-contracts": "Contracts",
    "sidebar-tenants": "Tenants",
    "sidebar-reports": "Reports",
    
    // Estadísticas
    "stat-contracts": "Active Contracts",
    "stat-tenants": "Tenants",
    
    // Tabla
    "table-contract": "Contract",
    "table-status": "Status",
    "table-expiration": "Expiration",
    "status-active": "Active",
    "status-pending": "Pending",
    
    // Características
    "features-title": "Main Features",
    "features-subtitle": "Discover how our system can transform the management of your rental contracts",
    "feature1-title": "Contract Management",
    "feature1-desc": "Manage all your rental contracts in one place, with automatic expiration reminders.",
    "feature2-title": "Payment Tracking",
    "feature2-desc": "Control rent and utility payments with clear statuses and delinquency alerts.",
    "feature3-title": "Maintenance Reports",
    "feature3-desc": "Integrated system to report and track maintenance issues in properties.",
    "feature4-title": "Automatic Notifications",
    "feature4-desc": "Keep landlords and tenants informed with reminders and important notices.",
    "feature5-title": "Reports and Statistics",
    "feature5-desc": "Visualize the status of your properties and finances with detailed reports and intuitive charts.",
    "feature6-title": "Mobile Access",
    "feature6-desc": "Manage your contracts from any device, anytime and anywhere.",
    
    // Solución
    "solution-title": "Comprehensive Solution for Rental Issues",
    "solution-subtitle": "Our system addresses the main problems identified in traditional rental management:",
    "problem1-title": "Problem: Disorganized Management",
    "problem1-desc": "Lack of a centralized system to manage contracts, payments and communication.",
    "solution1-title": "Solution: Unified Platform",
    "solution1-desc": "All contract, payment and communication information in one accessible place.",
    "problem2-title": "Problem: Inefficient Communication",
    "problem2-desc": "Difficulties in reporting problems and keeping both parties informed.",
    "solution2-title": "Solution: Integrated Communication Channel",
    "solution2-desc": "Messaging and notification system to maintain fluid communication.",
    "problem3-title": "Problem: Lack of Reminders",
    "problem3-desc": "Forgetting payment dates, contract expirations and maintenance.",
    "solution3-title": "Solution: Automatic Reminders",
    "solution3-desc": "Alerts and automatic notifications for important dates and pending payments.",
    "stat1-desc": "Reduction in late payments",
    "stat2-desc": "Improvement in communication",
    "stat3-desc": "User satisfaction",
    
    // Equipo
    "team-title": "Our Team",
    "team-subtitle": "The team behind the development of FRONTVANILLAPOLETH",
    "team-name": "Integrator Project 3A",
    "team-role": "Development Team",
    "skill1": "Web Development",
    "skill2": "UX/UI",
    "skill3": "Database",
    "values-title": "Our Values",
    "value1": "Focus on user experience",
    "value2": "Practical and efficient solutions",
    "value3": "Clear and transparent communication",
    "value4": "Continuous product improvement",
    
    // CTA
    "cta-title": "Ready to transform your rental management?",
    "cta-subtitle": "Start today with FRONTVANILLAPOLETH and discover a new way to manage your contracts.",
    "cta-button": "Get Started Now",
    
    // Footer
    "footer-title": "FRONTVANILLAPOLETH",
    "footer-home": "Home",
    "footer-features": "Features",
    "footer-solution": "Solution",
    "footer-team": "Team",
    "footer-copy1": "© 2023 FRONTVANILLAPOLETH. All rights reserved.",
    "footer-copy2": "Integrator Project 3A - Contract and rental management system"
};

// Estado de idioma actual (false = español, true = inglés)
let isEnglish = false;

// Función para cambiar los textos
function translatePage() {
    // Primero invertimos el estado
    isEnglish = !isEnglish;
    
    // Luego seleccionamos los textos según el nuevo estado
    const texts = isEnglish ? englishTexts : spanishTexts;
    
    // Actualizar todos los elementos con data-key
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.getAttribute('data-key');
        if (texts[key]) {
            element.textContent = texts[key];
        }
    });
    
    // Cambiar el idioma del documento
    document.documentElement.lang = isEnglish ? 'en' : 'es';
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Agregar evento al botón de traducción
    const translateBtn = document.getElementById('translate-btn');
    if (translateBtn) {
        translateBtn.addEventListener('click', translatePage);
    }
});