from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import CSRFProtect  # Añadido para protección CSRF
import secrets
import os
import logging
from datetime import datetime, timedelta
import uuid
from PIL import Image, ImageDraw, ImageFont
import io
import configparser  # Para manejar configuraciones externas
import hashlib  # Para verificar la integridad de archivos subidos

from models import db, Recluta, Usuario, Entrevista, UserSession

# Configuración de logging
logging.basicConfig(
    filename='app.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Cargar configuración desde archivo
config = configparser.ConfigParser()
config_file = os.environ.get('CONFIG_FILE', 'config.ini')

# Verificar si el archivo de configuración existe, si no, usar valores predeterminados
if os.path.exists(config_file):
    config.read(config_file)
else:
    # Configuración predeterminada
    config['DEFAULT'] = {
        'SECRET_KEY': secrets.token_hex(16),
        'DATABASE_URI': 'sqlite:///database.db',
        'UPLOAD_FOLDER': 'static/uploads',
        'SESSION_LIFETIME': '3600',  # 1 hora en segundos
        'DEBUG': 'False'
    }
    config['SECURITY'] = {
        'ALLOWED_IPS': '127.0.0.1,192.168.1.100,192.168.1.7',
        'MAX_CONTENT_LENGTH': '16777216'  # 16MB
    }
    # Guardar la configuración predeterminada
    with open('config.ini', 'w') as configfile:
        config.write(configfile)

# Configuración de la aplicación
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = config['DEFAULT'].get('DATABASE_URI', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = config['DEFAULT'].get('SECRET_KEY', secrets.token_hex(16))
app.config['UPLOAD_FOLDER'] = config['DEFAULT'].get('UPLOAD_FOLDER', 'static/uploads')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(seconds=int(config['DEFAULT'].get('SESSION_LIFETIME', 3600)))
app.config['MAX_CONTENT_LENGTH'] = int(config['SECURITY'].get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB límite de subida
app.config['DEBUG'] = config['DEFAULT'].getboolean('DEBUG', False)

# Inicializar protección CSRF
csrf = CSRFProtect(app)

# Inicializar la base de datos
db.init_app(app)

# Configurar Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'index'

# Lista de IPs permitidas desde configuración
IPS_PERMITIDAS = config['SECURITY'].get('ALLOWED_IPS', '127.0.0.1').split(',')

# Extensiones de archivo permitidas
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

@login_manager.user_loader
def load_user(user_id):
    return Usuario.query.get(int(user_id))

# Función para verificar si una extensión de archivo es válida
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Función para calcular el hash de un archivo
def calculate_file_hash(file_path):
    """Calcula el hash SHA-256 de un archivo."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

# Middleware para verificar IP permitida
@app.before_request
def check_ip():
    # Evitar verificación para activos estáticos
    if request.path.startswith('/static/'):
        return
        
    # Obtener IP real (incluso detrás de proxy)
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if client_ip not in IPS_PERMITIDAS:
        # Registrar intento de acceso no autorizado
        logger.warning(f"Intento de acceso no autorizado desde IP: {client_ip}")
        return jsonify({"error": "Acceso no autorizado"}), 403

# Middleware para renovar la sesión en cada petición
@app.before_request
def renew_session():
    if current_user.is_authenticated:
        # Evitar renovación para activos estáticos
        if not request.path.startswith('/static/'):
            session.modified = True

# Asegurar que existe el directorio de uploads
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])
    # Crear directorios para diferentes tipos de contenido
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'recluta'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'usuario'), exist_ok=True)

# Crear la base de datos y usuarios iniciales si es necesario
with app.app_context():
    db.create_all()
    
    # Código de creación de usuarios iniciales SOLO si no existen usuarios
    if Usuario.query.count() == 0:
        # Primer admin con contraseña segura generada aleatoriamente
        admin_password = secrets.token_urlsafe(12)  # 12 caracteres aleatorios
        usuario = Usuario(email='admin@example.com')
        usuario.password = admin_password
        db.session.add(usuario)
        
        # Segundo admin con contraseña segura
        admin2_password = secrets.token_urlsafe(12)
        usuario2 = Usuario(email='admin2@example.com')
        usuario2.password = admin2_password
        db.session.add(usuario2)
        
        db.session.commit()
        
        # Guardar las contraseñas generadas en un archivo protegido para el primer uso
        with open('.initial_credentials', 'w') as f:
            f.write(f"admin@example.com:{admin_password}\n")
            f.write(f"admin2@example.com:{admin2_password}\n")
        
        # Cambiar permisos para que solo el propietario pueda leer
        os.chmod('.initial_credentials', 0o600)
        
        logger.info("Usuarios iniciales creados. Las credenciales se guardaron en .initial_credentials")

# Función auxiliar para guardar archivos
def guardar_archivo(archivo, tipo):
    """
    Guarda un archivo en el servidor y devuelve la ruta relativa.
    tipo puede ser 'recluta' o 'usuario'
    """
    if not archivo:
        return None
    
    if not allowed_file(archivo.filename):
        return None
    
    # Generar nombre único para el archivo
    filename = secure_filename(archivo.filename)
    nombre_base, extension = os.path.splitext(filename)
    nombre_unico = f"{nombre_base}_{uuid.uuid4().hex}{extension}"
    
    # Crear subdirectorio si no existe
    directorio = os.path.join(app.config['UPLOAD_FOLDER'], tipo)
    if not os.path.exists(directorio):
        os.makedirs(directorio)
    
    # Guardar el archivo
    ruta_completa = os.path.join(directorio, nombre_unico)
    archivo.save(ruta_completa)
    
    # Verificar el archivo guardado (opcional: escaneo antivirus)
    file_hash = calculate_file_hash(ruta_completa)
    logger.info(f"Archivo guardado: {ruta_completa}, Hash: {file_hash}")
    
    # Devolver ruta relativa para guardar en BD
    return os.path.join(f"static/uploads/{tipo}", nombre_unico)

# Ruta para placeholders de imágenes
@app.route('/api/placeholder/<int:width>/<int:height>')
def placeholder(width, height):
    # Limitar tamaños para evitar problemas de recursos
    width = min(width, 800)
    height = min(height, 800)
    
    # Crear una imagen gris con las dimensiones especificadas
    img = Image.new('RGB', (width, height), color=(200, 200, 200))
    draw = ImageDraw.Draw(img)
    
    # Dibujar un borde
    draw.rectangle([(0, 0), (width-1, height-1)], outline=(150, 150, 150))
    
    # Añadir texto con el tamaño
    text = f"{width}x{height}"
    # Usar una fuente por defecto si está disponible
    try:
        font = ImageFont.truetype("arial.ttf", 15)
    except IOError:
        font = ImageFont.load_default()
        
    draw.text((width//2-20, height//2-10), text, fill=(100, 100, 100), font=font)
    
    # Convertir a bytes para enviar
    img_io = io.BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    
    # Cachear imagen por un día
    response = send_file(img_io, mimetype='image/png')
    response.headers['Cache-Control'] = 'public, max-age=86400'
    return response

# Añadir ruta para favicon
@app.route('/favicon.ico')
def favicon():
    # Crear un favicon vacío
    empty_ico = io.BytesIO()
    img = Image.new('RGB', (16, 16), color=(255, 255, 255))
    img.save(empty_ico, 'ICO')
    empty_ico.seek(0)
    return send_file(empty_ico, mimetype='image/x-icon')

# Rutas principales
@app.route('/')
def index():
    return render_template('index.html')

# ----- RUTAS API PARA RECLUTAS -----

@app.route('/api/reclutas', methods=['GET'])
@login_required
def get_reclutas():
    # Implementar paginación
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Limitar per_page para evitar sobrecarga
    per_page = min(per_page, 50)
    
    # Filtros opcionales
    estado = request.args.get('estado')
    busqueda = request.args.get('busqueda')
    
    # Construir consulta base
    query = Recluta.query
    
    # Aplicar filtros si existen
    if estado and estado != 'todos':
        query = query.filter_by(estado=estado)
    
    if busqueda:
        search_term = f"%{busqueda}%"
        query = query.filter(
            (Recluta.nombre.like(search_term)) | 
            (Recluta.email.like(search_term)) |
            (Recluta.telefono.like(search_term))
        )
    
    # Ordenamiento
    sort_by = request.args.get('sort_by', 'fecha_registro')
    sort_dir = request.args.get('sort_dir', 'desc')
    
    if sort_by not in ['nombre', 'email', 'fecha_registro', 'estado']:
        sort_by = 'fecha_registro'
    
    if sort_dir == 'asc':
        query = query.order_by(getattr(Recluta, sort_by).asc())
    else:
        query = query.order_by(getattr(Recluta, sort_by).desc())
    
    # Ejecutar consulta paginada
    paginacion = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Preparar respuesta
    respuesta = {
        'reclutas': [r.serialize() for r in paginacion.items],
        'total': paginacion.total,
        'paginas': paginacion.pages,
        'pagina_actual': page
    }
    
    return jsonify(respuesta)

@app.route('/api/reclutas/<int:id>', methods=['GET'])
@login_required
def get_recluta(id):
    recluta = Recluta.query.get_or_404(id)
    return jsonify(recluta.serialize())

@app.route('/api/reclutas', methods=['POST'])
@login_required
def add_recluta():
    # Si hay datos de formulario multipart (con archivo)
    if 'multipart/form-data' in request.content_type or 'form-data' in request.content_type:
        data = request.form.to_dict()
        
        # Procesar archivo si existe
        if 'foto' in request.files:
            foto = request.files['foto']
            if foto and foto.filename:
                foto_url = guardar_archivo(foto, 'recluta')
                if foto_url:
                    data['foto_url'] = foto_url
    else:
        # JSON data
        data = request.get_json()
    
    # Verificar datos obligatorios
    if not all(key in data for key in ['nombre', 'email', 'telefono', 'estado']):
        return jsonify({"success": False, "message": "Faltan datos requeridos"}), 400
    
    try:
        nuevo = Recluta(
            nombre=data['nombre'],
            email=data['email'],
            telefono=data['telefono'],
            estado=data['estado'],
            puesto=data.get('puesto', ''),
            notas=data.get('notas', ''),
            foto_url=data.get('foto_url', '')
        )
        
        db.session.add(nuevo)
        db.session.commit()
        logger.info(f"Recluta creado: ID={nuevo.id}, Nombre={nuevo.nombre}")
        return jsonify(nuevo.serialize()), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error al crear recluta: {str(e)}")
        return jsonify({"success": False, "message": f"Error al crear el recluta: {str(e)}"}), 500

@app.route('/api/reclutas/<int:id>', methods=['PUT'])
@login_required
def update_recluta(id):
    recluta = Recluta.query.get_or_404(id)
    
    # Si hay datos de formulario multipart (con archivo)
    if 'multipart/form-data' in request.content_type or 'form-data' in request.content_type:
        data = request.form.to_dict()
        
        # Procesar archivo si existe
        if 'foto' in request.files:
            foto = request.files['foto']
            if foto and foto.filename:
                foto_url = guardar_archivo(foto, 'recluta')
                if foto_url:
                    # Si había una foto anterior, eliminarla
                    if recluta.foto_url and os.path.exists(recluta.foto_url) and not recluta.foto_url.endswith('default_profile.jpg'):
                        try:
                            os.remove(recluta.foto_url)
                        except Exception as e:
                            logger.error(f"Error al eliminar foto anterior: {str(e)}")
                    
                    data['foto_url'] = foto_url
    else:
        # JSON data
        data = request.get_json()
    
    try:
        # Actualizar campos si están presentes
        if 'nombre' in data:
            recluta.nombre = data['nombre']
        if 'email' in data:
            recluta.email = data['email']
        if 'telefono' in data:
            recluta.telefono = data['telefono']
        if 'estado' in data:
            recluta.estado = data['estado']
        if 'puesto' in data:
            recluta.puesto = data['puesto']
        if 'notas' in data:
            recluta.notas = data['notas']
        if 'foto_url' in data:
            recluta.foto_url = data['foto_url']
        
        db.session.commit()
        logger.info(f"Recluta actualizado: ID={recluta.id}, Nombre={recluta.nombre}")
        return jsonify(recluta.serialize())
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error al actualizar recluta: {str(e)}")
        return jsonify({"success": False, "message": f"Error al actualizar el recluta: {str(e)}"}), 500

@app.route('/api/reclutas/<int:id>', methods=['DELETE'])
@login_required
def delete_recluta(id):
    recluta = Recluta.query.get_or_404(id)
    
    try:
        # Si el recluta tiene una foto personalizada, eliminarla
        if recluta.foto_url and recluta.foto_url != 'default_profile.jpg' and os.path.exists(recluta.foto_url):
            try:
                os.remove(recluta.foto_url)
            except Exception as e:
                logger.error(f"Error al eliminar foto: {str(e)}")
        
        db.session.delete(recluta)
        db.session.commit()
        logger.info(f"Recluta eliminado: ID={id}")
        return jsonify({"success": True, "message": "Recluta eliminado correctamente"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error al eliminar recluta: {str(e)}")
        return jsonify({"success": False, "message": f"Error al eliminar el recluta: {str(e)}"}), 500

# ----- RUTAS PARA AUTENTICACIÓN -----

@app.route('/api/login', methods=['POST'])
def login_usuario():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"success": False, "message": "Email y contraseña son requeridos"}), 400

    usuario = Usuario.query.filter_by(email=email).first()

    if usuario and usuario.check_password(password):
        # Registrar la sesión
        session_token = secrets.token_hex(16)
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        
        # Crear registro de sesión
        user_session = UserSession(
            usuario_id=usuario.id,
            ip_address=client_ip,
            session_token=session_token,
            expires_at=datetime.utcnow() + timedelta(hours=24),
            is_valid=True
        )
        
        db.session.add(user_session)
        db.session.commit()
        
        # Iniciar sesión con Flask-Login
        login_user(usuario, remember=True)
        
        # Guardar token en sesión
        session['session_token'] = session_token
        session.permanent = True
        
        logger.info(f"Inicio de sesión exitoso: Usuario={email}, IP={client_ip}")
        return jsonify({"success": True, "usuario": usuario.serialize()}), 200
    else:
        # Registrar intento fallido
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        logger.warning(f"Intento de inicio de sesión fallido: Email={email}, IP={client_ip}")
        return jsonify({"success": False, "message": "Credenciales incorrectas"}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout_usuario():
    # Invalidar la sesión actual en la base de datos
    if 'session_token' in session:
        user_session = UserSession.query.filter_by(
            usuario_id=current_user.id,
            session_token=session['session_token']
        ).first()
        
        if user_session:
            user_session.is_valid = False
            db.session.commit()
    
    # Limpiar la sesión de Flask
    logout_user()
    session.clear()
    
    return jsonify({"success": True}), 200

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    if current_user.is_authenticated:
        # Verificar si la sesión sigue siendo válida en la base de datos
        if 'session_token' in session:
            user_session = UserSession.query.filter_by(
                usuario_id=current_user.id,
                session_token=session['session_token'],
                is_valid=True
            ).first()
            
            if user_session and user_session.expires_at > datetime.utcnow():
                return jsonify({"authenticated": True, "usuario": current_user.serialize()}), 200
            else:
                # Sesión expirada o inválida
                logout_user()
                session.clear()
    
    return jsonify({"authenticated": False}), 401

# ----- RUTAS PARA GESTIÓN DE PERFIL -----

@app.route('/api/perfil', methods=['PUT'])
@login_required
def actualizar_perfil():
    usuario = current_user
    
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Form data con posible archivo
        nombre = request.form.get('nombre')
        telefono = request.form.get('telefono')
        
        if 'foto' in request.files:
            archivo = request.files['foto']
            if archivo and archivo.filename:
                ruta_relativa = guardar_archivo(archivo, 'usuario')
                if ruta_relativa:
                    # Eliminar foto anterior si existe
                    if hasattr(usuario, 'foto_url') and usuario.foto_url and usuario.foto_url != 'default_profile.jpg':
                        try:
                            ruta_antigua = os.path.join(os.getcwd(), usuario.foto_url)
                            if os.path.exists(ruta_antigua):
                                os.remove(ruta_antigua)
                        except Exception as e:
                            logger.error(f"Error al eliminar foto antigua: {str(e)}")
                    
                    usuario.foto_url = ruta_relativa
    else:
        # JSON data
        data = request.get_json()
        nombre = data.get('nombre')
        telefono = data.get('telefono')
    
    # Actualizar datos
    if hasattr(usuario, 'nombre') and nombre:
        usuario.nombre = nombre
    if hasattr(usuario, 'telefono') and telefono:
        usuario.telefono = telefono
    
    try:
        db.session.commit()
        logger.info(f"Perfil actualizado: Usuario={usuario.email}")
        return jsonify({"success": True, "usuario": usuario.serialize()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error al actualizar perfil: {str(e)}")
        return jsonify({"success": False, "message": f"Error al actualizar perfil: {str(e)}"}), 500

@app.route('/api/cambiar-password', methods=['POST'])
@login_required
def cambiar_password():
    data = request.get_json()
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({"success": False, "message": "Las contraseñas son requeridas"}), 400
    
    # Verificar que la contraseña actual sea correcta
    if not current_user.check_password(current_password):
        # Registrar intento fallido
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        logger.warning(f"Intento de cambio de contraseña fallido: Usuario={current_user.email}, IP={client_ip}")
        return jsonify({"success": False, "message": "Contraseña actual incorrecta"}), 400
    
    # Validar nueva contraseña
    if len(new_password) < 8:
        return jsonify({"success": False, "message": "La nueva contraseña debe tener al menos 8 caracteres"}), 400
    
    try:
        # Actualizar contraseña
        current_user.password = new_password
        db.session.commit()
        
        # Registrar cambio exitoso
        logger.info(f"Contraseña cambiada: Usuario={current_user.email}")
        
        return jsonify({"success": True, "message": "Contraseña actualizada correctamente"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error al cambiar contraseña: {str(e)}")
        return jsonify({"success": False, "message": f"Error al cambiar contraseña: {str(e)}"}), 500

# ----- RUTAS PARA ENTREVISTAS -----

@app.route('/api/entrevistas', methods=['GET'])
@login_required
def get_entrevistas():
    # Implementar paginación
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Limitar per_page para evitar sobrecarga
    per_page = min(per_page, 50)
    
    # Filtros opcionales
    estado = request.args.get('estado')
    recluta_id = request.args.get('recluta_id')
    fecha_desde = request.args.get('fecha_desde')
    fecha_hasta = request.args.get('fecha_hasta')
    
    # Construir consulta base
    query = Entrevista.query
    
    # Aplicar filtros si existen
    if estado:
        query = query.filter_by(estado=estado)
    
    if recluta_id:
        query = query.filter_by(recluta_id=recluta_id)
    
    if fecha_desde:
        try:
            fecha_desde_dt = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
            query = query.filter(Entrevista.fecha >= fecha_desde_dt)
        except ValueError:
            pass
    
    if fecha_hasta:
        try:
            fecha_hasta_dt = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
            query = query.filter(Entrevista.fecha <= fecha_hasta_dt)
        except ValueError:
            pass
    
    # Ordenamiento por fecha
    query = query.order_by(Entrevista.fecha.asc(), Entrevista.hora.asc())
    
    # Ejecutar consulta paginada
    paginacion = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Preparar respuesta
    respuesta = {
        'entrevistas': [e.serialize() for e in paginacion.items],
        'total': paginacion.total,
        'paginas': paginacion.pages,
        'pagina_actual': page
    }
    
    return jsonify(respuesta)

@app.route('/api/entrevistas/<int:id>', methods=['GET'])
@login_required
def get_entrevista(id):
    entrevista = Entrevista.query.get_or_404(id)
    return jsonify(entrevista.serialize())

@app.route('/api/entrevistas', methods=['POST'])
@login_required
def add_entrevista():
    data = request.get_json()
    
    # Verificar datos obligatorios
    if not all(key in data for key in ['recluta_id', 'fecha', 'hora']):
        return jsonify({"success": False, "message": "Faltan datos requeridos"}), 400
    
    try:
        # Convertir la fecha de string a objeto Date
        fecha = datetime.strptime(data['fecha'], '%Y-%m-%d').date()
        
        # Verificar que el recluta existe
        recluta = Recluta.query.get(data['recluta_id'])
        if not recluta:
            return jsonify({"success": False, "message": "El recluta no existe"}), 404
        
        # Verificar si ya existe una entrevista en el mismo horario
        hora_inicio = data['hora']
        duracion = data.get('duracion', 60)  # duración en minutos
        
        # Calcular hora de finalización
        hora_inicio_dt = datetime.strptime(hora_inicio, '%H:%M')
        hora_fin_dt = hora_inicio_dt + timedelta(minutes=duracion)
        hora_fin = hora_fin_dt.strftime('%H:%M')
        
                    # Verificar colisiones
        entrevistas_existentes = Entrevista.query.filter_by(fecha=fecha).all()
        for entrevista in entrevistas_existentes:
            e_hora_inicio_dt = datetime.strptime(entrevista.hora, '%H:%M')
            e_hora_fin_dt = e_hora_inicio_dt + timedelta(minutes=entrevista.duracion)
            
            # Convertir a minutos desde medianoche para comparación fácil
            nueva_inicio_min = hora_inicio_dt.hour * 60 + hora_inicio_dt.minute
            nueva_fin_min = hora_fin_dt.hour * 60 + hora_fin_dt.minute
            exist_inicio_min = e_hora_inicio_dt.hour * 60 + e_hora_inicio_dt.minute
            exist_fin_min = e_hora_fin_dt.hour * 60 + e_hora_fin_dt.minute
            
            # Verificar si hay solapamiento
            if (nueva_inicio_min < exist_fin_min and nueva_fin_min > exist_inicio_min):
                return jsonify({
                    "success": False, 
                    "message": f"La entrevista se solapa con otra programada para el recluta {entrevista.recluta_nombre} a las {entrevista.hora}"
                }), 400
        
        # Crear la nueva entrevista
        nueva = Entrevista(
            recluta_id=data['recluta_id'],
            fecha=fecha,
            hora=data['hora'],
            duracion=data.get('duracion', 60),
            tipo=data.get('tipo', 'presencial'),
            ubicacion=data.get('ubicacion', ''),
            notas=data.get('notas', ''),
            estado=data.get('estado', 'pendiente')
        )
        
        db.session.add(nueva)
        db.session.commit()
        
        # Registrar la creación de la entrevista
        logger.info(f"Entrevista creada: ID={nueva.id}, Recluta={recluta.nombre}, Fecha={fecha}, Hora={data['hora']}")
        
        # Si se solicita enviar invitación por correo
        if data.get('enviar_invitacion', False):
            # Aquí se implementaría la lógica para enviar el correo
            # Por ahora solo registramos la intención
            logger.info(f"Solicitud de envío de invitación para entrevista ID={nueva.id}")
        
        return jsonify(nueva.serialize()), 201
    except ValueError as e:
        logger.error(f"Error de formato en datos de entrevista: {str(e)}")
        return jsonify({"success": False, "message": "Formato de fecha u hora incorrecto"}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error al crear entrevista: {str(e)}")
        return jsonify({"success": False, "message": f"Error al crear la entrevista: {str(e)}"}), 500

@app.route('/api/entrevistas/<int:id>', methods=['PUT'])
@login_required
def update_entrevista(id):
    entrevista = Entrevista.query.get_or_404(id)
    data = request.get_json()
    
    try:
        # Actualizar campos si están presentes
        if 'fecha' in data:
            entrevista.fecha = datetime.strptime(data['fecha'], '%Y-%m-%d').date()
        
        if 'hora' in data:
            entrevista.hora = data['hora']
        
        if 'duracion' in data:
            entrevista.duracion = data['duracion']
        
        if 'tipo' in data:
            entrevista.tipo = data['tipo']
        
        if 'ubicacion' in data:
            entrevista.ubicacion = data['ubicacion']
        
        if 'notas' in data:
            entrevista.notas = data['notas']
        
        if 'estado' in data:
            entrevista.estado = data['estado']
        
        # Si se cambia la fecha u hora, verificar colisiones
        if 'fecha' in data or 'hora' in data:
            hora_inicio_dt = datetime.strptime(entrevista.hora, '%H:%M')
            hora_fin_dt = hora_inicio_dt + timedelta(minutes=entrevista.duracion)
            
            # Buscar otras entrevistas en la misma fecha
            otras_entrevistas = Entrevista.query.filter(
                Entrevista.fecha == entrevista.fecha,
                Entrevista.id != entrevista.id
            ).all()
            
            for otra in otras_entrevistas:
                otra_inicio_dt = datetime.strptime(otra.hora, '%H:%M')
                otra_fin_dt = otra_inicio_dt + timedelta(minutes=otra.duracion)
                
                # Convertir a minutos para comparación
                entrevista_inicio_min = hora_inicio_dt.hour * 60 + hora_inicio_dt.minute
                entrevista_fin_min = hora_fin_dt.hour * 60 + hora_fin_dt.minute
                otra_inicio_min = otra_inicio_dt.hour * 60 + otra_inicio_dt.minute
                otra_fin_min = otra_fin_dt.hour * 60 + otra_fin_dt.minute
                
                # Verificar solapamiento
                if (entrevista_inicio_min < otra_fin_min and entrevista_fin_min > otra_inicio_min):
                    return jsonify({
                        "success": False, 
                        "message": f"La entrevista se solapa con otra programada para el recluta {otra.recluta_nombre} a las {otra.hora}"
                    }), 400
        
        db.session.commit()
        logger.info(f"Entrevista actualizada: ID={entrevista.id}")
        return jsonify(entrevista.serialize())
    except ValueError as e:
        logger.error(f"Error de formato en datos de entrevista: {str(e)}")
        return jsonify({"success": False, "message": "Formato de fecha u hora incorrecto"}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error al actualizar entrevista: {str(e)}")
        return jsonify({"success": False, "message": f"Error al actualizar la entrevista: {str(e)}"}), 500

@app.route('/api/entrevistas/<int:id>', methods=['DELETE'])
@login_required
def delete_entrevista(id):
    entrevista = Entrevista.query.get_or_404(id)
    
    try:
        # Guardar info para el log
        entrevista_info = f"ID={entrevista.id}, Recluta={entrevista.recluta_id}, Fecha={entrevista.fecha}"
        
        db.session.delete(entrevista)
        db.session.commit()
        
        logger.info(f"Entrevista eliminada: {entrevista_info}")
        return jsonify({"success": True, "message": "Entrevista eliminada correctamente"})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error al eliminar entrevista: {str(e)}")
        return jsonify({"success": False, "message": f"Error al eliminar la entrevista: {str(e)}"}), 500

# ----- RUTAS PARA ESTADÍSTICAS -----

@app.route('/api/estadisticas', methods=['GET'])
@login_required
def get_estadisticas():
    try:
        # Estadísticas de reclutas
        total_reclutas = Recluta.query.count()
        reclutas_activos = Recluta.query.filter_by(estado='Activo').count()
        reclutas_proceso = Recluta.query.filter_by(estado='En proceso').count()
        reclutas_rechazados = Recluta.query.filter_by(estado='Rechazado').count()
        
        # Estadísticas de entrevistas
        entrevistas_pendientes = Entrevista.query.filter_by(estado='pendiente').count()
        entrevistas_completadas = Entrevista.query.filter_by(estado='completada').count()
        entrevistas_canceladas = Entrevista.query.filter_by(estado='cancelada').count()
        
        # Entrevistas por día (últimos 30 días)
        fecha_inicio = datetime.utcnow().date() - timedelta(days=30)
        entrevistas_por_dia = {}
        
        for i in range(31):  # 0 a 30 días atrás
            fecha = fecha_inicio + timedelta(days=i)
            fecha_str = fecha.strftime('%Y-%m-%d')
            entrevistas_por_dia[fecha_str] = Entrevista.query.filter_by(fecha=fecha).count()
        
        # Distribución de reclutas por puesto
        reclutas_por_puesto = db.session.query(
            Recluta.puesto, db.func.count(Recluta.id)
        ).group_by(Recluta.puesto).all()
        
        distribucion_puestos = {puesto: count for puesto, count in reclutas_por_puesto if puesto}
        
        return jsonify({
            'total_reclutas': total_reclutas,
            'reclutas_activos': reclutas_activos,
            'reclutas_proceso': reclutas_proceso,
            'reclutas_rechazados': reclutas_rechazados,
            'entrevistas_pendientes': entrevistas_pendientes,
            'entrevistas_completadas': entrevistas_completadas,
            'entrevistas_canceladas': entrevistas_canceladas,
            'entrevistas_por_dia': entrevistas_por_dia,
            'distribucion_puestos': distribucion_puestos
        })
    except Exception as e:
        logger.error(f"Error al obtener estadísticas: {str(e)}")
        return jsonify({"success": False, "message": f"Error al obtener estadísticas: {str(e)}"}), 500

# Manejadores de errores
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Recurso no encontrado"}), 404

@app.errorhandler(500)
def server_error(error):
    logger.error(f"Error del servidor: {str(error)}")
    return jsonify({"error": "Error interno del servidor"}), 500

@app.errorhandler(403)
def forbidden(error):
    return jsonify({"error": "Acceso prohibido"}), 403

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({"error": "No autorizado"}), 401

# Solo ejecutar la aplicación si este archivo es ejecutado directamente
if __name__ == '__main__':
    # Configurar servidor de desarrollo con opciones más seguras
    app.run(
        debug=app.config['DEBUG'],
        host='0.0.0.0',  # Escuchar en todas las interfaces
        port=5000,
        ssl_context='adhoc'  # Usar HTTPS en desarrollo (requiere pyOpenSSL)
    )