from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask import request
from werkzeug.utils import secure_filename
from models import db, Recluta, Usuario, Entrevista, UserSession
from PIL import Image, ImageDraw, ImageFont
import io
import os
from datetime import datetime
import uuid

# Configuración de la aplicación
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'clave_secreta_muy_segura'
app.config['UPLOAD_FOLDER'] = 'static/uploads'
db.init_app(app)

IPS_PERMITIDAS = ['127.0.0.1', '192.168.1.100', '192.168.1.7']  # Añade aquí las IPs concretas

# Asegurar que existe el directorio de uploads
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Crear la base de datos y un usuario de prueba si no existe
with app.app_context():
    db.create_all()
    if not Usuario.query.filter_by(email='admin@example.com').first():
        usuario = Usuario(email='admin@example.com')
        usuario.password = 'admin'
        db.session.add(usuario)
        db.session.commit()

# Función auxiliar para guardar archivos
def guardar_archivo(archivo, tipo):
    """
    Guarda un archivo en el servidor y devuelve la ruta relativa.
    tipo puede ser 'recluta' o 'usuario'
    """
    if not archivo:
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
    
    # Devolver ruta relativa para guardar en BD
    return os.path.join(f"static/uploads/{tipo}", nombre_unico)

# Ruta para placeholders de imágenes
@app.route('/api/placeholder/<int:width>/<int:height>')
def placeholder(width, height):
    # Limitar tamaños para evitar problemas
    width = min(width, 800)
    height = min(height, 800)
    
    # Crear una imagen gris con las dimensiones especificadas
    img = Image.new('RGB', (width, height), color=(200, 200, 200))
    draw = ImageDraw.Draw(img)
    
    # Dibujar un borde
    draw.rectangle([(0, 0), (width-1, height-1)], outline=(150, 150, 150))
    
    # Añadir texto con el tamaño
    text = f"{width}x{height}"
    draw.text((width//2-20, height//2-10), text, fill=(100, 100, 100))
    
    # Convertir a bytes para enviar
    img_io = io.BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    return send_file(img_io, mimetype='image/png')

# Añadir ruta para favicon
@app.route('/favicon.ico')
def favicon():
    return send_file(os.path.join(app.static_folder, 'favicon.ico'), mimetype='image/x-icon')

# Rutas principales
@app.route('/')
def index():
    return render_template('index.html')

# API de autenticación
@app.route('/api/login', methods=['POST'])
def login_usuario():
    data = request.get_json()
    email = data.get('email')   
    password = data.get('password')

    usuario = Usuario.query.filter_by(email=email).first()
    
    # Para depuración, añade esto temporalmente:
    print(f"Intento de login: email={email}, password={password}")
    print(f"Usuario encontrado: {usuario is not None}")
    if usuario:
        print(f"Verificación: {usuario.verificar_password(password)}")

    if usuario and usuario.verificar_password(password):
        session['usuario_id'] = usuario.id
        session['puesto'] = usuario.puesto if hasattr(usuario, 'puesto') else 'Administrador'
        
        # Guardar la sesión para esta IP
        client_ip = request.remote_addr
        if client_ip in IPS_PERMITIDAS:
            # Generar token único
            import uuid
            session_token = str(uuid.uuid4())
            
            # Calcular fecha de expiración (30 días)
            from datetime import timedelta
            expires_at = datetime.utcnow() + timedelta(days=30)
            
            # Guardar sesión
            user_session = UserSession(
                usuario_id=usuario.id,
                ip_address=client_ip,
                session_token=session_token,
                expires_at=expires_at
            )
            db.session.add(user_session)
            db.session.commit()
        
        return jsonify({"success": True, "usuario": usuario.serialize()}), 200
    else:
        return jsonify({"success": False, "message": "Credenciales incorrectas"}), 401
    
@app.before_request
def verificar_sesion_ip():
    # No verificar para rutas públicas o de API
    if request.path == '/' or request.path.startswith('/static/') or request.path == '/api/login':
        return None
        
    # Si no hay una sesión activa, verificar si la IP está en la lista permitida
    if 'usuario_id' not in session:
        client_ip = request.remote_addr
        
        if client_ip in IPS_PERMITIDAS:
            # Intentar recuperar la última sesión para esta IP
            last_session = UserSession.query.filter_by(ip_address=client_ip).order_by(UserSession.id.desc()).first()
            
            if last_session and last_session.is_valid:
                # Recuperar usuario
                usuario = Usuario.query.get(last_session.usuario_id)
                if usuario:
                    session['usuario_id'] = usuario.id
                    session['puesto'] = usuario.puesto if hasattr(usuario, 'puesto') else 'Administrador'

@app.route('/api/logout', methods=['POST'])
def logout_usuario():
    session.pop('usuario_id', None)
    return jsonify({"success": True, "message": "Sesión cerrada correctamente"}), 200

@app.route('/api/usuario', methods=['GET'])
def get_usuario_actual():
    usuario_id = session.get('usuario_id')
    if not usuario_id:
        return jsonify({"error": "No hay sesión activa"}), 401
    
    usuario = Usuario.query.get_or_404(usuario_id)
    return jsonify(usuario.serialize())

@app.route('/api/perfil', methods=['PUT'])
def actualizar_perfil():
    usuario_id = session.get('usuario_id')
    if not usuario_id:
        return jsonify({"error": "No hay sesión activa"}), 401
    
    usuario = Usuario.query.get_or_404(usuario_id)
    
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Form data con posible archivo
        nombre = request.form.get('nombre')
        telefono = request.form.get('telefono')
        
        if 'foto' in request.files:
            archivo = request.files['foto']
            if archivo and archivo.filename:
                ruta_relativa = guardar_archivo(archivo, 'usuario')
                usuario.foto_url = ruta_relativa
    else:
        # JSON data
        data = request.get_json()
        nombre = data.get('nombre')
        telefono = data.get('telefono')
    
    # Actualizar datos
    if nombre:
        usuario.nombre = nombre
    if telefono:
        usuario.telefono = telefono
    
    db.session.commit()
    return jsonify({"success": True, "usuario": usuario.serialize()})

@app.route('/api/cambiar-password', methods=['POST'])
def cambiar_password():
    usuario_id = session.get('usuario_id')
    if not usuario_id:
        return jsonify({"error": "No hay sesión activa"}), 401
    
    usuario = Usuario.query.get_or_404(usuario_id)
    data = request.get_json()
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not usuario.verificar_password(current_password):
        return jsonify({"success": False, "message": "Contraseña actual incorrecta"}), 400
    
    usuario.password = new_password
    db.session.commit()
    
    return jsonify({"success": True, "message": "Contraseña actualizada correctamente"})

# API de reclutas
@app.route('/api/reclutas', methods=['GET'])
def get_reclutas():
    reclutas = Recluta.query.all()
    return jsonify([r.serialize() for r in reclutas])

@app.route('/api/reclutas/<int:id>', methods=['GET'])
def get_recluta(id):
    recluta = Recluta.query.get_or_404(id)
    return jsonify(recluta.serialize())

@app.route('/api/reclutas', methods=['POST'])
def add_recluta():
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Form data con posible archivo
        nombre = request.form.get('nombre')
        email = request.form.get('email')
        telefono = request.form.get('telefono')
        estado = request.form.get('estado', 'En proceso')
        puesto = request.form.get('puesto', '')
        notas = request.form.get('notas', '')
        
        nuevo = Recluta(
            nombre=nombre,
            email=email,
            telefono=telefono,
            estado=estado,
            puesto=puesto,
            notas=notas
        )
        
        if 'foto' in request.files:
            archivo = request.files['foto']
            if archivo and archivo.filename:
                ruta_relativa = guardar_archivo(archivo, 'recluta')
                nuevo.foto_url = ruta_relativa
    else:
        # JSON data
        data = request.get_json()
        nuevo = Recluta(
            nombre=data['nombre'],
            email=data['email'],
            telefono=data['telefono'],
            estado=data.get('estado', 'En proceso'),
            puesto=data.get('puesto', ''),
            notas=data.get('notas', '')
        )
    
    db.session.add(nuevo)
    db.session.commit()
    return jsonify(nuevo.serialize()), 201

@app.route('/api/reclutas/<int:id>', methods=['PUT'])
def update_recluta(id):
    recluta = Recluta.query.get_or_404(id)
    
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Form data con posible archivo
        nombre = request.form.get('nombre')
        email = request.form.get('email')
        telefono = request.form.get('telefono')
        estado = request.form.get('estado')
        puesto = request.form.get('puesto')
        notas = request.form.get('notas')
        
        if nombre:
            recluta.nombre = nombre
        if email:
            recluta.email = email
        if telefono:
            recluta.telefono = telefono
        if estado:
            recluta.estado = estado
        if puesto is not None:
            recluta.puesto = puesto
        if notas is not None:
            recluta.notas = notas
        
        if 'foto' in request.files:
            archivo = request.files['foto']
            if archivo and archivo.filename:
                ruta_relativa = guardar_archivo(archivo, 'recluta')
                recluta.foto_url = ruta_relativa
    else:
        # JSON data
        data = request.get_json()
        
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
    
    db.session.commit()
    return jsonify(recluta.serialize())

@app.route('/api/reclutas/<int:id>', methods=['DELETE'])
def delete_recluta(id):
    recluta = Recluta.query.get_or_404(id)
    
    # Si el recluta tiene una foto personalizada, eliminarla
    if recluta.foto_url and recluta.foto_url != 'default_profile.jpg' and os.path.exists(recluta.foto_url):
        try:
            os.remove(recluta.foto_url)
        except:
            pass
    
    db.session.delete(recluta)
    db.session.commit()
    return jsonify({"success": True, "message": "Recluta eliminado correctamente"})

# API de entrevistas
@app.route('/api/entrevistas', methods=['GET'])
def get_entrevistas():
    entrevistas = Entrevista.query.all()
    return jsonify([e.serialize() for e in entrevistas])

@app.route('/api/entrevistas/<int:id>', methods=['GET'])
def get_entrevista(id):
    entrevista = Entrevista.query.get_or_404(id)
    return jsonify(entrevista.serialize())

@app.route('/api/entrevistas', methods=['POST'])
def add_entrevista():
    data = request.get_json()
    
    # Convertir la fecha de string a objeto Date
    fecha = datetime.strptime(data['fecha'], '%Y-%m-%d').date()
    
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
    return jsonify(nueva.serialize()), 201

@app.route('/api/entrevistas/<int:id>', methods=['PUT'])
def update_entrevista(id):
    entrevista = Entrevista.query.get_or_404(id)
    data = request.get_json()
    
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
    
    db.session.commit()
    return jsonify(entrevista.serialize())

@app.route('/api/entrevistas/<int:id>', methods=['DELETE'])
def delete_entrevista(id):
    entrevista = Entrevista.query.get_or_404(id)
    db.session.delete(entrevista)
    db.session.commit()
    return jsonify({"success": True, "message": "Entrevista eliminada correctamente"})

# API de estadísticas
@app.route('/api/estadisticas', methods=['GET'])
def get_estadisticas():
    # Contar reclutas por estado
    total_reclutas = Recluta.query.count()
    reclutas_activos = Recluta.query.filter_by(estado='Activo').count()
    reclutas_proceso = Recluta.query.filter_by(estado='En proceso').count()
    
    # Contar entrevistas pendientes
    entrevistas_pendientes = Entrevista.query.filter_by(estado='pendiente').count()
    
    return jsonify({
        'total_reclutas': total_reclutas,
        'reclutas_activos': reclutas_activos,
        'reclutas_proceso': reclutas_proceso,
        'entrevistas_pendientes': entrevistas_pendientes
    })

if __name__ == '__main__':
    app.run(debug=True)