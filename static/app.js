// Actualizar la vista de detalles del recluta
function updateReclutaDetailsView(recluta) {
    if (!recluta) return;
    
    const detailsElements = {
        nombre: document.getElementById('detail-recluta-nombre'),
        puesto: document.getElementById('detail-recluta-puesto'),
        email: document.getElementById('detail-recluta-email'),
        telefono: document.getElementById('detail-recluta-telefono'),
        notas: document.getElementById('detail-recluta-notas'),
        estado: document.getElementById('detail-recluta-estado')
    };
    
    // Actualizar los elementos que existan
    if (detailsElements.nombre) detailsElements.nombre.textContent = recluta.nombre;
    if (detailsElements.puesto) detailsElements.puesto.textContent = recluta.puesto || 'No especificado';
    if (detailsElements.email) detailsElements.email.textContent = recluta.email;
    if (detailsElements.telefono) detailsElements.telefono.textContent = recluta.telefono;
    if (detailsElements.notas) detailsElements.notas.textContent = recluta.notas || 'Sin notas';
    
    // Actualizar estado
    if (detailsElements.estado) {
        detailsElements.estado.textContent = recluta.estado;
        detailsElements.estado.className = `badge badge-${recluta.estado === 'Activo' ? 'success' : (recluta.estado === 'Rechazado' ? 'danger' : 'warning')}`;
    }
}

// Confirmar eliminación de recluta
function confirmDeleteRecluta(id) {
    // Si no se pasa ID, usar el actual del modal
    const reclutaId = id || currentReclutaId;
    
    if (!reclutas) {
        showNotification('No hay reclutas cargados', 'error');
        return;
    }
    
    const recluta = reclutas.find(r => r.id === reclutaId);
    
    if (!recluta) {
        showNotification('Recluta no encontrado', 'error');
        return;
    }
    
    // Elementos del modal de confirmación
    const confirmElements = {
        title: document.getElementById('confirm-title'),
        message: document.getElementById('confirm-message'),
        button: document.getElementById('confirm-action-btn'),
        modal: document.getElementById('confirm-modal')
    };
    
    if (!confirmElements.modal) {
        // Si no hay modal, eliminar directamente
        deleteRecluta(reclutaId);
        return;
    }
    
    // Configurar modal de confirmación
    if (confirmElements.title) confirmElements.title.textContent = 'Eliminar Recluta';
    if (confirmElements.message) confirmElements.message.textContent = 
        `¿Estás seguro de que deseas eliminar a ${recluta.nombre}? Esta acción no se puede deshacer.`;
    
    // Configurar acción de confirmación
    if (confirmElements.button) {
        confirmElements.button.innerHTML = '<i class="fas fa-trash-alt"></i> Eliminar';
        confirmElements.button.className = 'btn-danger';
        confirmElements.button.onclick = function() {
            deleteRecluta(reclutaId);
            closeConfirmModal();
        };
    }
    
    // Mostrar modal
    confirmElements.modal.style.display = 'block';
}

// Eliminar recluta
function deleteRecluta(id) {
    if (!reclutas || reclutas.length === 0) {
        showNotification('No hay reclutas para eliminar', 'error');
        return;
    }
    
    const index = reclutas.findIndex(r => r.id === id);
    if (index === -1) {
        showNotification('Recluta no encontrado', 'error');
        return;
    }
    
    // Eliminar de la lista
    reclutas.splice(index, 1);
    
    // Refrescar lista
    displayReclutas(reclutas);
    
    // Cerrar modal de detalles si está abierto
    if (currentReclutaId === id) {
        closeViewReclutaModal();
    }
    
    // Mostrar notificación
    showNotification('Recluta eliminado correctamente', 'success');
}

// Cerrar modal de ver recluta
function closeViewReclutaModal() {
    const modal = document.getElementById('view-recluta-modal');
    if (modal) modal.style.display = 'none';
    currentReclutaId = null;
}

// Cerrar modal de confirmación
function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.style.display = 'none';
}

// Filtrar reclutas por búsqueda y estado
function filterReclutas() {
    if (!reclutas) return;
    
    const searchInput = document.getElementById('search-reclutas');
    const filterEstado = document.getElementById('filter-estado');
    
    if (!searchInput && !filterEstado) return;
    
    const searchText = searchInput ? searchInput.value.toLowerCase() : '';
    const estadoFilter = filterEstado ? filterEstado.value : 'todos';
    
    let filteredReclutas = reclutas.filter(recluta => {
        // Filtrar por texto de búsqueda
        const matchesSearch = !searchText || 
            recluta.nombre.toLowerCase().includes(searchText) ||
            recluta.email.toLowerCase().includes(searchText) ||
            recluta.telefono.toLowerCase().includes(searchText) ||
            (recluta.puesto && recluta.puesto.toLowerCase().includes(searchText));
        
        // Filtrar por estado
        const matchesEstado = estadoFilter === 'todos' || recluta.estado === estadoFilter;
        
        return matchesSearch && matchesEstado;
    });
    
    // Aplicar ordenamiento actual
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
        sortReclutas(filteredReclutas, sortSelect.value);
    } else {
        displayReclutas(filteredReclutas);
    }
}

// Ordenar reclutas
function sortReclutas(filteredList, sortOption) {
    // Si no hay reclutas, no hacer nada
    if (!reclutas || reclutas.length === 0) return;
    
    // Si se llama desde un evento, obtener valor del select
    let sortBy = sortOption;
    if (!sortOption) {
        const sortSelect = document.getElementById('sort-by');
        if (sortSelect) sortBy = sortSelect.value;
        else sortBy = 'nombre-asc'; // Valor por defecto
    }
    
    // Lista a ordenar (filtrada o completa)
    let listToSort = filteredList || [...reclutas];
    
    // Ordenar según opción
    switch (sortBy) {
        case 'nombre-asc':
            listToSort.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        case 'nombre-desc':
            listToSort.sort((a, b) => b.nombre.localeCompare(a.nombre));
            break;
        case 'fecha-asc':
            listToSort.sort((a, b) => new Date(a.fecha_registro) - new Date(b.fecha_registro));
            break;
        case 'fecha-desc':
            listToSort.sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro));
            break;
    }
    
    // Mostrar lista ordenada
    displayReclutas(listToSort);
}

// Actualizar paginación
function updatePagination(totalItems) {
    const paginationElements = {
        prevBtn: document.getElementById('prev-page'),
        nextBtn: document.getElementById('next-page'),
        totalPages: document.getElementById('total-pages')
    };
    
    if (!paginationElements.totalPages) return;
    
    const totalPages = Math.ceil(totalItems / 10) || 1;
    paginationElements.totalPages.textContent = totalPages;
    
    // Habilitar/deshabilitar botones si existen
    if (paginationElements.prevBtn) paginationElements.prevBtn.disabled = true;
    if (paginationElements.nextBtn) paginationElements.nextBtn.disabled = (totalPages <= 1);
}

// Programar entrevista
function programarEntrevista() {
    if (!reclutas || !currentReclutaId) {
        showNotification('Error: No se puede programar entrevista', 'error');
        return;
    }
    
    const recluta = reclutas.find(r => r.id === currentReclutaId);
    if (!recluta) return;
    
    // Cerrar modal de detalles
    closeViewReclutaModal();
    
    // Elementos del modal de entrevista
    const interviewElements = {
        candidatePic: document.getElementById('interview-candidate-pic'),
        candidateName: document.getElementById('interview-candidate-name'),
        candidatePuesto: document.getElementById('interview-candidate-puesto'),
        dateInput: document.getElementById('interview-date'),
        timeInput: document.getElementById('interview-time'),
        modal: document.getElementById('schedule-interview-modal')
    };
    
    if (!interviewElements.modal) {
        showNotification('No se puede mostrar el modal de entrevista', 'error');
        return;
    }
    
    // Configurar datos del candidato en el modal
    if (interviewElements.candidatePic) interviewElements.candidatePic.src = recluta.foto_url;
    if (interviewElements.candidateName) interviewElements.candidateName.textContent = recluta.nombre;
    if (interviewElements.candidatePuesto) interviewElements.candidatePuesto.textContent = recluta.puesto || 'No especificado';
    
    // Establecer fecha por defecto (mañana)
    if (interviewElements.dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        interviewElements.dateInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    // Hora por defecto (10:00 AM)
    if (interviewElements.timeInput) interviewElements.timeInput.value = '10:00';
    
    // Mostrar modal
    interviewElements.modal.style.display = 'block';
}

// Cerrar modal de programación
function closeScheduleModal() {
    const modal = document.getElementById('schedule-interview-modal');
    if (modal) modal.style.display = 'none';
}

// Guardar entrevista
function saveInterview() {
    const interviewElements = {
        dateInput: document.getElementById('interview-date'),
        timeInput: document.getElementById('interview-time'),
        saveButton: document.querySelector('#schedule-interview-modal .btn-primary')
    };
    
    if (!interviewElements.dateInput || !interviewElements.timeInput) {
        showNotification('Error al obtener datos del formulario', 'error');
        return;
    }
    
    const date = interviewElements.dateInput.value;
    const time = interviewElements.timeInput.value;
    
    if (!date || !time) {
        showNotification('Por favor, completa los campos de fecha y hora', 'error');
        return;
    }
    
    // Mostrar estado de carga
    if (interviewElements.saveButton) {
        interviewElements.saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        interviewElements.saveButton.disabled = true;
    }
    
    try {
        // Simular tiempo de guardado
        setTimeout(() => {
            // En una implementación real, guardaríamos la entrevista
            
            // Cerrar modal
            closeScheduleModal();
            
            // Mostrar notificación
            showNotification('Entrevista programada correctamente', 'success');
            
            // Restaurar botón
            if (interviewElements.saveButton) {
                interviewElements.saveButton.innerHTML = '<i class="fas fa-calendar-check"></i> Programar';
                interviewElements.saveButton.disabled = false;
            }
        }, 800);
    } catch (error) {
        showNotification('Error al programar la entrevista: ' + (error.message || 'Error desconocido'), 'error');
        
        if (interviewElements.saveButton) {
            interviewElements.saveButton.innerHTML = '<i class="fas fa-calendar-check"></i> Programar';
            interviewElements.saveButton.disabled = false;
        }
    }
}

// Cambiar contraseña
function changePassword() {
    const passwordElements = {
        currentPassword: document.getElementById('current-password'),
        newPassword: document.getElementById('new-password'),
        confirmPassword: document.getElementById('confirm-password'),
        button: document.getElementById('change-password-btn')
    };
    
    if (!passwordElements.currentPassword || 
        !passwordElements.newPassword || 
        !passwordElements.confirmPassword) {
        showNotification('Error al obtener campos del formulario', 'error');
        return;
    }
    
    const currentPassword = passwordElements.currentPassword.value;
    const newPassword = passwordElements.newPassword.value;
    const confirmPassword = passwordElements.confirmPassword.value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Por favor, completa todos los campos', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('Las contraseñas nuevas no coinciden', 'error');
        return;
    }
    
    // Mostrar estado de carga
    if (passwordElements.button) {
        passwordElements.button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cambiando...';
        passwordElements.button.disabled = true;
    }
    
    try {
        // Simular tiempo de procesamiento
        setTimeout(() => {
            // En una implementación real, cambiaríamos la contraseña
            
            // Limpiar campos
            passwordElements.currentPassword.value = '';
            passwordElements.newPassword.value = '';
            passwordElements.confirmPassword.value = '';
            
            // Mostrar notificación
            showNotification('Contraseña cambiada correctamente', 'success');
            
            // Restaurar botón
            if (passwordElements.button) {
                passwordElements.button.innerHTML = '<i class="fas fa-key"></i> Cambiar Contraseña';
                passwordElements.button.disabled = false;
            }
        }, 800);
    } catch (error) {
        showNotification('Error al cambiar la contraseña: ' + (error.message || 'Error desconocido'), 'error');
        
        if (passwordElements.button) {
            passwordElements.button.innerHTML = '<i class="fas fa-key"></i> Cambiar Contraseña';
            passwordElements.button.disabled = false;
        }
    }
}

// Mostrar ayuda
function showHelp() {
    showNotification('Sistema de Gestión de Reclutas: Versión 2.0. Para más información, contacta al soporte técnico.', 'info');
}

// Manejo de imágenes
function handleProfileImageChange(event) {
    if (!event || !event.target || !event.target.files || !event.target.files[0]) return;
    
    const file = event.target.files[0];
    const profilePic = document.getElementById('dashboard-profile-pic');
    
    if (!profilePic) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        if (!e || !e.target || !e.target.result) return;
        
        profilePic.src = e.target.result;
        profileImage = file;
        
        // Actualizar la imagen de perfil en el objeto currentGerente
        if (currentGerente) {
            currentGerente.profileUrl = e.target.result;
        }
        
        // Mostrar notificación
        showNotification('Foto de perfil actualizada correctamente', 'success');
    };
    reader.readAsDataURL(file);
}

function handleReclutaImageChange(event) {
    if (!event || !event.target || !event.target.files || !event.target.files[0]) return;
    
    const file = event.target.files[0];
    const previewDiv = document.getElementById('recluta-pic-preview');
    
    if (!previewDiv) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        if (!e || !e.target || !e.target.result) return;
        
        // Limpiar el div
        previewDiv.innerHTML = '';
        
        // Crear imagen
        const img = document.createElement('img');
        img.src = e.target.result;
        img.classList.add('profile-pic');
        previewDiv.appendChild(img);
        reclutaImage = file;
    };
    reader.readAsDataURL(file);
}

// Mostrar notificaciones
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    if (!notification || !notificationMessage) return;
    
    notificationMessage.textContent = message;
    
    // Configurar tipo de notificación
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('show');
    
    // Auto-ocultar después de 5 segundos
    setTimeout(hideNotification, 5000);
}

// Ocultar notificación
function hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) notification.classList.remove('show');
}

// Toggle dropdown de perfil
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown-content');
    if (dropdown) dropdown.classList.toggle('show');
}

// Toggle visibilidad de contraseña
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleButton = document.getElementById('toggle-password');
    
    if (!passwordInput || !toggleButton) return;
    
    const icon = toggleButton.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        if (icon) icon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        if (icon) icon.className = 'fas fa-eye';
    }
}

// Cerrar menús al hacer clic fuera
function closeMenusOnClickOutside(event) {
    // No hacer nada si no hay evento
    if (!event || !event.target) return;
    
    // Dropdown de perfil
    if (!event.target.matches('.profile-dropdown-button') && 
        !event.target.closest('.profile-dropdown-button')) {
        const dropdown = document.getElementById('profile-dropdown-content');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
    
    // Modal de añadir recluta
    const addModal = document.getElementById('add-recluta-modal');
    if (addModal && event.target === addModal) {
        closeAddReclutaModal();
    }
    
    // Modal de ver/editar recluta
    const viewModal = document.getElementById('view-recluta-modal');
    if (viewModal && event.target === viewModal) {
        closeViewReclutaModal();
    }
    
    // Modal de confirmación
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal && event.target === confirmModal) {
        closeConfirmModal();
    }
    
    // Modal de programación de entrevista
    const scheduleModal = document.getElementById('schedule-interview-modal');
    if (scheduleModal && event.target === scheduleModal) {
        closeScheduleModal();
    }
}

// Cambiar sección activa en el dashboard
function changeActiveSection(targetSection) {
    if (!targetSection) return;
    
    // Actualizar tab activa
    const navItems = document.querySelectorAll('.dashboard-nav li');
    if (navItems) {
        navItems.forEach(li => {
            li.classList.remove('active');
            const link = li.querySelector(`[data-section="${targetSection}"]`);
            if (link) {
                li.classList.add('active');
            }
        });
    }
    
    // Actualizar sección visible
    const sections = document.querySelectorAll('.dashboard-content-section');
    if (sections) {
        sections.forEach(section => {
            section.classList.remove('active');
        });
    }
    
    const targetElement = document.getElementById(targetSection);
    if (targetElement) targetElement.classList.add('active');
}

// Inicializar calendario
function initCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthElement = document.getElementById('current-month');
    
    if (!calendarGrid || !currentMonthElement) return;
    
    // Fecha actual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Mostrar mes actual
    currentMonthElement.textContent = `${getMonthName(currentMonth)} ${currentYear}`;
    
    // Generar días del calendario
    generateCalendarDays(currentYear, currentMonth);
}

// Generar días del calendario
function generateCalendarDays(year, month) {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '';
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    // Último día del mes
    const lastDay = new Date(year, month + 1, 0);
    
    // Día de la semana en que empieza el mes (0 = domingo)
    const startDayOfWeek = firstDay.getDay();
    
    // Días del mes anterior
    for (let i = 0; i < startDayOfWeek; i++) {
        const prevMonthDate = new Date(year, month, -startDayOfWeek + i + 1);
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.innerHTML = `<div class="calendar-day-number">${prevMonthDate.getDate()}</div>`;
        calendarGrid.appendChild(dayDiv);
    }
    
    // Días del mes actual
    const today = new Date();
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        // Marcar el día actual
        if (today.getDate() === i && today.getMonth() === month && today.getFullYear() === year) {
            dayDiv.classList.add('today');
        }
        
        dayDiv.innerHTML = `<div class="calendar-day-number">${i}</div>`;
        
        // Añadir eventos de ejemplo para el calendario
        if (i === 5) {
            dayDiv.innerHTML += `<div class="calendar-event">Entrevista: Ana García</div>`;
        }
        if (i === 8) {
            dayDiv.innerHTML += `<div class="calendar-event">Entrevista: Carlos López</div>`;
        }
        if (i === 15) {
            dayDiv.innerHTML += `<div class="calendar-event">Reunión de equipo</div>`;
        }
        
        calendarGrid.appendChild(dayDiv);
    }
    
    // Calcular casillas restantes para completar la cuadrícula
    const totalCells = 42;
    const remainingCells = totalCells - (startDayOfWeek + lastDay.getDate());
    
    // Días del mes siguiente
    for (let i = 1; i <= remainingCells; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.innerHTML = `<div class="calendar-day-number">${i}</div>`;
        calendarGrid.appendChild(dayDiv);
    }
}

// Navegación del calendario
function navigateCalendar(direction) {
    const currentMonthElement = document.getElementById('current-month');
    if (!currentMonthElement) return;
    
    const currentMonthText = currentMonthElement.textContent;
    if (!currentMonthText) return;
    
    const parts = currentMonthText.split(' ');
    if (parts.length !== 2) return;
    
    const monthName = parts[0];
    const year = parseInt(parts[1], 10);
    
    if (isNaN(year)) return;
    
    let currentMonth = getMonthNumber(monthName);
    if (currentMonth === -1) return;
    
    let currentYear = year;
    
    // Ajustar mes según dirección
    currentMonth += direction;
    
    // Ajustar año si necesario
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    
    // Actualizar título
    currentMonthElement.textContent = `${getMonthName(currentMonth)} ${currentYear}`;
    
    // Regenerar días
    generateCalendarDays(currentYear, currentMonth);
}

// Helpers para calendario
function getMonthName(monthIndex) {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[monthIndex] || '';
}

function getMonthNumber(monthName) {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months.indexOf(monthName);
}

// Formatear fecha
function formatDate(dateString) {
    if (!dateString) return 'Fecha no disponible';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Fecha inválida';
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (error) {
        return 'Error al formatear fecha';
    }
}

// Comprobar y aplicar tema guardado
function checkSavedTheme() {
    try {
        // Comprobar si hay un tema guardado en localStorage
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme === 'true') {
            toggleDarkMode(true);
            
            // Actualizar switch en configuración
            const darkThemeToggle = document.getElementById('dark-theme-toggle');
            if (darkThemeToggle) {
                darkThemeToggle.checked = true;
            }
        }
        
        // Comprobar si hay un color primario guardado
        const savedColor = localStorage.getItem('primaryColor');
        if (savedColor) {
            changePrimaryColor(savedColor);
            
            // Actualizar selección de color
            const colorOptions = document.querySelectorAll('.color-option');
            if (colorOptions) {
                colorOptions.forEach(option => {
                    option.classList.remove('selected');
                    const input = option.querySelector('input');
                    if (input && input.value === savedColor) {
                        option.classList.add('selected');
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error al cargar tema guardado:', error);
    }
}

// Toggle modo oscuro
function toggleDarkMode(value) {
    try {
        // Si se proporciona un valor, usar ese; si no, alternar
        darkMode = value !== undefined ? value : !darkMode;
        
        const body = document.body;
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        
        if (darkMode) {
            if (body) body.classList.add('dark-mode');
            if (darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            if (body) body.classList.remove('dark-mode');
            if (darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        // Guardar preferencia
        localStorage.setItem('darkMode', darkMode);
        
        // Actualizar switch en configuración si existe
        const darkThemeToggle = document.getElementById('dark-theme-toggle');
        if (darkThemeToggle) {
            darkThemeToggle.checked = darkMode;
        }
    } catch (error) {
        console.error('Error al cambiar modo oscuro:', error);
    }
}

// Cambiar color primario
function changePrimaryColor(color) {
    try {
        if (!color) return;
        
        document.documentElement.style.setProperty('--primary-color', color);
        
        // Ajustar color oscuro basado en el primario
        const darkenedColor = darkenColor(color, 20);
        document.documentElement.style.setProperty('--primary-dark', darkenedColor);
        
        // Guardar preferencia
        localStorage.setItem('primaryColor', color);
    } catch (error) {
        console.error('Error al cambiar color primario:', error);
    }
}

// Oscurecer color (para generar variante dark)
function darkenColor(hex, percent) {
    try {
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length !== 7) {
            return '#0056b3'; // Valor por defecto si hay error
        }
        
        // Convertir a RGB
        let r = parseInt(hex.substring(1, 3), 16);
        let g = parseInt(hex.substring(3, 5), 16);
        let b = parseInt(hex.substring(5, 7), 16);
        
        // Aplicar porcentaje de oscurecimiento
        r = Math.max(0, Math.floor(r * (100 - percent) / 100));
        g = Math.max(0, Math.floor(g * (100 - percent) / 100));
        b = Math.max(0, Math.floor(b * (100 - percent) / 100));
        
        // Convertir de vuelta a hex
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    } catch (error) {
        console.error('Error al oscurecer color:', error);
        return '#0056b3'; // Valor por defecto si hay error
    }
}// Inicialización de variables globales
let currentGerente = null;
let profileImage = null;
let reclutaImage = null;
let currentReclutaId = null;
let reclutas = [];
let darkMode = false;

// Evento para cuando se carga completamente el documento
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar listeners de eventos para la interfaz
    initEventListeners();
    
    // Comprobar si hay un tema guardado
    checkSavedTheme();
    
    // Inicializar calendario si estamos en esa sección
    initCalendar();
});

// Inicialización de todos los event listeners
function initEventListeners() {
    // Listeners de navegación del dashboard
    const navLinks = document.querySelectorAll('.dashboard-nav a');
    if (navLinks && navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetSection = this.getAttribute('data-section');
                changeActiveSection(targetSection);
            });
        });
    }
    
    // Toggle modo oscuro
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
    
    // Toggle de tema en configuración
    const darkThemeToggle = document.getElementById('dark-theme-toggle');
    if (darkThemeToggle) {
        darkThemeToggle.addEventListener('click', function() {
            toggleDarkMode();
        });
    }
    
    // Cambio de color primario
    const colorOptions = document.querySelectorAll('input[name="primary-color"]');
    if (colorOptions && colorOptions.length > 0) {
        colorOptions.forEach(option => {
            option.addEventListener('change', function() {
                changePrimaryColor(this.value);
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.parentElement.classList.add('selected');
            });
        });
    }
    
    // Color de fondo
    const pageColorPicker = document.getElementById('page-color');
    if (pageColorPicker) {
        pageColorPicker.addEventListener('change', function() {
            document.body.style.backgroundColor = this.value;
        });
    }
    
    // Manejo de la foto de perfil
    const profileUploadInput = document.getElementById('profile-upload');
    if (profileUploadInput) {
        profileUploadInput.addEventListener('change', handleProfileImageChange);
    }
    
    // Manejo de la foto del recluta
    const reclutaUploadInput = document.getElementById('recluta-upload');
    if (reclutaUploadInput) {
        reclutaUploadInput.addEventListener('change', handleReclutaImageChange);
    }
    
    // Botón de ayuda
    const helpButton = document.getElementById('help-button');
    if (helpButton) {
        helpButton.addEventListener('click', showHelp);
    }
    
    // Dropdown de perfil
    const profileDropdownButton = document.getElementById('profile-dropdown-button');
    if (profileDropdownButton) {
        profileDropdownButton.addEventListener('click', toggleProfileDropdown);
    }
    
    // Toggle visibilidad de contraseña
    const togglePasswordButton = document.getElementById('toggle-password');
    if (togglePasswordButton) {
        togglePasswordButton.addEventListener('click', togglePasswordVisibility);
    }
    
    // Cerrar notificaciones
    const notificationCloseButton = document.getElementById('notification-close');
    if (notificationCloseButton) {
        notificationCloseButton.addEventListener('click', hideNotification);
    }
    
    // Búsqueda de reclutas
    const searchInput = document.getElementById('search-reclutas');
    if (searchInput) {
        searchInput.addEventListener('input', filterReclutas);
    }
    
    // Filtro de estado
    const filterEstado = document.getElementById('filter-estado');
    if (filterEstado) {
        filterEstado.addEventListener('change', filterReclutas);
    }
    
    // Ordenar reclutas
    const sortBy = document.getElementById('sort-by');
    if (sortBy) {
        sortBy.addEventListener('change', function() {
            sortReclutas(null, this.value);
        });
    }
    
    // Botón de cambio de contraseña
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', changePassword);
    }
    
    // Cerrar dropdowns y modales al hacer clic fuera
    window.addEventListener('click', function(event) {
        closeMenusOnClickOutside(event);
    });
    
    // Navegación de calendario
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => navigateCalendar(-1));
        nextMonthBtn.addEventListener('click', () => navigateCalendar(1));
    }
    
    // Botón para añadir evento en calendario
    const addEventButton = document.getElementById('add-event-button');
    if (addEventButton) {
        addEventButton.addEventListener('click', () => {
            // Mostrar modal para añadir evento
            showNotification('Esta función estará disponible próximamente', 'warning');
        });
    }

    // Rellenar el campo de email del usuario en configuración
    const userEmailField = document.getElementById('user-email');
    if (userEmailField && currentGerente) {
        userEmailField.value = currentGerente.email || '';
    }
    
    // Botón de login
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', login);
    }
}

// Funcionalidad de login mejorada
function login() {
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) {
        showNotification('Completa los campos de usuario y contraseña', 'warning');
        return;
    }

    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        loginButton.disabled = true;
    }

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => {
        if (!res.ok) throw new Error("Credenciales inválidas");
        return res.json();
    })
    .then(data => {
        currentGerente = data.usuario;

        document.getElementById('login-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';

        document.getElementById('gerente-name').textContent = currentGerente.email;
        document.getElementById('dropdown-user-name').textContent = currentGerente.email;
        document.getElementById('dashboard-profile-pic').src = "/static/default-profile.png"; // O una ruta válida

        document.getElementById('user-name').value = currentGerente.email;
        document.getElementById('user-email').value = currentGerente.email;

        showNotification(`¡Bienvenido ${currentGerente.email}!`, 'success');
    })
    .catch(err => {
        console.error(err);
        showNotification('Usuario o contraseña incorrectos', 'error');
    })
    .finally(() => {
        if (loginButton) {
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
            loginButton.disabled = false;
        }
    });
}

// Cierre de sesión
function logout() {
    currentGerente = null;
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('dashboard-section').style.display = 'none';

    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';

    showNotification('Sesión cerrada correctamente', 'success');
}

// Cargar datos de demostración
function loadDemoReclutas() {
    // Datos de demostración para reclutas
    reclutas = [
        {
            id: 1,
            nombre: 'Ana García',
            email: 'ana.garcia@ejemplo.com',
            telefono: '555-1234',
            estado: 'Activo',
            foto_url: '/api/placeholder/40/40',
            fecha_registro: '2025-03-15',
            puesto: 'Desarrollador Frontend',
            notas: 'Experiencia de 3 años en React y Angular. Disponible para incorporación inmediata.'
        },
        {
            id: 2,
            nombre: 'Carlos López',
            email: 'carlos.lopez@ejemplo.com',
            telefono: '555-5678',
            estado: 'En proceso',
            foto_url: '/api/placeholder/40/40',
            fecha_registro: '2025-03-20',
            puesto: 'Diseñador UX/UI',
            notas: 'Portfolio impresionante. Pendiente segunda entrevista con el equipo de diseño.'
        },
        {
            id: 3,
            nombre: 'María Rodríguez',
            email: 'maria.rodriguez@ejemplo.com',
            telefono: '555-9012',
            estado: 'Activo',
            foto_url: '/api/placeholder/40/40',
            fecha_registro: '2025-03-18',
            puesto: 'Desarrollador Backend',
            notas: 'Experiencia con Node.js y bases de datos SQL/NoSQL. Disponible a partir del 15 de mayo.'
        },
        {
            id: 4,
            nombre: 'Javier Martínez',
            email: 'javier.martinez@ejemplo.com',
            telefono: '555-3456',
            estado: 'En proceso',
            foto_url: '/api/placeholder/40/40',
            fecha_registro: '2025-03-25',
            puesto: 'DevOps Engineer',
            notas: 'Conocimientos avanzados en AWS y Docker. Pendiente prueba técnica.'
        }
    ];
    
    // Mostrar reclutas en la tabla
    displayReclutas(reclutas);
}

// Mostrar lista de reclutas en la tabla
function displayReclutas(reclutasToDisplay) {
    const reclutasList = document.getElementById('reclutas-list');
    if (!reclutasList) return;
    
    reclutasList.innerHTML = '';
    
    if (!reclutasToDisplay || reclutasToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="text-align: center;">No se encontraron reclutas. ¡Agrega tu primer recluta!</td>`;
        reclutasList.appendChild(row);
    } else {
        reclutasToDisplay.forEach(recluta => {
            const row = document.createElement('tr');
            const badgeClass = recluta.estado === 'Activo' ? 'badge-success' : 
                              (recluta.estado === 'Rechazado' ? 'badge-danger' : 'badge-warning');
            
            row.innerHTML = `
                <td><img src="${recluta.foto_url}" alt="${recluta.nombre}" class="recluta-foto"></td>
                <td>${recluta.nombre}</td>
                <td>${recluta.email}</td>
                <td>${recluta.telefono}</td>
                <td><span class="badge ${badgeClass}">${recluta.estado}</span></td>
                <td>
                    <button class="action-btn" onclick="viewRecluta(${recluta.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn" onclick="editRecluta(${recluta.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" onclick="confirmDeleteRecluta(${recluta.id})" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            reclutasList.appendChild(row);
        });
    }
    
    // Actualizar paginación
    updatePagination(reclutasToDisplay ? reclutasToDisplay.length : 0);
}

// Abrir modal para añadir nuevo recluta
function openAddReclutaModal() {
    const modal = document.getElementById('add-recluta-modal');
    if (!modal) return;
    
    modal.style.display = 'block';
    
    // Limpiar formulario
    const nombreInput = document.getElementById('recluta-nombre');
    const emailInput = document.getElementById('recluta-email');
    const telefonoInput = document.getElementById('recluta-telefono');
    const puestoInput = document.getElementById('recluta-puesto');
    const estadoSelect = document.getElementById('recluta-estado');
    const notasTextarea = document.getElementById('recluta-notas');
    const picPreview = document.getElementById('recluta-pic-preview');
    
    if (nombreInput) nombreInput.value = '';
    if (emailInput) emailInput.value = '';
    if (telefonoInput) telefonoInput.value = '';
    if (puestoInput) puestoInput.value = '';
    if (estadoSelect) estadoSelect.value = 'En proceso';
    if (notasTextarea) notasTextarea.value = '';
    
    // Limpiar preview de imagen
    if (picPreview) picPreview.innerHTML = '<i class="fas fa-user-circle"></i>';
    reclutaImage = null;
}

// Cerrar modal de añadir recluta
function closeAddReclutaModal() {
    const modal = document.getElementById('add-recluta-modal');
    if (modal) modal.style.display = 'none';
}

// Añadir nuevo recluta
function addRecluta() {
    const nombreInput = document.getElementById('recluta-nombre');
    const emailInput = document.getElementById('recluta-email');
    const telefonoInput = document.getElementById('recluta-telefono');
    const puestoInput = document.getElementById('recluta-puesto');
    const estadoSelect = document.getElementById('recluta-estado');
    const notasTextarea = document.getElementById('recluta-notas');
    
    if (!nombreInput || !emailInput || !telefonoInput) {
        showNotification('Error al obtener los campos del formulario', 'error');
        return;
    }
    
    const nombre = nombreInput.value;
    const email = emailInput.value;
    const telefono = telefonoInput.value;
    const puesto = puestoInput ? puestoInput.value : '';
    const estado = estadoSelect ? estadoSelect.value : 'En proceso';
    const notas = notasTextarea ? notasTextarea.value : '';
    
    if (!nombre || !email || !telefono) {
        showNotification('Por favor, completa los campos obligatorios', 'error');
        return;
    }
    
    // Mostrar estado de carga
    const saveButton = document.querySelector('#add-recluta-modal .btn-primary');
    if (!saveButton) {
        addReclutaFinal(nombre, email, telefono, puesto, estado, notas);
        return;
    }
    
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    saveButton.disabled = true;
    
    try {
        // Simular tiempo de guardado (1 segundo)
        setTimeout(() => {
            // Crear un nuevo ID
            const nuevoId = reclutas.length > 0 ? Math.max(...reclutas.map(r => r.id)) + 1 : 1;
            
            // Crear objeto de nuevo recluta
            const nuevoRecluta = {
                id: nuevoId,
                nombre: nombre,
                email: email,
                telefono: telefono,
                estado: estado,
                foto_url: reclutaImage ? URL.createObjectURL(reclutaImage) : '/api/placeholder/40/40',
                fecha_registro: new Date().toISOString().split('T')[0],
                puesto: puesto,
                notas: notas
            };
            
            // Añadir a la lista local
            reclutas.push(nuevoRecluta);
            
            // Cerrar modal
            closeAddReclutaModal();
            
            // Refrescar lista
            displayReclutas(reclutas);
            
            // Mostrar notificación
            showNotification('Recluta añadido correctamente', 'success');
            
            // Restaurar botón
            saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar Recluta';
            saveButton.disabled = false;
        }, 1000);
    } catch (error) {
        showNotification('Error al añadir recluta: ' + (error.message || 'Error desconocido'), 'error');
        saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar Recluta';
        saveButton.disabled = false;
    }
}

// Función auxiliar para añadir recluta
function addReclutaFinal(nombre, email, telefono, puesto, estado, notas) {
    // Crear un nuevo ID
    const nuevoId = reclutas && reclutas.length > 0 ? Math.max(...reclutas.map(r => r.id)) + 1 : 1;
    
    // Crear objeto de nuevo recluta
    const nuevoRecluta = {
        id: nuevoId,
        nombre: nombre,
        email: email,
        telefono: telefono,
        estado: estado,
        foto_url: reclutaImage ? URL.createObjectURL(reclutaImage) : '/api/placeholder/40/40',
        fecha_registro: new Date().toISOString().split('T')[0],
        puesto: puesto,
        notas: notas
    };
    
    // Añadir a la lista local
    reclutas.push(nuevoRecluta);
    
    // Cerrar modal
    closeAddReclutaModal();
    
    // Refrescar lista
    displayReclutas(reclutas);
    
    // Mostrar notificación
    showNotification('Recluta añadido correctamente', 'success');
}

// Ver detalles de un recluta
function viewRecluta(id) {
    if (!reclutas || reclutas.length === 0) {
        showNotification('No hay reclutas cargados', 'error');
        return;
    }
    
    const recluta = reclutas.find(r => r.id === id);
    if (!recluta) {
        showNotification('Recluta no encontrado', 'error');
        return;
    }
    
    currentReclutaId = id;
    
    // Rellenar los datos en el modal
    const detailsElements = {
        nombre: document.getElementById('detail-recluta-nombre'),
        puesto: document.getElementById('detail-recluta-puesto'),
        email: document.getElementById('detail-recluta-email'),
        telefono: document.getElementById('detail-recluta-telefono'),
        fecha: document.getElementById('detail-recluta-fecha'),
        notas: document.getElementById('detail-recluta-notas'),
        pic: document.getElementById('detail-recluta-pic'),
        estado: document.getElementById('detail-recluta-estado'),
        viewButtons: document.getElementById('view-mode-buttons'),
        editForm: document.getElementById('edit-mode-form'),
        modal: document.getElementById('view-recluta-modal')
    };
    
    if (!detailsElements.modal) {
        showNotification('Error al mostrar detalles: Modal no encontrado', 'error');
        return;
    }
    
    // Rellenar los datos disponibles
    if (detailsElements.nombre) detailsElements.nombre.textContent = recluta.nombre;
    if (detailsElements.puesto) detailsElements.puesto.textContent = recluta.puesto || 'No especificado';
    if (detailsElements.email) detailsElements.email.textContent = recluta.email;
    if (detailsElements.telefono) detailsElements.telefono.textContent = recluta.telefono;
    if (detailsElements.fecha) detailsElements.fecha.textContent = formatDate(recluta.fecha_registro);
    if (detailsElements.notas) detailsElements.notas.textContent = recluta.notas || 'Sin notas';
    if (detailsElements.pic) detailsElements.pic.src = recluta.foto_url;
    
    // Actualizar estado
    if (detailsElements.estado) {
        detailsElements.estado.textContent = recluta.estado;
        detailsElements.estado.className = `badge badge-${recluta.estado === 'Activo' ? 'success' : (recluta.estado === 'Rechazado' ? 'danger' : 'warning')}`;
    }
    
    // Mostrar la vista y ocultar la edición
    if (detailsElements.viewButtons) detailsElements.viewButtons.style.display = 'flex';
    if (detailsElements.editForm) detailsElements.editForm.style.display = 'none';
    
    // Mostrar el modal
    detailsElements.modal.style.display = 'block';
}

// Editar un recluta directamente (para botón en la tabla)
function editRecluta(id) {
    viewRecluta(id);
    setTimeout(() => {
        enableEditMode();
    }, 300);
}

// Pasar al modo de edición
function enableEditMode() {
    if (!reclutas || !currentReclutaId) return;
    
    const recluta = reclutas.find(r => r.id === currentReclutaId);
    if (!recluta) return;
    
    // Elementos del formulario
    const formElements = {
        nombre: document.getElementById('edit-recluta-nombre'),
        email: document.getElementById('edit-recluta-email'),
        telefono: document.getElementById('edit-recluta-telefono'),
        puesto: document.getElementById('edit-recluta-puesto'),
        estado: document.getElementById('edit-recluta-estado'),
        notas: document.getElementById('edit-recluta-notas'),
        viewButtons: document.getElementById('view-mode-buttons'),
        editForm: document.getElementById('edit-mode-form')
    };
    
    // Verificar si los elementos existen
    if (!formElements.nombre || !formElements.email || !formElements.telefono || 
        !formElements.viewButtons || !formElements.editForm) {
        showNotification('Error al cargar el formulario de edición', 'error');
        return;
    }
    
    // Rellenar formulario con datos actuales
    formElements.nombre.value = recluta.nombre;
    formElements.email.value = recluta.email;
    formElements.telefono.value = recluta.telefono;
    if (formElements.puesto) formElements.puesto.value = recluta.puesto || '';
    if (formElements.estado) formElements.estado.value = recluta.estado;
    if (formElements.notas) formElements.notas.value = recluta.notas || '';
    
    // Ocultar vista y mostrar edición
    formElements.viewButtons.style.display = 'none';
    formElements.editForm.style.display = 'block';
}

// Cancelar la edición
function cancelEdit() {
    const viewButtons = document.getElementById('view-mode-buttons');
    const editForm = document.getElementById('edit-mode-form');
    
    if (viewButtons) viewButtons.style.display = 'flex';
    if (editForm) editForm.style.display = 'none';
}

// Guardar cambios en el recluta
function saveReclutaChanges() {
    if (!reclutas || !currentReclutaId) {
        showNotification('Error: No hay datos para guardar', 'error');
        return;
    }
    
    const index = reclutas.findIndex(r => r.id === currentReclutaId);
    if (index === -1) {
        showNotification('Error: Recluta no encontrado', 'error');
        return;
    }
    
    // Obtener elementos del formulario
    const formElements = {
        nombre: document.getElementById('edit-recluta-nombre'),
        email: document.getElementById('edit-recluta-email'),
        telefono: document.getElementById('edit-recluta-telefono'),
        puesto: document.getElementById('edit-recluta-puesto'),
        estado: document.getElementById('edit-recluta-estado'),
        notas: document.getElementById('edit-recluta-notas'),
        saveButton: document.querySelector('.edit-mode-buttons .btn-primary')
    };
    
    // Verificar si los elementos obligatorios existen
    if (!formElements.nombre || !formElements.email || !formElements.telefono) {
        showNotification('Error al obtener datos del formulario', 'error');
        return;
    }
    
    // Obtener valores del formulario
    const nombre = formElements.nombre.value;
    const email = formElements.email.value;
    const telefono = formElements.telefono.value;
    const puesto = formElements.puesto ? formElements.puesto.value : '';
    const estado = formElements.estado ? formElements.estado.value : 'En proceso';
    const notas = formElements.notas ? formElements.notas.value : '';
    
    if (!nombre || !email || !telefono) {
        showNotification('Por favor, completa los campos obligatorios', 'error');
        return;
    }
    
    // Mostrar estado de carga si el botón existe
    if (formElements.saveButton) {
        formElements.saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        formElements.saveButton.disabled = true;
    }
    
    try {
        // Simular tiempo de guardado
        setTimeout(() => {
            // Actualizar objeto
            reclutas[index].nombre = nombre;
            reclutas[index].email = email;
            reclutas[index].telefono = telefono;
            reclutas[index].puesto = puesto;
            reclutas[index].estado = estado;
            reclutas[index].notas = notas;
            
            // Actualizar datos en la vista
            updateReclutaDetailsView(reclutas[index]);
            
            // Volver a modo vista
            cancelEdit();
            
            // Refrescar lista
            displayReclutas(reclutas);
            
            // Mostrar notificación
            showNotification('Recluta actualizado correctamente', 'success');
            
            // Restaurar botón
            if (formElements.saveButton) {
                formElements.saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
                formElements.saveButton.disabled = false;
            }
        }, 800);
    } catch (error) {
        showNotification('Error al actualizar recluta: ' + (error.message || 'Error desconocido'), 'error');
        
        if (formElements.saveButton) {
            formElements.saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            formElements.saveButton.disabled = false;
        }
    }
}

// Actualizar la vista de detalles del recluta
function updateReclutaDetailsView(recluta) {
    if (!recluta) return;
    
    const detailsElements = {
        nombre: document.getElementById('detail-recluta-nombre'),
        puesto: document.getElementById('detail-recluta-puesto'),
        email: document.getElementById('detail-recluta-email'),
        telefono: document.getElementById('detail-recluta-telefono'),
        notas: document.getElementById('detail-recluta-notas'),
        estado: document.getElementById('detail-recluta-estado'),
        fecha: document.getElementById('detail-recluta-fecha'),
        pic: document.getElementById('detail-recluta-pic')
    };
    
    // Actualizar los elementos que existan
    if (detailsElements.nombre) detailsElements.nombre.textContent = recluta.nombre;
    if (detailsElements.puesto) detailsElements.puesto.textContent = recluta.puesto || 'No especificado';
    if (detailsElements.email) detailsElements.email.textContent = recluta.email;
    if (detailsElements.telefono) detailsElements.telefono.textContent = recluta.telefono;
    if (detailsElements.notas) detailsElements.notas.textContent = recluta.notas || 'Sin notas';
    if (detailsElements.fecha) detailsElements.fecha.textContent = formatDate(recluta.fecha_registro);
    if (detailsElements.pic && recluta.foto_url) detailsElements.pic.src = recluta.foto_url;
    
    // Actualizar estado
    if (detailsElements.estado) {
        detailsElements.estado.textContent = recluta.estado;
        detailsElements.estado.className = `badge badge-${recluta.estado === 'Activo' ? 'success' : (recluta.estado === 'Rechazado' ? 'danger' : 'warning')}`;
    }
}

function openAddReclutaModal() {
    const modal = document.getElementById('add-recluta-modal');
    if (modal) modal.style.display = 'block';

    const saveButton = document.createElement('button');
    saveButton.className = 'btn-primary';
    saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar Recluta';
    saveButton.onclick = saveRecluta;

    const modalFooter = document.querySelector('#add-recluta-modal .modal-body');
    if (modalFooter && !document.getElementById('guardar-recluta-btn')) {
        saveButton.id = 'guardar-recluta-btn';
        modalFooter.appendChild(saveButton);
    }
}

function saveRecluta() {
    const nombre = document.getElementById('recluta-nombre')?.value;
    const email = document.getElementById('recluta-email')?.value;
    const telefono = document.getElementById('recluta-telefono')?.value;
    const estado = 'Activo'; // o puedes obtenerlo de un campo si lo tienes

    if (!nombre || !email || !telefono) {
        showNotification('Por favor, completa todos los campos del formulario', 'warning');
        return;
    }

    const data = {
        nombre,
        email,
        telefono,
        estado
    };

    fetch('/api/reclutas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => {
        if (!res.ok) throw new Error('Error al guardar recluta');
        return res.json();
    })
    .then(data => {
        showNotification('Recluta guardado correctamente', 'success');
        closeAddReclutaModal();
        // Aquí podrías recargar la lista de reclutas si tienes una función
        // getReclutas();
    })
    .catch(err => {
        console.error(err);
        showNotification('Error al guardar el recluta', 'error');
    });
}
