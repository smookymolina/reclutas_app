from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class Recluta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    estado = db.Column(db.String(20), default='En proceso')
    puesto = db.Column(db.String(100))
    notas = db.Column(db.Text)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    foto_url = db.Column(db.String(200), default='default_profile.jpg')
    
    # Relación con las entrevistas
    entrevistas = db.relationship('Entrevista', backref='recluta', lazy=True, cascade="all, delete-orphan")

    def serialize(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'email': self.email,
            'telefono': self.telefono,
            'estado': self.estado,
            'puesto': self.puesto,
            'notas': self.notas,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None,
            'foto_url': self.foto_url
        }

class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    nombre = db.Column(db.String(100))
    telefono = db.Column(db.String(20))
    foto_url = db.Column(db.String(200), default='default_profile.jpg')
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    
    @property
    def password(self):
        raise AttributeError('La contraseña no es un atributo legible')
    
    @password.setter
    def password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def verificar_password(self, password):
        return check_password_hash(self.password_hash, password)
        return self.password_hash == password

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "nombre": self.nombre,
            "telefono": self.telefono,
            "foto_url": self.foto_url,
            "fecha_registro": self.fecha_registro.isoformat() if self.fecha_registro else None
        }

class UserSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    session_token = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    is_valid = db.Column(db.Boolean, default=True)
    
    @property
    def is_expired(self):
        return datetime.utcnow() > self.expires_at if self.expires_at else False

class Entrevista(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    recluta_id = db.Column(db.Integer, db.ForeignKey('recluta.id'), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.String(10), nullable=False)  # Formato "HH:MM"
    duracion = db.Column(db.Integer, default=60)  # Duración en minutos
    tipo = db.Column(db.String(20), default='presencial')  # presencial, virtual, telefonica
    ubicacion = db.Column(db.String(200))
    notas = db.Column(db.Text)
    estado = db.Column(db.String(20), default='pendiente')  # pendiente, completada, cancelada
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    
    def serialize(self):
        return {
            'id': self.id,
            'recluta_id': self.recluta_id,
            'recluta_nombre': self.recluta.nombre if self.recluta else None,
            'fecha': self.fecha.isoformat() if self.fecha else None,
            'hora': self.hora,
            'duracion': self.duracion,
            'tipo': self.tipo,
            'ubicacion': self.ubicacion,
            'notas': self.notas,
            'estado': self.estado,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None
        }