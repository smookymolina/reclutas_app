#!/usr/bin/env python3
"""
Sistema de Gestión de Reclutas - Herramienta de Administración
---------------------------------------------------------
Herramienta para gestionar usuarios administradores y gerentes.
Permite crear, listar, modificar y eliminar usuarios.
"""

import os
import sys
import time
import getpass
import logging
import re
from datetime import datetime
import hashlib
import secrets

# Configurar logging
LOG_FILE = "admin_activity.log"
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

try:
    from app import app
    from models import db, Usuario
except ImportError:
    print("Error: No se pueden importar los módulos necesarios.")
    print("Asegúrate de que este script esté en la misma carpeta que app.py y models.py")
    sys.exit(1)

# Colores para la terminal
class Color:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Configuración de seguridad para el script
ADMIN_PASSWORD_HASH_FILE = ".admin_hash"
MAX_LOGIN_ATTEMPTS = 3

def clear_screen():
    """Limpia la pantalla de la terminal"""
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header(text):
    """Imprime un encabezado formateado"""
    print(f"\n{Color.HEADER}{Color.BOLD}{'=' * 50}{Color.ENDC}")
    print(f"{Color.HEADER}{Color.BOLD}{text.center(50)}{Color.ENDC}")
    print(f"{Color.HEADER}{Color.BOLD}{'=' * 50}{Color.ENDC}\n")

def print_success(message):
    """Imprime un mensaje de éxito"""
    print(f"{Color.GREEN}✓ {message}{Color.ENDC}")

def print_error(message):
    """Imprime un mensaje de error"""
    print(f"{Color.RED}✗ ERROR: {message}{Color.ENDC}")

def print_warning(message):
    """Imprime un mensaje de advertencia"""
    print(f"{Color.YELLOW}⚠ {message}{Color.ENDC}")

def print_info(message):
    """Imprime un mensaje informativo"""
    print(f"{Color.BLUE}ℹ {message}{Color.ENDC}")

def validate_email(email):
    """Valida que el correo electrónico tenga un formato correcto"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Valida que la contraseña cumpla con los requisitos mínimos"""
    if len(password) < 6:
        return False, "La contraseña debe tener al menos 6 caracteres"
    
    # Puedes agregar más validaciones según tus requisitos
    return True, ""

def confirm_action(message):
    """Solicita confirmación para una acción"""
    response = input(f"{Color.YELLOW}{message} (s/n): {Color.ENDC}").lower()
    return response == 's'

def log_activity(activity, success=True, details=None):
    """Registra una actividad en el log"""
    status = "ÉXITO" if success else "FALLO"
    log_message = f"{status}: {activity}"
    if details:
        log_message += f" - {details}"
    
    logging.info(log_message)

def crear_usuario():
    """Crea un nuevo usuario administrador/gerente"""
    print_header("Crear Nuevo Usuario")
    
    # Solicitar email
    while True:
        email = input("Email del nuevo usuario: ")
        if not email:
            print_warning("El email no puede estar vacío")
            continue
            
        if not validate_email(email):
            print_error("El formato del email no es válido")
            continue
            
        # Verificar si ya existe
        with app.app_context():
            if Usuario.query.filter_by(email=email).first():
                print_error(f"Ya existe un usuario con el email {email}")
                if not confirm_action("¿Deseas intentar con otro email?"):
                    return
                continue
            break
    
    # Solicitar y confirmar contraseña
    while True:
        password = getpass.getpass("Contraseña: ")
        valid, message = validate_password(password)
        if not valid:
            print_error(message)
            continue
            
        confirm_password = getpass.getpass("Confirmar contraseña: ")
        if password != confirm_password:
            print_error("Las contraseñas no coinciden")
            continue
        break
    
    # Confirmar creación
    print("\nDatos del nuevo usuario:")
    print(f"Email: {Color.BOLD}{email}{Color.ENDC}")
    
    if not confirm_action("¿Confirmas la creación de este usuario?"):
        print_info("Operación cancelada")
        log_activity("Intento de creación de usuario cancelado", success=False, details=f"Email: {email}")
        return
    
    # Crear el usuario
    try:
        with app.app_context():
            nuevo_usuario = Usuario(email=email)
            nuevo_usuario.password = password
            db.session.add(nuevo_usuario)
            db.session.commit()
            
            print_success(f"Usuario {email} creado exitosamente")
            log_activity("Usuario creado", details=f"Email: {email}")
            
            # Mostrar datos para referencia
            usuario = Usuario.query.filter_by(email=email).first()
            print_info(f"ID asignado: {usuario.id}")
    except Exception as e:
        print_error(f"No se pudo crear el usuario: {str(e)}")
        log_activity("Error al crear usuario", success=False, details=f"Email: {email}, Error: {str(e)}")
    
    input("\nPresiona Enter para continuar...")

def listar_usuarios():
    """Lista todos los usuarios administradores/gerentes"""
    print_header("Listado de Usuarios")
    
    try:
        with app.app_context():
            usuarios = Usuario.query.all()
            
            if not usuarios:
                print_info("No hay usuarios registrados en el sistema")
                log_activity("Listado de usuarios", details="No hay usuarios")
                input("\nPresiona Enter para continuar...")
                return
            
            # Encabezado de la tabla
            print(f"{Color.BOLD}{'ID':<5}| {'EMAIL':<40}| {'FECHA REGISTRO':<20}{Color.ENDC}")
            print("-" * 67)
            
            # Contenido de la tabla
            for usuario in usuarios:
                # Obtener fecha de registro si está disponible
                fecha = getattr(usuario, 'created_at', 'No disponible')
                print(f"{usuario.id:<5}| {usuario.email:<40}| {fecha}")
            
            print("-" * 67)
            print(f"Total: {len(usuarios)} usuarios")
            
            log_activity("Listado de usuarios", details=f"Total: {len(usuarios)}")
    except Exception as e:
        print_error(f"Error al listar usuarios: {str(e)}")
        log_activity("Error al listar usuarios", success=False, details=str(e))
    
    input("\nPresiona Enter para continuar...")

def eliminar_usuario():
    """Elimina un usuario existente"""
    print_header("Eliminar Usuario")
    
    # Listar usuarios primero
    try:
        with app.app_context():
            usuarios = Usuario.query.all()
            
            if not usuarios:
                print_info("No hay usuarios registrados en el sistema")
                input("\nPresiona Enter para continuar...")
                return
            
            # Mostrar lista de usuarios
            print(f"{Color.BOLD}{'ID':<5}| {'EMAIL':<40}{Color.ENDC}")
            print("-" * 46)
            
            for usuario in usuarios:
                print(f"{usuario.id:<5}| {usuario.email}")
            
            print("-" * 46)
            
            # Solicitar ID para eliminar
            while True:
                try:
                    id_input = input("\nID del usuario a eliminar (0 para cancelar): ")
                    if not id_input:
                        continue
                        
                    id_usuario = int(id_input)
                    if id_usuario == 0:
                        print_info("Operación cancelada")
                        return
                    
                    usuario = Usuario.query.get(id_usuario)
                    if not usuario:
                        print_error(f"No existe un usuario con ID {id_usuario}")
                        if not confirm_action("¿Deseas intentar con otro ID?"):
                            return
                        continue
                    break
                except ValueError:
                    print_error("Debes ingresar un número válido")
            
            # Confirmar eliminación
            print(f"\nVas a eliminar el usuario: {Color.BOLD}{usuario.email}{Color.ENDC}")
            print_warning("Esta acción no se puede deshacer")
            
            if not confirm_action("¿Estás SEGURO de que deseas eliminar este usuario?"):
                print_info("Operación cancelada")
                log_activity("Intento de eliminación de usuario cancelado", success=False, details=f"ID: {id_usuario}, Email: {usuario.email}")
                return
            
            # Solicitar confirmación adicional para mayor seguridad
            confirmation = input(f"Para confirmar, escribe el email '{usuario.email}': ")
            if confirmation != usuario.email:
                print_error("La confirmación no coincide. Operación cancelada.")
                log_activity("Confirmación fallida para eliminación de usuario", success=False, details=f"ID: {id_usuario}, Email: {usuario.email}")
                return
            
            # Eliminar usuario
            db.session.delete(usuario)
            db.session.commit()
            
            print_success(f"Usuario {usuario.email} eliminado exitosamente")
            log_activity("Usuario eliminado", details=f"ID: {id_usuario}, Email: {usuario.email}")
    except Exception as e:
        print_error(f"Error al eliminar usuario: {str(e)}")
        log_activity("Error al eliminar usuario", success=False, details=str(e))
    
    input("\nPresiona Enter para continuar...")

def cambiar_password():
    """Cambia la contraseña de un usuario existente"""
    print_header("Cambiar Contraseña")
    
    # Listar usuarios primero
    try:
        with app.app_context():
            usuarios = Usuario.query.all()
            
            if not usuarios:
                print_info("No hay usuarios registrados en el sistema")
                input("\nPresiona Enter para continuar...")
                return
            
            # Mostrar lista de usuarios
            print(f"{Color.BOLD}{'ID':<5}| {'EMAIL':<40}{Color.ENDC}")
            print("-" * 46)
            
            for usuario in usuarios:
                print(f"{usuario.id:<5}| {usuario.email}")
            
            print("-" * 46)
            
            # Solicitar ID para cambiar contraseña
            while True:
                try:
                    id_input = input("\nID del usuario para cambiar contraseña (0 para cancelar): ")
                    if not id_input:
                        continue
                        
                    id_usuario = int(id_input)
                    if id_usuario == 0:
                        print_info("Operación cancelada")
                        return
                    
                    usuario = Usuario.query.get(id_usuario)
                    if not usuario:
                        print_error(f"No existe un usuario con ID {id_usuario}")
                        if not confirm_action("¿Deseas intentar con otro ID?"):
                            return
                        continue
                    break
                except ValueError:
                    print_error("Debes ingresar un número válido")
            
            print(f"\nCambiando contraseña para el usuario: {Color.BOLD}{usuario.email}{Color.ENDC}")
            
            # Solicitar y validar nueva contraseña
            while True:
                password = getpass.getpass("Nueva contraseña: ")
                valid, message = validate_password(password)
                if not valid:
                    print_error(message)
                    continue
                    
                confirm_password = getpass.getpass("Confirmar nueva contraseña: ")
                if password != confirm_password:
                    print_error("Las contraseñas no coinciden")
                    continue
                break
            
            # Confirmar cambio
            if not confirm_action("¿Confirmas el cambio de contraseña?"):
                print_info("Operación cancelada")
                log_activity("Intento de cambio de contraseña cancelado", success=False, details=f"ID: {id_usuario}, Email: {usuario.email}")
                return
            
            # Actualizar contraseña
            usuario.password = password
            db.session.commit()
            
            print_success(f"Contraseña actualizada exitosamente para {usuario.email}")
            log_activity("Contraseña actualizada", details=f"ID: {id_usuario}, Email: {usuario.email}")
    except Exception as e:
        print_error(f"Error al cambiar contraseña: {str(e)}")
        log_activity("Error al cambiar contraseña", success=False, details=str(e))
    
    input("\nPresiona Enter para continuar...")

def ver_logs():
    """Muestra los últimos registros de actividad"""
    print_header("Registros de Actividad")
    
    if not os.path.exists(LOG_FILE):
        print_info("No hay registros de actividad disponibles")
        input("\nPresiona Enter para continuar...")
        return
    
    try:
        with open(LOG_FILE, 'r') as f:
            lines = f.readlines()
            
            if not lines:
                print_info("El archivo de registros está vacío")
                input("\nPresiona Enter para continuar...")
                return
            
            # Mostrar las últimas 20 líneas (o menos si hay menos líneas)
            num_lines = min(20, len(lines))
            print(f"Mostrando los últimos {num_lines} registros:")
            print("-" * 80)
            
            for line in lines[-num_lines:]:
                if "ÉXITO" in line:
                    print(f"{Color.GREEN}{line.strip()}{Color.ENDC}")
                elif "FALLO" in line:
                    print(f"{Color.RED}{line.strip()}{Color.ENDC}")
                else:
                    print(line.strip())
            
            print("-" * 80)
    except Exception as e:
        print_error(f"Error al leer los registros: {str(e)}")
    
    input("\nPresiona Enter para continuar...")

def setup_admin_password():
    """Configura o cambia la contraseña del script administrativo"""
    if os.path.exists(ADMIN_PASSWORD_HASH_FILE):
        print_header("Cambiar Contraseña de Administrador")
        
        # Verificar contraseña actual
        current_password = getpass.getpass("Contraseña actual: ")
        with open(ADMIN_PASSWORD_HASH_FILE, 'r') as f:
            stored_hash = f.read().strip()
            salt = stored_hash.split('$')[0]
            computed_hash = salt + '$' + hashlib.sha256((salt + current_password).encode()).hexdigest()
            
            if computed_hash != stored_hash:
                print_error("Contraseña incorrecta")
                log_activity("Intento fallido de cambio de contraseña de administrador", success=False)
                return
    else:
        print_header("Configuración Inicial de Seguridad")
        print_info("Esta es la primera vez que ejecutas esta herramienta.")
        print_info("Debes configurar una contraseña de administrador para proteger el acceso.")
    
    # Solicitar nueva contraseña
    while True:
        new_password = getpass.getpass("Nueva contraseña: ")
        valid, message = validate_password(new_password)
        if not valid:
            print_error(message)
            continue
            
        confirm_password = getpass.getpass("Confirmar nueva contraseña: ")
        if new_password != confirm_password:
            print_error("Las contraseñas no coinciden")
            continue
        break
    
    # Guardar la nueva contraseña con salt
    salt = secrets.token_hex(8)
    password_hash = salt + '$' + hashlib.sha256((salt + new_password).encode()).hexdigest()
    
    with open(ADMIN_PASSWORD_HASH_FILE, 'w') as f:
        f.write(password_hash)
    
    print_success("Contraseña de administrador configurada correctamente")
    log_activity("Contraseña de administrador actualizada")

def verificar_admin_password():
    """Verifica la contraseña de administrador al inicio"""
    if not os.path.exists(ADMIN_PASSWORD_HASH_FILE):
        setup_admin_password()
        return True
    
    attempts = 0
    while attempts < MAX_LOGIN_ATTEMPTS:
        password = getpass.getpass("Contraseña de administrador: ")
        
        with open(ADMIN_PASSWORD_HASH_FILE, 'r') as f:
            stored_hash = f.read().strip()
            salt = stored_hash.split('$')[0]
            computed_hash = salt + '$' + hashlib.sha256((salt + password).encode()).hexdigest()
            
            if computed_hash == stored_hash:
                log_activity("Inicio de sesión exitoso en herramienta de administración")
                return True
        
        attempts += 1
        remaining = MAX_LOGIN_ATTEMPTS - attempts
        print_error(f"Contraseña incorrecta. Intentos restantes: {remaining}")
        log_activity("Intento fallido de inicio de sesión en herramienta de administración", success=False)
    
    print_error("Número máximo de intentos superado. El programa se cerrará.")
    log_activity("Número máximo de intentos de inicio de sesión superado", success=False)
    return False

def menu_principal():
    """Menú principal del script de administración"""
    while True:
        clear_screen()
        print_header("Sistema de Gestión de Reclutas - Administración")
        
        print(f"{Color.BOLD}1.{Color.ENDC} Listar usuarios")
        print(f"{Color.BOLD}2.{Color.ENDC} Crear nuevo usuario")
        print(f"{Color.BOLD}3.{Color.ENDC} Eliminar usuario")
        print(f"{Color.BOLD}4.{Color.ENDC} Cambiar contraseña de usuario")
        print(f"{Color.BOLD}5.{Color.ENDC} Ver registros de actividad")
        print(f"{Color.BOLD}6.{Color.ENDC} Cambiar contraseña de administrador")
        print(f"{Color.BOLD}0.{Color.ENDC} Salir")
        
        opcion = input(f"\n{Color.BOLD}Selecciona una opción:{Color.ENDC} ")
        
        if opcion == "1":
            listar_usuarios()
        elif opcion == "2":
            crear_usuario()
        elif opcion == "3":
            eliminar_usuario()
        elif opcion == "4":
            cambiar_password()
        elif opcion == "5":
            ver_logs()
        elif opcion == "6":
            setup_admin_password()
            input("\nPresiona Enter para continuar...")
        elif opcion == "0":
            clear_screen()
            print_info("Saliendo del programa...")
            time.sleep(1)
            break
        else:
            print_error("Opción inválida, intenta de nuevo")
            time.sleep(1)

if __name__ == "__main__":
    try:
        clear_screen()
        print_header("Sistema de Gestión de Reclutas")
        print_info("Herramienta de Administración de Usuarios")
        print(f"Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
        
        if verificar_admin_password():
            menu_principal()
    except KeyboardInterrupt:
        print("\n")
        print_warning("Programa interrumpido por el usuario")
        sys.exit(0)
    except Exception as e:
        print_error(f"Error inesperado: {str(e)}")
        logging.error(f"Error inesperado: {str(e)}")
        sys.exit(1)