from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from flask import request   
from werkzeug.utils import secure_filename
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
import secrets
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
app.config['SECRET_KEY'] = secrets.token_hex(16)  # Clave secreta para sesiones
app.config['UPLOAD_FOLDER'] = 'static/uploads'
db.init_app(app)

# Configurar Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'index'  # Redirige a index cuando se requiere login

@login_manager.user_loader
def load_user(user_id):
    return Usuario.query.get(int(user_id))

IPS_PERMITIDAS = ['127.0.0.1', '192.168.1.100', '192.168.1.7']  # Añade aquí las IPs concretas

# Asegurar que existe el directorio de uploads
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Crear la base de datos y un usuario de prueba si no existe
with app.app_context():
    db.create_all()
    # Primer admin
    if not Usuario.query.filter_by(email='admin@example.com').first():
        usuario = Usuario(email='admin@example.com')
        usuario.password = 'admin'  # Se encriptará automáticamente
        db.session.add(usuario)
        db.session.commit()
    
    # Segundo admin
    if not Usuario.query.filter_by(email='admin2@example.com').first():
        usuario2 = Usuario(email='admin2@example.com')
        usuario2.password = 'admin2'  # Se encriptará automáticamente
        db.session.add(usuario2)

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
    reclutas = Recluta.query.all()
    return jsonify([r.serialize() for r in reclutas])

@app.route('/api/reclutas/<int:id>', methods=['GET'])
@login_required
def get_recluta(id):
    recluta = Recluta.query.get_or_404(id)
    return jsonify(recluta.serialize())

@app.route('/api/reclutas', methods=['POST'])
@login_required
def add_recluta():
    data = request.get_json()
    
    # Verificar datos obligatorios
    if not all(key in data for key in ['nombre', 'email', 'telefono', 'estado']):
        return jsonify({"success": False, "message": "Faltan datos requeridos"}), 400
    
    nuevo = Recluta(
        nombre=data['nombre'],
        email=data['email'],
        telefono=data['telefono'],
        estado=data['estado'],
        puesto=data.get('puesto', ''),
        notas=data.get('notas', '')
    )
    
    db.session.add(nuevo)
    db.session.commit()
    return jsonify(nuevo.serialize()), 201

@app.route('/api/reclutas/<int:id>', methods=['PUT'])
@login_required
def update_recluta(id):
    recluta = Recluta.query.get_or_404(id)
    data = request.get_json()
    
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
    
    db.session.commit()
    return jsonify(recluta.serialize())

@app.route('/api/reclutas/<int:id>', methods=['DELETE'])
@login_required
def delete_recluta(id):
    recluta = Recluta.query.get_or_404(id)
    
    # Si el recluta tiene una foto personalizada, eliminarla
    if hasattr(recluta, 'foto_url') and recluta.foto_url and recluta.foto_url != 'default_profile.jpg' and os.path.exists(recluta.foto_url):
        try:
            os.remove(recluta.foto_url)
        except:
            pass
    
    db.session.delete(recluta)
    db.session.commit()
    return jsonify({"success": True, "message": "Recluta eliminado correctamente"})

# ----- RUTAS PARA AUTENTICACIÓN -----

@app.route('/api/login', methods=['POST'])
def login_usuario():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    usuario = Usuario.query.filter_by(email=email).first()

    if usuario and usuario.check_password(password):
        login_user(usuario, remember=True)  # remember=True para mantener la sesión
        return jsonify({"success": True, "usuario": usuario.serialize()}), 200
    else:
        return jsonify({"success": False, "message": "Credenciales incorrectas"}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout_usuario():
    logout_user()
    return jsonify({"success": True}), 200

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    if current_user.is_authenticated:
        return jsonify({"authenticated": True, "usuario": current_user.serialize()}), 200
    else:
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
    
    db.session.commit()
    return jsonify({"success": True, "usuario": usuario.serialize()})

@app.route('/api/cambiar-password', methods=['POST'])
@login_required
def cambiar_password():
    data = request.get_json()
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_user.check_password(current_password):
        return jsonify({"success": False, "message": "Contraseña actual incorrecta"}), 400
    
    current_user.password = new_password
    db.session.commit()
    
    return jsonify({"success": True, "message": "Contraseña actualizada correctamente"})

# ----- RUTAS PARA ENTREVISTAS -----

@app.route('/api/entrevistas', methods=['GET'])
@login_required
def get_entrevistas():
    entrevistas = Entrevista.query.all()
    return jsonify([e.serialize() for e in entrevistas])

@app.route('/api/entrevistas/<int:id>', methods=['GET'])
@login_required
def get_entrevista(id):
    entrevista = Entrevista.query.get_or_404(id)
    return jsonify(entrevista.serialize())

@app.route('/api/entrevistas', methods=['POST'])
@login_required
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
@login_required
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
@login_required
def delete_entrevista(id):
    entrevista = Entrevista.query.get_or_404(id)
    db.session.delete(entrevista)
    db.session.commit()
    return jsonify({"success": True, "message": "Entrevista eliminada correctamente"})

# ----- RUTAS PARA ESTADÍSTICAS -----

@app.route('/api/estadisticas', methods=['GET'])
@login_required
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