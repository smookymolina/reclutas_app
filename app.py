from flask import Flask, render_template, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from models import db, Recluta, Usuario
from PIL import Image, ImageDraw, ImageFont
import io
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Crear la base de datos y un usuario de prueba si no existe
with app.app_context():
    db.create_all()
    if not Usuario.query.filter_by(email='admin@example.com').first():
        usuario = Usuario(email='admin@example.com', password='admin')
        db.session.add(usuario)
        db.session.commit()

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
    # Aquí podrías añadir una fuente si la tienes disponible
    # font = ImageFont.truetype("arial.ttf", 14)
    # draw.text((width//2-20, height//2-10), text, fill=(100, 100, 100), font=font)
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

# Rutas existentes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/reclutas', methods=['GET'])
def get_reclutas():
    reclutas = Recluta.query.all()
    return jsonify([r.serialize() for r in reclutas])

@app.route('/api/reclutas', methods=['POST'])
def add_recluta():
    data = request.get_json()
    nuevo = Recluta(
        nombre=data['nombre'],
        email=data['email'],
        telefono=data['telefono'],
        estado=data['estado']
    )
    db.session.add(nuevo)
    db.session.commit()
    return jsonify(nuevo.serialize()), 201

@app.route('/api/login', methods=['POST'])
def login_usuario():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    usuario = Usuario.query.filter_by(email=email, password=password).first()

    if usuario:
        return jsonify({"success": True, "usuario": usuario.serialize()}), 200
    else:
        return jsonify({"success": False, "message": "Credenciales incorrectas"}), 401

if __name__ == '__main__':
    app.run(debug=True)