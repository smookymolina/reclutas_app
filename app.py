from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from models import db, Recluta, Usuario  # ✅ Incluye el modelo Usuario

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

# Rutas
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
