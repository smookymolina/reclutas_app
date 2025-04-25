// Inicialización de variables globales
let currentGerente = null;
let profileImage = null;
let reclutaImage = null;
let currentReclutaId = null;
let reclutas = [];
let darkMode = false;
let calendarEvents = [];
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

// Evento para cuando se carga completamente el documento
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar listeners de eventos para la interfaz
    initEventListeners();
    
    // Comprobar si hay un tema guardado
    checkSavedTheme();
    
    // Comprobar si hay una sesión activa
    checkSession();
    
    // Inicializar calendario si estamos en esa sección
    initCalendar();
});

// Comprobar si existe una sesión de usuario activa
function checkSession() {
    fetch('/api/usuario')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('No hay sesión activa');
        })
        .then(data => {
            // Hay sesión activa, cargar dashboard
            currentGerente = data;
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            
            // Actualizar UI con datos de usuario
            document.getElementById('gerente-name').textContent = currentGerente.nombre || currentGerente.email;
            document.getElementById('dropdown-user-name').textContent = currentGerente.nombre || currentGerente.email;
            
            // Cargar foto de perfil si existe
            if (currentGerente.foto_url) {
                document.getElementById('dashboard-profile-pic').src = currentGerente.foto_url.startsWith('http')
                    ? currentGerente.foto_url
                    : (currentGerente.foto_url === 'default_profile.jpg' 
                        ? "/api/placeholder/100/100" 
                        : `/${currentGerente.foto_url}`);
            } else {
                document.getElementById('dashboard-profile-pic').src = "/api/placeholder/100/100";
            }
            
            // Rellenar campos del perfil
            if (document.getElementById('user-name')) 
                document.getElementById('user-name').value = currentGerente.nombre || '';
            if (document.getElementById('user-email')) 
                document.getElementById('user-email').value = currentGerente.email || '';
            if (document.getElementById('user-phone'))
                document.getElementById('user-phone').value = currentGerente.telefono || '';
            
            // Carga la lista de reclutas desde el backend
            function loadReclutas() {
                fetch('/api/reclutas')
                .then(res => res.json())
                .then(data => {
                    reclutas = data;
                    displayReclutas(reclutas);
    })
    .catch(err => {
        console.error('Error al cargar reclutas:', err);
        showNotification('Error al cargar los reclutas', 'error');
        // Si falla, cargar datos de demo como fallback
        loadDemoReclutas();
    });
}
            
            // Cargar estadísticas
            loadEstadisticas();
        })
        .catch(error => {
            console.log('No hay sesión activa:', error);
            // No hay sesión, mostrar login
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('dashboard-section').style.display = 'none';
        });
}

// Cargar estadísticas
function loadEstadisticas() {
    fetch('/api/estadisticas')
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar estadísticas');
            return response.json();
        })
        .then(data => {
            // Actualizar elementos de estadísticas
            const stats = {
                totalReclutas: document.querySelector('.stat-card:nth-child(1) .stat-number'),
                reclutasActivos: document.querySelector('.stat-card:nth-child(2) .stat-number'),
                enProceso: document.querySelector('.stat-card:nth-child(3) .stat-number'),
                entrevistasPendientes: document.querySelector('.stat-card:nth-child(4) .stat-number')
            };
            
            if (stats.totalReclutas) stats.totalReclutas.textContent = data.total_reclutas;
            if (stats.reclutasActivos) stats.reclutasActivos.textContent = data.reclutas_activos;
            if (stats.enProceso) stats.enProceso.textContent = data.reclutas_proceso;
            if (stats.entrevistasPendientes) stats.entrevistasPendientes.textContent = data.entrevistas_pendientes;
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

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
        darkThemeToggle.addEventListener('change', function() {
            toggleDarkMode(this.checked);
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
        // Añadir la inicialización para cargar eventos al principio
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar listeners de eventos para la interfaz
    initEventListeners();
    
    // Comprobar si hay un tema guardado
    checkSavedTheme();
    
    // Inicializar calendario si estamos en esa sección
    initCalendar();
    
    // Cargar eventos guardados cuando cambiamos a la sección del calendario
    const calendarTab = document.querySelector('.dashboard-nav li a[data-section="calendario-section"]');
    if (calendarTab) {
        calendarTab.addEventListener('click', function() {
            // Pequeño retraso para asegurar que la sección es visible
            setTimeout(() => {
                const currentMonthElement = document.getElementById('current-month');
                if (currentMonthElement) {
                    const parts = currentMonthElement.textContent.split(' ');
                    if (parts.length === 2) {
                        const month = getMonthNumber(parts[0]);
                        const year = parseInt(parts[1], 10);
                        
                        if (!isNaN(year) && month !== -1) {
                            loadSavedEvents(year, month);
                        }
                    }
                }
            }, 200);
        });
    }
});
}

// Funcionalidad de login mejorada
function login() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;

    if (!email || !password) {
        showNotification('Completa los campos de usuario y contraseña', 'warning');
        return;
    }

    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        loginButton.disabled = true;
    }

    // Para pruebas (si la API no está funcionando):
    if (email === 'admin@example.com' && password === 'admin') {
        currentGerente = { email: email, id: 1 };
        
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        
        document.getElementById('gerente-name').textContent = email;
        document.getElementById('dropdown-user-name').textContent = email;
        document.getElementById('dashboard-profile-pic').src = "/api/placeholder/100/100";
        
        if (document.getElementById('user-name')) 
            document.getElementById('user-name').value = email;
        if (document.getElementById('user-email')) 
            document.getElementById('user-email').value = email;
        
        // Extraer el nombre de usuario del email (parte antes del @)
        const nombreUsuario = email.split('@')[0];
        // Capitalizar la primera letra del nombre
        const nombreCapitalizado = nombreUsuario.charAt(0).toUpperCase() + nombreUsuario.slice(1);
        showNotification(`Bienvenido, ${nombreCapitalizado}`, 'success');
        loadDemoReclutas();
        
        // Restablecer botón de login
        if (loginButton) {
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
            loginButton.disabled = false;
        }
        return; // Importante: terminar la función aquí para evitar la llamada fetch
    }

    // Solo intentar la llamada fetch si no son las credenciales de prueba
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
        document.getElementById('dashboard-profile-pic').src = "/api/placeholder/100/100";

        if (document.getElementById('user-name')) 
            document.getElementById('user-name').value = currentGerente.email;
        if (document.getElementById('user-email')) 
            document.getElementById('user-email').value = currentGerente.email;

        // Extraer el nombre de usuario del email (parte antes del @)
        const nombreUsuario = currentGerente.email.split('@')[0];
        // Capitalizar la primera letra del nombre
        const nombreCapitalizado = nombreUsuario.charAt(0).toUpperCase() + nombreUsuario.slice(1);
        showNotification(`Bienvenido, ${nombreCapitalizado}`, 'success');
        loadDemoReclutas();
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

 // Permitir que Enter funcione en el login
 const emailField = document.getElementById('email');
 const passwordField = document.getElementById('password');
 
 if (emailField) {
     emailField.addEventListener('keypress', function(e) {
         if (e.key === 'Enter') {
             login();
         }
     });
 }
 
 if (passwordField) {
     passwordField.addEventListener('keypress', function(e) {
         if (e.key === 'Enter') {
             login();
         }
     });
 }

// Cierre de sesión
function logout() {
    fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => {
        if (!res.ok) throw new Error('Error al cerrar sesión');
        return res.json();
    })
    .then(() => {
        currentGerente = null;
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('dashboard-section').style.display = 'none';
    
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    
        showNotification('Sesión cerrada correctamente', 'success');
    })
    .catch(err => {
        console.error(err);
        showNotification('Error al cerrar sesión', 'error');
    });
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
            
            // Determinar la URL de la foto
            const fotoUrl = recluta.foto_url ? 
                (recluta.foto_url.startsWith('http') ? 
                    recluta.foto_url : 
                    (recluta.foto_url === 'default_profile.jpg' ? 
                        "/api/placeholder/40/40" : 
                        `/${recluta.foto_url}`)) : 
                "/api/placeholder/40/40";
            
            row.innerHTML = `
                <td><img src="${fotoUrl}" alt="${recluta.nombre}" class="recluta-foto"></td>
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

// Función unificada para añadir un recluta
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
    if (saveButton) {
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        saveButton.disabled = true;
    }
    
    // Crear FormData si hay imagen, o usar JSON si no hay
    let requestOptions;
    if (reclutaImage) {
        const formData = new FormData();
        formData.append('nombre', nombre);
        formData.append('email', email);
        formData.append('telefono', telefono);
        formData.append('puesto', puesto);
        formData.append('estado', estado);
        formData.append('notas', notas);
        formData.append('foto', reclutaImage);
        
        requestOptions = {
            method: 'POST',
            body: formData
        };
    } else {
        requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre, email, telefono, puesto, estado, notas
            })
        };
    }
    
    // Enviar petición al backend
    fetch('/api/reclutas', requestOptions)
        .then(response => {
            if (!response.ok) throw new Error('Error al crear recluta');
            return response.json();
        })
        .then(data => {
            // Añadir a la lista local
            reclutas.push(data);
            
            // Cerrar modal
            closeAddReclutaModal();
            
            // Refrescar lista
            displayReclutas(reclutas);
            
            // Mostrar notificación
            showNotification('Recluta añadido correctamente', 'success');
            
            // Recargar estadísticas
            loadEstadisticas();
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al añadir recluta: ' + error.message, 'error');
            
            // Crear simulación local si falla la API
            if (typeof addReclutaFinal === 'function') {
                addReclutaFinal(nombre, email, telefono, puesto, estado, notas);
            }
        })
        .finally(() => {
            // Restaurar botón
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar Recluta';
                saveButton.disabled = false;
            }
        });
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
    if (picPreview) {
        picPreview.innerHTML = '<i class="fas fa-user-circle"></i>';
        reclutaImage = null;
    }
}

// Cerrar modal de añadir recluta
function closeAddReclutaModal() {
    const modal = document.getElementById('add-recluta-modal');
    if (modal) modal.style.display = 'none';
}

// Ver detalles de un recluta
function viewRecluta(id) {
    fetch(`/api/reclutas/${id}`)
        .then(response => {
            if (!response.ok) throw new Error('Recluta no encontrado');
            return response.json();
        })
        .then(recluta => {
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
            
            // Determinar la URL de la foto
            const fotoUrl = recluta.foto_url ? 
                (recluta.foto_url.startsWith('http') ? 
                    recluta.foto_url : 
                    (recluta.foto_url === 'default_profile.jpg' ? 
                        "/api/placeholder/100/100" : 
                        `/${recluta.foto_url}`)) : 
                "/api/placeholder/100/100";
            
            // Rellenar los datos disponibles
            if (detailsElements.nombre) detailsElements.nombre.textContent = recluta.nombre;
            if (detailsElements.puesto) detailsElements.puesto.textContent = recluta.puesto || 'No especificado';
            if (detailsElements.email) detailsElements.email.textContent = recluta.email;
            if (detailsElements.telefono) detailsElements.telefono.textContent = recluta.telefono;
            if (detailsElements.fecha) detailsElements.fecha.textContent = formatDate(recluta.fecha_registro);
            if (detailsElements.notas) detailsElements.notas.textContent = recluta.notas || 'Sin notas';
            if (detailsElements.pic) detailsElements.pic.src = fotoUrl;
            
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
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al cargar detalles: ' + error.message, 'error');
        });
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
    if (!currentReclutaId) return;
    
    fetch(`/api/reclutas/${currentReclutaId}`)
        .then(response => {
            if (!response.ok) throw new Error('Recluta no encontrado');
            return response.json();
        })
        .then(recluta => {
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
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al cargar datos para edición: ' + error.message, 'error');
        });
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
    if (!currentReclutaId) {
        showNotification('Error: No hay datos para guardar', 'error');
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
    
    // Crear datos para enviar
    const requestData = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre, email, telefono, puesto, estado, notas
        })
    };
    
    // Enviar petición al backend
    fetch(`/api/reclutas/${currentReclutaId}`, requestData)
        .then(response => {
            if (!response.ok) throw new Error('Error al actualizar recluta');
            return response.json();
        })
        .then(reclutaActualizado => {
            // Actualizar en la lista local
            const index = reclutas.findIndex(r => r.id === currentReclutaId);
            if (index !== -1) {
                reclutas[index] = reclutaActualizado;
            }
            
            // Actualizar vista de detalles
            updateReclutaDetailsView(reclutaActualizado);
            
            // Volver a modo vista
            cancelEdit();
            
            // Refrescar lista
            displayReclutas(reclutas);
            
            // Recargar estadísticas si cambió el estado
            loadEstadisticas();
            
            // Mostrar notificación
            showNotification('Recluta actualizado correctamente', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al actualizar recluta: ' + error.message, 'error');
        })
        .finally(() => {
            // Restaurar botón
            if (formElements.saveButton) {
                formElements.saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
                formElements.saveButton.disabled = false;
            }
        });
}

// Confirmar eliminación de recluta
function confirmDeleteRecluta(id) {
    // Si no se pasa ID, usar el actual del modal
    const reclutaId = id || currentReclutaId;
    
    if (!reclutaId) {
        showNotification('No se puede identificar el recluta a eliminar', 'error');
        return;
    }
    
    // Buscar el recluta (podría estar en la memoria o necesitar una petición)
    const recluta = reclutas.find(r => r.id === reclutaId);
    
    if (!recluta) {
        // Si no está en memoria, intentar obtenerlo
        fetch(`/api/reclutas/${reclutaId}`)
            .then(response => {
                if (!response.ok) throw new Error('Recluta no encontrado');
                return response.json();
            })
            .then(recluta => {
                showDeleteConfirmation(recluta);
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error al preparar eliminación: ' + error.message, 'error');
            });
    } else {
        showDeleteConfirmation(recluta);
    }
}

// Mostrar confirmación para eliminar
function showDeleteConfirmation(recluta) {
    // Elementos del modal de confirmación
    const confirmElements = {
        title: document.getElementById('confirm-title'),
        message: document.getElementById('confirm-message'),
        button: document.getElementById('confirm-action-btn'),
        modal: document.getElementById('confirm-modal')
    };
    
    if (!confirmElements.modal) {
        // Si no hay modal, eliminar directamente
        deleteRecluta(recluta.id);
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
            deleteRecluta(recluta.id);
            closeConfirmModal();
        };
    }
    
    // Mostrar modal
    confirmElements.modal.style.display = 'block';
}

// Eliminar recluta
function deleteRecluta(id) {
    if (!id) {
        showNotification('ID de recluta no válido', 'error');
        return;
    }
    
    fetch(`/api/reclutas/${id}`, { method: 'DELETE' })
        .then(response => {
            if (!response.ok) throw new Error('Error al eliminar recluta');
            return response.json();
        })
        .then(() => {
            // Eliminar de la lista local
            const index = reclutas.findIndex(r => r.id === id);
            if (index !== -1) {
                reclutas.splice(index, 1);
            }
            
            // Refrescar lista
            displayReclutas(reclutas);
            
            // Cerrar modal de detalles si está abierto
            if (currentReclutaId === id) {
                closeViewReclutaModal();
            }
            
            // Recargar estadísticas
            loadEstadisticas();
            
            // Mostrar notificación
            showNotification('Recluta eliminado correctamente', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al eliminar recluta: ' + error.message, 'error');
        });
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

// Programar entrevista
function programarEntrevista() {
    if (!currentReclutaId) {
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
    
    // Determinar la URL de la foto
    const fotoUrl = recluta.foto_url ? 
        (recluta.foto_url.startsWith('http') ? 
            recluta.foto_url : 
            (recluta.foto_url === 'default_profile.jpg' ? 
                "/api/placeholder/40/40" : 
                `/${recluta.foto_url}`)) : 
        "/api/placeholder/40/40";
    
    // Configurar datos del candidato en el modal
    if (interviewElements.candidatePic) interviewElements.candidatePic.src = fotoUrl;
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

//Sección de fecha y hora
function updateCalendarEvents(event) {
    if (!event) return;
    
    // Actualizar la interfaz para mostrar la sección de calendario
    if (document.querySelector('.dashboard-nav')) {
        // Cambiar a la pestaña de calendario
        document.querySelectorAll('.dashboard-nav li').forEach(li => {
            li.classList.remove('active');
        });
        const calendarTab = document.querySelector('.dashboard-nav li a[data-section="calendario-section"]');
        if (calendarTab) {
            calendarTab.parentElement.classList.add('active');
        }
        
        // Cambiar la sección visible
        document.querySelectorAll('.dashboard-content-section').forEach(section => {
            section.classList.remove('active');
        });
        const calendarSection = document.getElementById('calendario-section');
        if (calendarSection) {
            calendarSection.classList.add('active');
        }
    }
    
    // Formatear la fecha para mostrarla en el calendario
    const eventDate = new Date(event.date);
    const day = eventDate.getDate();
    const month = eventDate.getMonth();
    const year = eventDate.getFullYear();
    
    // Asegurarse de que estamos mostrando el mes correcto
    const currentMonthElement = document.getElementById('current-month');
    if (currentMonthElement) {
        // Obtener el mes actual mostrado
        const currentMonthText = currentMonthElement.textContent;
        const currentMonthParts = currentMonthText.split(' ');
        
        if (currentMonthParts.length === 2) {
            const currentMonthName = currentMonthParts[0];
            const currentYear = parseInt(currentMonthParts[1], 10);
            const currentMonth = getMonthNumber(currentMonthName);
            
            // Si no estamos en el mes correcto, cambiar a ese mes
            if (month !== currentMonth || year !== currentYear) {
                currentMonthElement.textContent = `${getMonthName(month)} ${year}`;
                generateCalendarDays(year, month);
            }
        }
    }
    
    // Buscar o regenerar los días del calendario
    setTimeout(() => {
        const calendarDays = document.querySelectorAll('.calendar-day');
        if (!calendarDays || calendarDays.length === 0) {
            generateCalendarDays(year, month);
        }
        
        // Obtener info del día 1 del mes para calcular offset
        const firstDay = new Date(year, month, 1);
        const startDayOfWeek = firstDay.getDay(); // 0 = Domingo
        
        // Calcular la posición del día en la cuadrícula
        const dayPosition = startDayOfWeek + day - 1;
        
        // Obtener todos los días de nuevo por si se regeneró el calendario
        const updatedCalendarDays = document.querySelectorAll('.calendar-day');
        
        // Si la posición está fuera de los límites, no hacemos nada
        if (dayPosition < 0 || dayPosition >= updatedCalendarDays.length) return;
        
        // Obtener la celda del día correspondiente
        const dayCell = updatedCalendarDays[dayPosition];
        if (!dayCell) return;
        
        // Crear un elemento para el evento
        const eventElement = document.createElement('div');
        eventElement.className = 'calendar-event';
        eventElement.textContent = `${event.time} - ${event.candidateName}`;
        eventElement.dataset.eventId = event.id || Date.now(); // Usamos el ID si existe, o creamos uno nuevo
        eventElement.dataset.eventData = JSON.stringify(event);
        
        // Añadir evento al hacer clic para editar/eliminar
        eventElement.addEventListener('click', function(e) {
            e.stopPropagation();
            showEventOptions(this);
        });
        
        // Añadir el evento al día
        dayCell.appendChild(eventElement);
        
        // También añadimos a la lista de próximas entrevistas
        addToUpcomingEvents(event);
    }, 100); // Pequeño retraso para asegurar que el DOM está actualizado
}

// Función para verificar solapamientos de horarios
function checkTimeOverlap(newEvent, callback) {
    // Obtener todos los eventos del mismo día
    const eventsOnSameDay = getEventsForDate(newEvent.date);
    
    // Si no hay eventos ese día, no hay solapamiento
    if (eventsOnSameDay.length === 0) {
        callback(false);
        return;
    }
    
    // Convertir la hora del nuevo evento a minutos para comparar
    const newStartTime = convertTimeToMinutes(newEvent.time);
    const newDuration = parseInt(newEvent.duration, 10) || 60;
    const newEndTime = newStartTime + newDuration;
    
    // Comprobar cada evento existente
    for (const event of eventsOnSameDay) {
        const eventStartTime = convertTimeToMinutes(event.time);
        const eventDuration = parseInt(event.duration, 10) || 60;
        const eventEndTime = eventStartTime + eventDuration;
        
        // Comprobar si hay solapamiento
        if ((newStartTime >= eventStartTime && newStartTime < eventEndTime) ||
            (newEndTime > eventStartTime && newEndTime <= eventEndTime) ||
            (newStartTime <= eventStartTime && newEndTime >= eventEndTime)) {
            
            // Hay solapamiento, devolver el evento conflictivo
            callback(true, event);
            return;
        }
    }
    
    // No hay solapamiento
    callback(false);
}

// Función auxiliar para convertir tiempo (HH:MM) a minutos
function convertTimeToMinutes(timeString) {
    if (!timeString || !timeString.includes(':')) return 0;
    
    const parts = timeString.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// Función para obtener todos los eventos para una fecha específica
function getEventsForDate(dateString) {
    const events = [];
    const targetDate = new Date(dateString);
    const day = targetDate.getDate();
    const month = targetDate.getMonth();
    const year = targetDate.getFullYear();
    
    // Obtener eventos almacenados en localStorage
    const savedEvents = localStorage.getItem('calendarEvents');
    if (savedEvents) {
        try {
            const allEvents = JSON.parse(savedEvents);
            
            // Filtrar por fecha
            return allEvents.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.getDate() === day && 
                       eventDate.getMonth() === month && 
                       eventDate.getFullYear() === year;
            });
        } catch (error) {
            console.error('Error al obtener eventos:', error);
        }
    }
    
    return events;
}

// Función para mostrar opciones al hacer clic en un evento
function showEventOptions(eventElement) {
    // Obtener datos del evento
    let eventData;
    try {
        eventData = JSON.parse(eventElement.dataset.eventData);
    } catch (error) {
        console.error('Error al obtener datos del evento:', error);
        return;
    }
    
    // Crear un menú de opciones
    const optionsMenu = document.createElement('div');
    optionsMenu.className = 'event-options-menu';
    optionsMenu.style.position = 'absolute';
    optionsMenu.style.zIndex = '1000';
    optionsMenu.style.backgroundColor = 'white';
    optionsMenu.style.border = '1px solid var(--border-color)';
    optionsMenu.style.borderRadius = 'var(--border-radius)';
    optionsMenu.style.padding = '5px';
    optionsMenu.style.boxShadow = 'var(--shadow-md)';
    
    // Calcular posición
    const rect = eventElement.getBoundingClientRect();
    optionsMenu.style.left = `${rect.left}px`;
    optionsMenu.style.top = `${rect.bottom + 5}px`;
    
    // Añadir opciones
    optionsMenu.innerHTML = `
        <div class="event-option" data-action="view">
            <i class="fas fa-eye"></i> Ver detalles
        </div>
        <div class="event-option" data-action="edit">
            <i class="fas fa-edit"></i> Editar entrevista
        </div>
        <div class="event-option" data-action="delete">
            <i class="fas fa-trash-alt"></i> Eliminar entrevista
        </div>
    `;
    
    // Estilos para las opciones
    const optionElements = optionsMenu.querySelectorAll('.event-option');
    optionElements.forEach(option => {
        option.style.padding = '8px 12px';
        option.style.cursor = 'pointer';
        option.style.display = 'flex';
        option.style.alignItems = 'center';
        option.style.gap = '5px';
        
        option.addEventListener('mouseover', function() {
            this.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
        });
        
        option.addEventListener('mouseout', function() {
            this.style.backgroundColor = 'transparent';
        });
        
        // Añadir funcionalidad a cada opción
        option.addEventListener('click', function() {
            const action = this.dataset.action;
            
            if (action === 'view') {
                viewEventDetails(eventData);
            } else if (action === 'edit') {
                editEvent(eventData, eventElement);
            } else if (action === 'delete') {
                deleteEvent(eventData, eventElement);
            }
            
            // Cerrar menú
            document.body.removeChild(optionsMenu);
        });
    });
    
    // Añadir al DOM
    document.body.appendChild(optionsMenu);
    
    // Cerrar menú al hacer clic fuera
    function closeMenu(e) {
        if (!optionsMenu.contains(e.target) && e.target !== eventElement) {
            document.body.removeChild(optionsMenu);
            document.removeEventListener('click', closeMenu);
        }
    }
    
    // Retrasar para evitar que el clic actual lo cierre automáticamente
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
}

// Función para ver detalles de un evento
function viewEventDetails(eventData) {
    // Crear modal para mostrar detalles
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Detalles de la Entrevista</h3>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-user"></i> Candidato:</div>
                    <div class="detail-value">${eventData.candidateName}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-calendar"></i> Fecha:</div>
                    <div class="detail-value">${formatDate(eventData.date)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-clock"></i> Hora:</div>
                    <div class="detail-value">${eventData.time}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-hourglass-half"></i> Duración:</div>
                    <div class="detail-value">${eventData.duration || 60} minutos</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-video"></i> Tipo:</div>
                    <div class="detail-value">${eventData.type || 'Presencial'}</div>
                </div>
                ${eventData.location ? `
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-map-marker-alt"></i> Ubicación:</div>
                    <div class="detail-value">${eventData.location}</div>
                </div>
                ` : ''}
                ${eventData.notes ? `
                <div class="detail-row">
                    <div class="detail-label"><i class="fas fa-sticky-note"></i> Notas:</div>
                    <div class="detail-value">${eventData.notes}</div>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn-secondary close-btn">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    `;
    
    // Añadir al DOM
    document.body.appendChild(modal);
    
    // Cerrar modal
    const closeButton = modal.querySelector('.close-modal');
    const cancelButton = modal.querySelector('.close-btn');
    
    closeButton.addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    cancelButton.addEventListener('click', function() {
        document.body.removeChild(modal);
    });
}

// Función para editar un evento
function editEvent(eventData, eventElement) {
    // Aquí reutilizamos el modal de programar entrevista
    const modal = document.getElementById('schedule-interview-modal');
    if (!modal) {
        showNotification('No se puede mostrar el formulario de edición', 'error');
        return;
    }
    
    // Elementos del formulario
    const interviewElements = {
        dateInput: document.getElementById('interview-date'),
        timeInput: document.getElementById('interview-time'),
        durationSelect: document.getElementById('interview-duration'),
        typeSelect: document.getElementById('interview-type'),
        locationInput: document.getElementById('interview-location'),
        notesTextarea: document.getElementById('interview-notes'),
        sendInvitation: document.getElementById('send-invitation'),
        candidateName: document.getElementById('interview-candidate-name'),
        candidatePic: document.getElementById('interview-candidate-pic'),
        candidatePuesto: document.getElementById('interview-candidate-puesto'),
        title: modal.querySelector('.modal-header h3'),
        saveButton: modal.querySelector('.modal-footer .btn-primary')
    };
    
    // Cambiar título del modal
    if (interviewElements.title) {
        interviewElements.title.textContent = 'Editar Entrevista';
    }
    
    // Rellenar el formulario con los datos existentes
    if (interviewElements.dateInput) interviewElements.dateInput.value = eventData.date;
    if (interviewElements.timeInput) interviewElements.timeInput.value = eventData.time;
    if (interviewElements.durationSelect) interviewElements.durationSelect.value = eventData.duration || '60';
    if (interviewElements.typeSelect) interviewElements.typeSelect.value = eventData.type || 'presencial';
    if (interviewElements.locationInput) interviewElements.locationInput.value = eventData.location || '';
    if (interviewElements.notesTextarea) interviewElements.notesTextarea.value = eventData.notes || '';
    if (interviewElements.sendInvitation) interviewElements.sendInvitation.checked = eventData.sendInvitation || false;
    
    // Información del candidato
    if (interviewElements.candidateName) interviewElements.candidateName.textContent = eventData.candidateName;
    if (interviewElements.candidatePic) interviewElements.candidatePic.src = '/api/placeholder/40/40';
    if (interviewElements.candidatePuesto) interviewElements.candidatePuesto.textContent = 'Edición de entrevista';
    
    // Cambiar función del botón de guardar
    if (interviewElements.saveButton) {
        interviewElements.saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        interviewElements.saveButton.onclick = function() {
            updateEvent(eventData, eventElement);
        };
    }
    
    // Mostrar modal
    modal.style.display = 'block';
}

// Función para actualizar un evento
function updateEvent(originalEventData, eventElement) {
    const interviewElements = {
        dateInput: document.getElementById('interview-date'),
        timeInput: document.getElementById('interview-time'),
        durationSelect: document.getElementById('interview-duration'),
        typeSelect: document.getElementById('interview-type'),
        locationInput: document.getElementById('interview-location'),
        notesTextarea: document.getElementById('interview-notes'),
        sendInvitation: document.getElementById('send-invitation'),
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
    
    // Crear objeto con nuevos datos
    const updatedEventData = {
        ...originalEventData,
        date: date,
        time: time,
        duration: interviewElements.durationSelect ? interviewElements.durationSelect.value : '60',
        type: interviewElements.typeSelect ? interviewElements.typeSelect.value : 'presencial',
        location: interviewElements.locationInput ? interviewElements.locationInput.value : '',
        notes: interviewElements.notesTextarea ? interviewElements.notesTextarea.value : '',
        sendInvitation: interviewElements.sendInvitation ? interviewElements.sendInvitation.checked : false
    };
    
    // Verificar solapamientos si cambia la fecha o la hora
    if (date !== originalEventData.date || time !== originalEventData.time) {
        checkTimeOverlap(updatedEventData, (hasOverlap, conflictEvent) => {
            if (hasOverlap) {
                showNotification(`No se puede actualizar: La entrevista se solapa con "${conflictEvent.candidateName}" a las ${conflictEvent.time}`, 'error');
                
                if (interviewElements.saveButton) {
                    interviewElements.saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
                    interviewElements.saveButton.disabled = false;
                }
                return;
            }
            
            // No hay solapamiento, actualizar
            completeEventUpdate(updatedEventData, eventElement);
        });
    } else {
        // Si no cambia fecha ni hora, actualizar directamente
        completeEventUpdate(updatedEventData, eventElement);
    }
}

// Función auxiliar para completar la actualización
function completeEventUpdate(updatedEventData, eventElement) {
    // Eliminar el evento antiguo del DOM
    if (eventElement && eventElement.parentNode) {
        eventElement.parentNode.removeChild(eventElement);
    }
    
    // Simular tiempo de guardado
    setTimeout(() => {
        // Actualizar evento en el calendario
        updateCalendarEvents(updatedEventData);
        
        // Actualizar almacenamiento local de eventos
        updateStoredEvent(updatedEventData);
        
        // Cerrar modal
        closeScheduleModal();
        
        // Mostrar notificación
        showNotification('Entrevista actualizada correctamente', 'success');
        
        // Restaurar botón
        const saveButton = document.querySelector('#schedule-interview-modal .btn-primary');
        if (saveButton) {
            saveButton.innerHTML = '<i class="fas fa-calendar-check"></i> Programar';
            saveButton.disabled = false;
            
            // Restaurar comportamiento por defecto
            saveButton.onclick = saveInterview;
        }
    }, 800);
}

// Función para eliminar un evento
function deleteEvent(eventData, eventElement) {
    // Preguntar confirmación
    const confirmModal = document.getElementById('confirm-modal');
    if (!confirmModal) {
        // Si no hay modal de confirmación, eliminar directamente
        completeEventDeletion(eventData, eventElement);
        return;
    }
    
    // Elementos del modal
    const confirmElements = {
        title: document.getElementById('confirm-title'),
        message: document.getElementById('confirm-message'),
        confirmButton: document.getElementById('confirm-action-btn')
    };
    
    // Configurar modal
    if (confirmElements.title) confirmElements.title.textContent = 'Eliminar Entrevista';
    if (confirmElements.message) {
        confirmElements.message.textContent = `¿Estás seguro de que deseas eliminar la entrevista con ${eventData.candidateName}?`;
    }
    
    // Configurar botón de confirmación
    if (confirmElements.confirmButton) {
        confirmElements.confirmButton.innerHTML = '<i class="fas fa-trash-alt"></i> Eliminar';
        confirmElements.confirmButton.onclick = function() {
            completeEventDeletion(eventData, eventElement);
            closeConfirmModal();
        };
    }
    
    // Mostrar modal
    confirmModal.style.display = 'block';
}

// Función auxiliar para completar la eliminación
function completeEventDeletion(eventData, eventElement) {
    // Eliminar del DOM
    if (eventElement && eventElement.parentNode) {
        eventElement.parentNode.removeChild(eventElement);
    }
    
    // Eliminar de la lista de próximas entrevistas
    removeFromUpcomingEvents(eventData);
    
    // Eliminar del almacenamiento
    removeStoredEvent(eventData);
    
    // Mostrar notificación
    showNotification('Entrevista eliminada correctamente', 'success');
}

// Función para eliminar un evento de la lista de próximos
function removeFromUpcomingEvents(eventData) {
    const upcomingEvents = document.querySelectorAll('.upcoming-events .event-item');
    if (!upcomingEvents) return;
    
    const eventDate = new Date(eventData.date);
    const day = eventDate.getDate();
    const month = eventDate.getMonth();
    
    // Buscar el evento en la lista
    upcomingEvents.forEach(item => {
        const eventDay = item.querySelector('.event-day');
        const eventMonth = item.querySelector('.event-month');
        const eventTitle = item.querySelector('h6');
        
        if (eventDay && eventMonth && eventTitle) {
            // Comprobar si coincide
            if (parseInt(eventDay.textContent) === day && 
                eventTitle.textContent.includes(eventData.candidateName)) {
                // Eliminar
                if (item.parentNode) {
                    item.parentNode.removeChild(item);
                }
            }
        }
    });
}

// Funciones para gestionar el almacenamiento de eventos
function updateStoredEvent(eventData) {
    try {
        // Obtener eventos guardados
        let events = [];
        const savedEvents = localStorage.getItem('calendarEvents');
        
        if (savedEvents) {
            events = JSON.parse(savedEvents);
            
            // Buscar si ya existe este evento
            const index = events.findIndex(event => 
                event.id === eventData.id || 
                (event.candidateId === eventData.candidateId && 
                 event.date === eventData.date && 
                 event.time === eventData.time)
            );
            
            if (index !== -1) {
                // Actualizar evento existente
                events[index] = eventData;
            } else {
                // Añadir nuevo evento
                eventData.id = eventData.id || Date.now();
                events.push(eventData);
            }
        } else {
            // Primera vez, crear array con este evento
            eventData.id = eventData.id || Date.now();
            events = [eventData];
        }
        
        // Guardar en localStorage
        localStorage.setItem('calendarEvents', JSON.stringify(events));
    } catch (error) {
        console.error('Error al guardar evento:', error);
    }
}

function removeStoredEvent(eventData) {
    try {
        // Obtener eventos guardados
        const savedEvents = localStorage.getItem('calendarEvents');
        if (!savedEvents) return;
        
        let events = JSON.parse(savedEvents);
        
        // Filtrar para eliminar este evento
        events = events.filter(event => 
            event.id !== eventData.id && 
            !(event.candidateId === eventData.candidateId && 
              event.date === eventData.date && 
              event.time === eventData.time)
        );
        
        // Guardar lista actualizada
        localStorage.setItem('calendarEvents', JSON.stringify(events));
    } catch (error) {
        console.error('Error al eliminar evento:', error);
    }
}

// Función auxiliar para añadir un evento a la lista de próximas entrevistas
function addToUpcomingEvents(event) {
    const upcomingEventsContainer = document.querySelector('.upcoming-events');
    if (!upcomingEventsContainer) return;
    
    // Crear elemento de evento
    const eventItem = document.createElement('div');
    eventItem.className = 'event-item';
    
    // Formatear fecha
    const eventDate = new Date(event.date);
    const day = eventDate.getDate();
    const monthName = getMonthName(eventDate.getMonth()).substring(0, 3).toUpperCase();
    
    // Formatear hora
    const time = event.time;
    let displayTime;
    if (time.includes(':')) {
        const timeParts = time.split(':');
        const hours = parseInt(timeParts[0], 10);
        const minutes = timeParts[1];
        
        let endHours = hours;
        if (event.duration) {
            const durationMinutes = parseInt(event.duration, 10);
            const totalMinutes = (hours * 60 + parseInt(minutes, 10)) + durationMinutes;
            endHours = Math.floor(totalMinutes / 60);
            const endMinutes = totalMinutes % 60;
            displayTime = `${hours}:${minutes} - ${endHours}:${endMinutes.toString().padStart(2, '0')}`;
        } else {
            displayTime = `${hours}:${minutes}`;
        }
    } else {
        displayTime = time;
    }
    
    // Estructura HTML del evento
    eventItem.innerHTML = `
        <div class="event-date">
            <span class="event-day">${day}</span>
            <span class="event-month">${monthName}</span>
        </div>
        <div class="event-details">
            <h6>Entrevista con ${event.candidateName}</h6>
            <p><i class="fas fa-clock"></i> ${displayTime}</p>
        </div>
    `;
    
    // Añadir el nuevo evento al principio de la lista
    const firstChild = upcomingEventsContainer.querySelector('.event-item');
    if (firstChild) {
        upcomingEventsContainer.insertBefore(eventItem, firstChild);
    } else {
        upcomingEventsContainer.appendChild(eventItem);
    }
}

// Guardar entrevista
function saveInterview() {
    const interviewElements = {
        dateInput: document.getElementById('interview-date'),
        timeInput: document.getElementById('interview-time'),
        durationSelect: document.getElementById('interview-duration'),
        typeSelect: document.getElementById('interview-type'),
        locationInput: document.getElementById('interview-location'),
        notesTextarea: document.getElementById('interview-notes'),
        sendInvitation: document.getElementById('send-invitation'),
        candidateName: document.getElementById('interview-candidate-name'),
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
        // Obtener datos para el evento
        const eventData = {
            id: Date.now(), // ID único para el evento
            date: date,
            time: time,
            duration: interviewElements.durationSelect ? interviewElements.durationSelect.value : '60',
            type: interviewElements.typeSelect ? interviewElements.typeSelect.value : 'presencial',
            location: interviewElements.locationInput ? interviewElements.locationInput.value : '',
            notes: interviewElements.notesTextarea ? interviewElements.notesTextarea.value : '',
            sendInvitation: interviewElements.sendInvitation ? interviewElements.sendInvitation.checked : false,
            candidateName: interviewElements.candidateName ? interviewElements.candidateName.textContent : 'Candidato',
            candidateId: currentReclutaId
        };
        
        // Verificar solapamientos
        checkTimeOverlap(eventData, (hasOverlap, conflictEvent) => {
            if (hasOverlap) {
                showNotification(`No se puede programar: La entrevista se solapa con "${conflictEvent.candidateName}" a las ${conflictEvent.time}`, 'error');
                
                if (interviewElements.saveButton) {
                    interviewElements.saveButton.innerHTML = '<i class="fas fa-calendar-check"></i> Programar';
                    interviewElements.saveButton.disabled = false;
                }
                return;
            }
            
            // No hay solapamiento, continuar con el guardado
            setTimeout(() => {
                // Actualizar el calendario con el nuevo evento
                updateCalendarEvents(eventData);
                
                // Guardar en almacenamiento
                updateStoredEvent(eventData);
                
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
        });
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
    
    // Enviar petición al backend
    fetch('/api/cambiar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Contraseña actual incorrecta');
        return response.json();
    })
    .then(data => {
        // Limpiar campos
        passwordElements.currentPassword.value = '';
        passwordElements.newPassword.value = '';
        passwordElements.confirmPassword.value = '';
        
        // Mostrar notificación
        showNotification('Contraseña cambiada correctamente', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error al cambiar la contraseña: ' + error.message, 'error');
    })
    .finally(() => {
        // Restaurar botón
        if (passwordElements.button) {
            passwordElements.button.innerHTML = '<i class="fas fa-key"></i> Cambiar Contraseña';
            passwordElements.button.disabled = false;
        }
    });
}

// Actualizar datos de perfil
function updateProfile() {
    const profileElements = {
        nombre: document.getElementById('user-name'),
        telefono: document.getElementById('user-phone'),
        button: document.querySelector('.config-section button')
    };
    
    if (!profileElements.nombre) {
        showNotification('Error al obtener campos del formulario', 'error');
        return;
    }
    
    const nombre = profileElements.nombre.value;
    const telefono = profileElements.telefono ? profileElements.telefono.value : '';
    
    // Mostrar estado de carga
    if (profileElements.button) {
        profileElements.button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        profileElements.button.disabled = true;
    }
    
    // Determinar si es FormData (con imagen) o JSON
    let requestOptions;
    if (profileImage) {
        const formData = new FormData();
        formData.append('nombre', nombre);
        formData.append('telefono', telefono);
        formData.append('foto', profileImage);
        
        requestOptions = {
            method: 'PUT',
            body: formData
        };
    } else {
        requestOptions = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, telefono })
        };
    }
    
    // Enviar petición al backend
    fetch('/api/perfil', requestOptions)
        .then(response => {
            if (!response.ok) throw new Error('Error al actualizar perfil');
            return response.json();
        })
        .then(data => {
            // Actualizar datos del usuario actual
            currentGerente = data.usuario;
            
            // Actualizar UI
            document.getElementById('gerente-name').textContent = currentGerente.nombre || currentGerente.email;
            document.getElementById('dropdown-user-name').textContent = currentGerente.nombre || currentGerente.email;
            
            // Mostrar notificación
            showNotification('Perfil actualizado correctamente', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al actualizar perfil: ' + error.message, 'error');
        })
        .finally(() => {
            // Restaurar botón
            if (profileElements.button) {
                profileElements.button.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
                profileElements.button.disabled = false;
            }
        });
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
        
        // Mostrar notificación
        showNotification('Foto de perfil actualizada. No olvides guardar los cambios.', 'info');
        
        // Agregar botón de guardar si no existe
        const configSection = document.querySelector('.config-section:first-child');
        if (configSection && !document.getElementById('save-profile-btn')) {
            const saveButton = document.createElement('button');
            saveButton.id = 'save-profile-btn';
            saveButton.className = 'btn-primary';
            saveButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            saveButton.onclick = updateProfile;
            configSection.appendChild(saveButton);
        }
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
    
    // Si es la sección de estadísticas, recargar datos
    if (targetSection === 'estadisticas-section') {
        loadEstadisticas();
    }
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
        totalPages: document.getElementById('total-pages'),
        currentPage: document.querySelector('.current-page')
    };
    
    if (!paginationElements.totalPages || !paginationElements.currentPage) return;
    
    const totalPages = Math.ceil(totalItems / 10) || 1;
    paginationElements.totalPages.textContent = totalPages;
    paginationElements.currentPage.textContent = '1'; // Por ahora siempre en página 1
    
    // Habilitar/deshabilitar botones si existen
    if (paginationElements.prevBtn) paginationElements.prevBtn.disabled = true;
    if (paginationElements.nextBtn) paginationElements.nextBtn.disabled = (totalPages <= 1);
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
    
    // Determinar la URL de la foto
    const fotoUrl = recluta.foto_url ? 
        (recluta.foto_url.startsWith('http') ? 
            recluta.foto_url : 
            (recluta.foto_url === 'default_profile.jpg' ? 
                "/api/placeholder/100/100" : 
                `/${recluta.foto_url}`)) : 
        "/api/placeholder/100/100";
    
    // Actualizar los elementos que existan
    if (detailsElements.nombre) detailsElements.nombre.textContent = recluta.nombre;
    if (detailsElements.puesto) detailsElements.puesto.textContent = recluta.puesto || 'No especificado';
    if (detailsElements.email) detailsElements.email.textContent = recluta.email;
    if (detailsElements.telefono) detailsElements.telefono.textContent = recluta.telefono;
    if (detailsElements.notas) detailsElements.notas.textContent = recluta.notas || 'Sin notas';
    if (detailsElements.fecha) detailsElements.fecha.textContent = formatDate(recluta.fecha_registro);
    if (detailsElements.pic) detailsElements.pic.src = fotoUrl;
    
    // Actualizar estado
    if (detailsElements.estado) {
        detailsElements.estado.textContent = recluta.estado;
        detailsElements.estado.className = `badge badge-${recluta.estado === 'Activo' ? 'success' : (recluta.estado === 'Rechazado' ? 'danger' : 'warning')}`;
    }
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
    
    // Cargar eventos guardados
    loadSavedEvents(currentYear, currentMonth);
}

// Función para cargar eventos guardados (continuación)
function loadSavedEvents(year, month) {
    try {
        const savedEvents = localStorage.getItem('calendarEvents');
        if (!savedEvents) return;
        
        const events = JSON.parse(savedEvents);
        
        // Filtrar eventos del mes actual
        const currentMonthEvents = events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate.getMonth() === month && eventDate.getFullYear() === year;
        });
        
        // Mostrar cada evento en el calendario
        currentMonthEvents.forEach(event => {
            // Pequeño retraso para asegurar que el calendario está renderizado
            setTimeout(() => {
                updateCalendarEvents(event);
            }, 200);
        });
        
        // Actualizar la lista de próximas entrevistas
        updateUpcomingEventsList();
    } catch (error) {
        console.error('Error al cargar eventos guardados:', error);
    }
}

// Función para actualizar la lista de próximas entrevistas
function updateUpcomingEventsList() {
    const upcomingEventsContainer = document.querySelector('.upcoming-events');
    if (!upcomingEventsContainer) return;
    
    // Limpiar eventos anteriores (excepto el título)
    const title = upcomingEventsContainer.querySelector('h5');
    if (title) {
        upcomingEventsContainer.innerHTML = '';
        upcomingEventsContainer.appendChild(title);
    } else {
        upcomingEventsContainer.innerHTML = '<h5>Próximas Entrevistas</h5>';
    }
    
    try {
        // Obtener eventos guardados
        const savedEvents = localStorage.getItem('calendarEvents');
        if (!savedEvents) return;
        
        const events = JSON.parse(savedEvents);
        
        // Filtrar eventos futuros y ordenar por fecha
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const futureEvents = events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today;
        }).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA - dateB;
            }
            
            // Si son el mismo día, ordenar por hora
            return convertTimeToMinutes(a.time) - convertTimeToMinutes(b.time);
        });
        
        // Mostrar los próximos 5 eventos
        const eventsToShow = futureEvents.slice(0, 5);
        
        // Si no hay eventos futuros
        if (eventsToShow.length === 0) {
            const noEvents = document.createElement('p');
            noEvents.style.textAlign = 'center';
            noEvents.style.color = 'var(--text-light)';
            noEvents.style.padding = '15px 0';
            noEvents.innerHTML = 'No hay entrevistas programadas <i class="far fa-calendar-times"></i>';
            upcomingEventsContainer.appendChild(noEvents);
            return;
        }
        
        // Añadir cada evento a la lista
        eventsToShow.forEach(event => {
            addToUpcomingEvents(event);
        });
    } catch (error) {
        console.error('Error al actualizar lista de próximas entrevistas:', error);
    }
}

// Añadir esta función para cargar eventos de muestra
function loadSampleEvents() {
    // Eventos de muestra para el calendario (puedes eliminar esto en producción)
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Evento para hoy
    calendarEvents.push({
        id: 1,
        title: 'Entrevista: Ana García',
        date: new Date(year, month, 5, 10, 0),
        time: '10:00',
        duration: 60,
        type: 'presencial',
        location: 'Sala de reuniones 1',
        notes: 'Preparar preguntas técnicas',
        reclutaId: 1  // ID de Ana García en la muestra
    });
    
    // Evento para 3 días después
    calendarEvents.push({
        id: 2,
        title: 'Entrevista: Carlos López',
        date: new Date(year, month, 8, 14, 30),
        time: '14:30',
        duration: 60,
        type: 'virtual',
        location: 'https://meet.google.com/abc-defg-hij',
        notes: 'Revisar portfolio de diseño',
        reclutaId: 2  // ID de Carlos López en la muestra
    });
    
    // Evento para una semana después
    calendarEvents.push({
        id: 3,
        title: 'Reunión de equipo',
        date: new Date(year, month, 15, 9, 0),
        time: '09:00',
        duration: 90,
        type: 'presencial',
        location: 'Sala de conferencias',
        notes: 'Discutir progreso del reclutamiento',
        reclutaId: null  // No está asociado a un recluta
    });
    
    // Actualizar la vista del calendario con los eventos
    updateCalendarEvents();
}

//Nueva Entrevista
function initAddEventButtonListener() {
    const addEventButton = document.getElementById('add-event-button');
    if (addEventButton) {
        addEventButton.addEventListener('click', () => {
            // Abrir el modal con la fecha actual
            openNewEventModal(new Date());
        });
    }
}

// Añadir esta llamada al final de initEventListeners()
initAddEventButtonListener();

//Entrevistas Sidebar
function updateUpcomingEvents() {
    const upcomingEventsContainer = document.querySelector('.upcoming-events');
    if (!upcomingEventsContainer) return;
    
    // Encontrar el encabezado h5
    const header = upcomingEventsContainer.querySelector('h5');
    
    // Limpiar los eventos actuales pero conservar el encabezado
    upcomingEventsContainer.innerHTML = '';
    if (header) {
        upcomingEventsContainer.appendChild(header);
    } else {
        const newHeader = document.createElement('h5');
        newHeader.textContent = 'Próximas Entrevistas';
        upcomingEventsContainer.appendChild(newHeader);
    }
    
    // Ordenar eventos por fecha
    const sortedEvents = [...calendarEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Filtrar los eventos futuros (a partir de hoy)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureEvents = sortedEvents.filter(event => new Date(event.date) >= today);
    
    // Mostrar máximo 5 próximos eventos
    const eventsToShow = futureEvents.slice(0, 5);
    
    if (eventsToShow.length === 0) {
        const noEventsMsg = document.createElement('p');
        noEventsMsg.textContent = 'No hay próximas entrevistas programadas';
        noEventsMsg.style.textAlign = 'center';
        noEventsMsg.style.color = 'var(--text-light)';
        noEventsMsg.style.padding = '10px 0';
        upcomingEventsContainer.appendChild(noEventsMsg);
    } else {
        eventsToShow.forEach(event => {
            const eventDate = new Date(event.date);
            const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
            
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            eventItem.dataset.eventId = event.id;
            
            eventItem.innerHTML = `
                <div class="event-date">
                    <span class="event-day">${eventDate.getDate()}</span>
                    <span class="event-month">${monthNames[eventDate.getMonth()]}</span>
                </div>
                <div class="event-details">
                    <h6>${event.title}</h6>
                    <p><i class="fas fa-clock"></i> ${event.time} (${event.duration} min)</p>
                </div>
            `;
            
            // Añadir evento de clic para ver detalles
            eventItem.addEventListener('click', () => {
                showEventDetails(event.id);
            });
            
            upcomingEventsContainer.appendChild(eventItem);
        });
    }
}

//Modal Entrevista Calendario
function openNewEventModal(date) {
    const interviewModal = document.getElementById('schedule-interview-modal');
    if (!interviewModal) return;
    
    // Limpiar el formulario
    const dateInput = document.getElementById('interview-date');
    const timeInput = document.getElementById('interview-time');
    
    if (dateInput) {
        dateInput.value = date.toISOString().split('T')[0];
    }
    
    if (timeInput) {
        // Establecer una hora predeterminada (10:00 AM)
        timeInput.value = '10:00';
    }
    
    // Mostrar lista de reclutas para seleccionar
    showReclutaSelector();
    
    // Mostrar el modal
    interviewModal.style.display = 'block';
}

// Añadir esta función para seleccionar recluta desde el calendario
function showReclutaSelector() {
    const candidateInfoContainer = document.querySelector('.interview-candidate');
    if (!candidateInfoContainer) return;
    
    // Ocultar información del candidato seleccionado previamente
    candidateInfoContainer.style.display = 'none';
    
    // Crear selector de reclutas si no existe
    if (!document.getElementById('recluta-selector-container')) {
        const selectContainer = document.createElement('div');
        selectContainer.id = 'recluta-selector-container';
        selectContainer.style.marginBottom = '20px';
        
        const label = document.createElement('label');
        label.textContent = 'Seleccionar candidato:';
        label.style.display = 'block';
        label.style.marginBottom = '8px';
        label.style.fontWeight = '500';
        
        const select = document.createElement('select');
        select.id = 'recluta-selector';
        select.style.width = '100%';
        select.style.padding = '10px';
        select.style.borderRadius = 'var(--border-radius)';
        select.style.border = '1px solid var(--border-color)';
        
        // Añadir opciones basadas en los reclutas disponibles
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Seleccionar candidato --';
        select.appendChild(defaultOption);
        
        if (reclutas && reclutas.length > 0) {
            reclutas.forEach(recluta => {
                const option = document.createElement('option');
                option.value = recluta.id;
                option.textContent = recluta.nombre;
                select.appendChild(option);
            });
        }
        
        // Evento de cambio
        select.addEventListener('change', function() {
            const selectedReclutaId = parseInt(this.value);
            if (selectedReclutaId) {
                currentReclutaId = selectedReclutaId;
                const recluta = reclutas.find(r => r.id === selectedReclutaId);
                
                // Actualizar la información del candidato
                const candidatePic = document.getElementById('interview-candidate-pic');
                const candidateName = document.getElementById('interview-candidate-name');
                const candidatePuesto = document.getElementById('interview-candidate-puesto');
                
                if (candidatePic && recluta) candidatePic.src = recluta.foto_url || '/api/placeholder/40/40';
                if (candidateName && recluta) candidateName.textContent = recluta.nombre;
                if (candidatePuesto && recluta) candidatePuesto.textContent = recluta.puesto || 'No especificado';
                
                // Mostrar la información del candidato
                candidateInfoContainer.style.display = 'flex';
            } else {
                candidateInfoContainer.style.display = 'none';
            }
        });
        
        selectContainer.appendChild(label);
        selectContainer.appendChild(select);
        
        // Insertar antes del primer elemento del modal-body
        const modalBody = document.querySelector('#schedule-interview-modal .modal-body');
        if (modalBody) {
            modalBody.insertBefore(selectContainer, modalBody.firstChild);
        }
    }
}

//Detalles Evento
function showEventDetails(eventId) {
    const event = calendarEvents.find(e => e.id === eventId);
    if (!event) {
        showNotification('Evento no encontrado', 'error');
        return;
    }
    
    // Aquí podríamos crear un modal de detalles de evento, pero por simplicidad
    // usaremos una notificación para mostrar la información básica
    const eventDate = new Date(event.date);
    const formattedDate = `${eventDate.getDate()}/${eventDate.getMonth() + 1}/${eventDate.getFullYear()}`;
    
    let reclutaInfo = '';
    if (event.reclutaId) {
        const recluta = reclutas.find(r => r.id === event.reclutaId);
        if (recluta) {
            reclutaInfo = ` con ${recluta.nombre}`;
        }
    }
    
    const notificationMsg = `
        Entrevista${reclutaInfo}
        Fecha: ${formattedDate}
        Hora: ${event.time}
        Duración: ${event.duration} minutos
        Tipo: ${event.type}
        ${event.location ? 'Ubicación: ' + event.location : ''}
    `;
    
    showNotification(notificationMsg, 'info', 8000); // Mayor duración para leer
}

// Modificar la función showNotification para aceptar duración personalizada
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    if (!notification || !notificationMessage) return;
    
    notificationMessage.textContent = message;
    
    // Configurar tipo de notificación
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('show');
    
    // Auto-ocultar después de la duración especificada
    setTimeout(hideNotification, duration);
}

// Cargar entrevistas del mes
function loadEntrevistas(year, month) {
    fetch('/api/entrevistas')
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar entrevistas');
            return response.json();
        })
        .then(entrevistas => {
            // Filtrar entrevistas para el mes actual
            const entrevistasMes = entrevistas.filter(entrevista => {
                const fecha = new Date(entrevista.fecha);
                return fecha.getFullYear() === year && fecha.getMonth() === month;
            });
            
            // Mostrar entrevistas en el calendario
            entrevistasMes.forEach(entrevista => {
                const fecha = new Date(entrevista.fecha);
                const dia = fecha.getDate();
                
                // Buscar la celda correspondiente
                const dayCells = document.querySelectorAll('.calendar-day:not(.other-month)');
                dayCells.forEach(cell => {
                    const dayNumber = cell.querySelector('.calendar-day-number');
                    if (dayNumber && parseInt(dayNumber.textContent) === dia) {
                        // Añadir evento al día
                        const eventDiv = document.createElement('div');
                        eventDiv.className = 'calendar-event';
                        eventDiv.textContent = `Entrevista: ${entrevista.recluta_nombre}`;
                        cell.appendChild(eventDiv);
                    }
                });
            });
            
            // Mostrar próximas entrevistas en sidebar
            const upcomingEvents = document.querySelector('.upcoming-events');
            if (upcomingEvents && entrevistas.length > 0) {
                // Limpiar eventos existentes
                const eventsContainer = upcomingEvents.querySelector('h5');
                if (eventsContainer) {
                    let nextSibling = eventsContainer.nextElementSibling;
                    while (nextSibling) {
                        const toRemove = nextSibling;
                        nextSibling = nextSibling.nextElementSibling;
                        upcomingEvents.removeChild(toRemove);
                    }
                }
                
                // Ordenar entrevistas por fecha
                entrevistas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                
                // Mostrar máximo 3 entrevistas
                const now = new Date();
                const proximasEntrevistas = entrevistas
                    .filter(e => new Date(e.fecha) >= now)
                    .slice(0, 3);
                
                proximasEntrevistas.forEach(entrevista => {
                    const fecha = new Date(entrevista.fecha);
                    const eventItem = document.createElement('div');
                    eventItem.className = 'event-item';
                    eventItem.innerHTML = `
                        <div class="event-date">
                            <span class="event-day">${fecha.getDate()}</span>
                            <span class="event-month">${getMonthShortName(fecha.getMonth())}</span>
                        </div>
                        <div class="event-details">
                            <h6>Entrevista con ${entrevista.recluta_nombre}</h6>
                            <p><i class="fas fa-clock"></i> ${entrevista.hora}</p>
                        </div>
                    `;
                    upcomingEvents.appendChild(eventItem);
                });
                
                // Si no hay entrevistas futuras, mostrar mensaje
                if (proximasEntrevistas.length === 0) {
                    const noEvents = document.createElement('p');
                    noEvents.style.textAlign = 'center';
                    noEvents.style.margin = '20px 0';
                    noEvents.textContent = 'No hay entrevistas programadas';
                    upcomingEvents.appendChild(noEvents);
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
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
        dayDiv.dataset.date = prevMonthDate.toISOString().split('T')[0];
        
        // Añadir evento para agregar entrevista al hacer clic
        dayDiv.addEventListener('click', function() {
            openAddEventModal(this.dataset.date);
        });
        
        calendarGrid.appendChild(dayDiv);
    }
    
    // Días del mes actual
    const today = new Date();
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const currentDate = new Date(year, month, i);
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.dataset.date = currentDate.toISOString().split('T')[0];
        
        // Marcar el día actual
        if (today.getDate() === i && today.getMonth() === month && today.getFullYear() === year) {
            dayDiv.classList.add('today');
        }
        
        dayDiv.innerHTML = `<div class="calendar-day-number">${i}</div>`;
        
        // Añadir evento para agregar entrevista al hacer clic
        dayDiv.addEventListener('click', function() {
            openAddEventModal(this.dataset.date);
        });
        
        calendarGrid.appendChild(dayDiv);
    }
    
    // Calcular casillas restantes para completar la cuadrícula
    const totalCells = 42;
    const remainingCells = totalCells - (startDayOfWeek + lastDay.getDate());
    
    // Días del mes siguiente
    for (let i = 1; i <= remainingCells; i++) {
        const nextMonthDate = new Date(year, month + 1, i);
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day other-month';
        dayDiv.innerHTML = `<div class="calendar-day-number">${i}</div>`;
        dayDiv.dataset.date = nextMonthDate.toISOString().split('T')[0];
        
        // Añadir evento para agregar entrevista al hacer clic
        dayDiv.addEventListener('click', function() {
            openAddEventModal(this.dataset.date);
        });
        
        calendarGrid.appendChild(dayDiv);
    }
    
    // Después de generar todos los días, cargar los eventos guardados
    setTimeout(() => {
        loadSavedEvents(year, month);
    }, 100);
}

// Función para abrir modal de añadir evento directamente desde el calendario
function openAddEventModal(dateString) {
    // Si no hay reclutas, mostrar mensaje
    if (!reclutas || reclutas.length === 0) {
        showNotification('No hay reclutas disponibles para programar entrevista', 'warning');
        return;
    }
    
    // Mostrar modal para seleccionar recluta
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'select-recluta-modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Seleccionar Candidato</h3>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <p>Selecciona un candidato para programar la entrevista:</p>
                <div class="reclutas-list-container" style="max-height: 300px; overflow-y: auto; margin-top: 15px;">
                    <table id="select-recluta-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th width="60">Foto</th>
                                <th>Nombre</th>
                                <th>Estado</th>
                                <th width="80">Acción</th>
                            </tr>
                        </thead>
                        <tbody id="select-recluta-list">
                            <!-- Se llenará dinámicamente -->
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" id="cancel-select-recluta">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    `;
    
    // Añadir al DOM
    document.body.appendChild(modal);
    
    // Llenar la tabla de reclutas
    const reclutasList = document.getElementById('select-recluta-list');
    if (reclutasList) {
        reclutas.forEach(recluta => {
            const row = document.createElement('tr');
            const badgeClass = recluta.estado === 'Activo' ? 'badge-success' : 
                              (recluta.estado === 'Rechazado' ? 'badge-danger' : 'badge-warning');
            
            row.innerHTML = `
                <td><img src="${recluta.foto_url}" alt="${recluta.nombre}" class="recluta-foto"></td>
                <td>${recluta.nombre}</td>
                <td><span class="badge ${badgeClass}">${recluta.estado}</span></td>
                <td>
                    <button class="btn-primary" style="width: auto; padding: 5px 10px; font-size: 12px;" 
                            onclick="selectReclutaForInterview(${recluta.id}, '${dateString}')">
                        <i class="fas fa-calendar-plus"></i> Seleccionar
                    </button>
                </td>
            `;
            reclutasList.appendChild(row);
        });
    }
    
    // Configurar eventos para cerrar modal
    const closeButton = modal.querySelector('.close-modal');
    const cancelButton = document.getElementById('cancel-select-recluta');
    
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
    }
    
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
    }
}

// Función para seleccionar un recluta y abrir el modal de entrevista
function selectReclutaForInterview(reclutaId, dateString) {
    // Cerrar modal de selección
    const selectModal = document.getElementById('select-recluta-modal');
    if (selectModal) {
        document.body.removeChild(selectModal);
    }
    
    // Buscar el recluta seleccionado
    if (!reclutas) return;
    
    const recluta = reclutas.find(r => r.id === reclutaId);
    if (!recluta) {
        showNotification('Recluta no encontrado', 'error');
        return;
    }
    
    currentReclutaId = reclutaId;
    
    // Abrir modal de programar entrevista
    const modal = document.getElementById('schedule-interview-modal');
    if (!modal) {
        showNotification('No se puede mostrar el modal de entrevista', 'error');
        return;
    }
    
    // Configurar elementos del modal
    const interviewElements = {
        candidatePic: document.getElementById('interview-candidate-pic'),
        candidateName: document.getElementById('interview-candidate-name'),
        candidatePuesto: document.getElementById('interview-candidate-puesto'),
        dateInput: document.getElementById('interview-date'),
        timeInput: document.getElementById('interview-time')
    };
    
    // Configurar datos del candidato
    if (interviewElements.candidatePic) interviewElements.candidatePic.src = recluta.foto_url || '/api/placeholder/40/40';
    if (interviewElements.candidateName) interviewElements.candidateName.textContent = recluta.nombre;
    if (interviewElements.candidatePuesto) interviewElements.candidatePuesto.textContent = recluta.puesto || 'No especificado';
    
    // Establecer fecha seleccionada
    if (interviewElements.dateInput) interviewElements.dateInput.value = dateString;
    
    // Hora por defecto (10:00 AM)
    if (interviewElements.timeInput) interviewElements.timeInput.value = '10:00';
    
    // Mostrar modal
    modal.style.display = 'block';
}

// Helpers para calendario
function getMonthName(monthIndex) {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[monthIndex] || '';
}

function getMonthShortName(monthIndex) {
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
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
}