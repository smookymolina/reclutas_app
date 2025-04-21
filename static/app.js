// Inicialización de variables globales
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

    // Botón de login
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', login);
    }
    
    // Botón de logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
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

// Guardar entrevista
function saveInterview() {
    const interviewElements = {
        dateInput: document.getElementById('interview-date'),
        timeInput: document.getElementById('interview-time'),
        duracionSelect: document.getElementById('interview-duration'),
        tipoSelect: document.getElementById('interview-type'),
        ubicacionInput: document.getElementById('interview-location'),
        notasInput: document.getElementById('interview-notes'),
        saveButton: document.querySelector('#schedule-interview-modal .btn-primary')
    };
    
    if (!interviewElements.dateInput || !interviewElements.timeInput) {
        showNotification('Error al obtener datos del formulario', 'error');
        return;
    }
    
    if (!currentReclutaId) {
        showNotification('No se puede identificar el recluta', 'error');
        return;
    }
    
    const fecha = interviewElements.dateInput.value;
    const hora = interviewElements.timeInput.value;
    
    if (!fecha || !hora) {
        showNotification('Por favor, completa los campos de fecha y hora', 'error');
        return;
    }
    
    // Mostrar estado de carga
    if (interviewElements.saveButton) {
        interviewElements.saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        interviewElements.saveButton.disabled = true;
    }
    
    // Preparar datos para enviar
    const entrevistaData = {
        recluta_id: currentReclutaId,
        fecha: fecha,
        hora: hora,
        duracion: interviewElements.duracionSelect ? interviewElements.duracionSelect.value : 60,
        tipo: interviewElements.tipoSelect ? interviewElements.tipoSelect.value : 'presencial',
        ubicacion: interviewElements.ubicacionInput ? interviewElements.ubicacionInput.value : '',
        notas: interviewElements.notasInput ? interviewElements.notasInput.value : ''
    };
    
    // Enviar petición al backend
    fetch('/api/entrevistas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entrevistaData)
    })
    .then(response => {
        if (!response.ok) throw new Error('Error al guardar entrevista');
        return response.json();
    })
    .then(data => {
        // Cerrar modal
        closeScheduleModal();
        
        // Mostrar notificación
        showNotification('Entrevista programada correctamente', 'success');
        
        // Recargar estadísticas
        loadEstadisticas();
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error al programar la entrevista: ' + error.message, 'error');
    })
    .finally(() => {
        // Restaurar botón
        if (interviewElements.saveButton) {
            interviewElements.saveButton.innerHTML = '<i class="fas fa-calendar-check"></i> Programar';
            interviewElements.saveButton.disabled = false;
        }
    });
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
    
    // Cargar entrevistas para el mes actual
    loadEntrevistas(currentYear, currentMonth);
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
        calendarGrid.appendChild(dayDiv);
    }
    
    // Calcular casillas restantes para completar la cuadrícula
    const totalCells = 42; // 6 filas de 7 días
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
    
    // Cargar entrevistas para el nuevo mes
    loadEntrevistas(currentYear, currentMonth);
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