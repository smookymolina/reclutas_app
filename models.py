from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Recluta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100))
    email = db.Column(db.String(100))
    telefono = db.Column(db.String(20))
    estado = db.Column(db.String(20))

    def serialize(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'email': self.email,
            'telefono': self.telefono,
            'estado': self.estado
        }

class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    nombre = db.Column(db.String(100))  # Agregamos la columna nombre
    telefono = db.Column(db.String(20))  # Agregamos la columna telefono
    foto_url = db.Column(db.String(200))  # Agregamos la columna foto_url
    fecha_registro = db.Column(db.DateTime, default=db.func.current_timestamp())  # Agregamos fecha de registro

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "nombre": self.nombre,
            "telefono": self.telefono,
            "foto_url": self.foto_url
        }

class Entrevista(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    recluta_id = db.Column(db.Integer, db.ForeignKey('recluta.id'), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.String(10), nullable=False)  # formato "HH:MM"
    duracion = db.Column(db.Integer, default=60)  # en minutos
    tipo = db.Column(db.String(20), default='presencial')  # presencial, virtual, telefónica
    ubicacion = db.Column(db.String(200))  # dirección o link
    notas = db.Column(db.Text)
    completada = db.Column(db.Boolean, default=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.now)

    def serialize(self):
        return {
            'id': self.id,
            'recluta_id': self.recluta_id,
            'recluta_nombre': self.recluta.nombre if self.recluta else None,
            'fecha': self.fecha.strftime('%Y-%m-%d'),
            'hora': self.hora,
            'duracion': self.duracion,
            'tipo': self.tipo,
            'ubicacion': self.ubicacion,
            'notas': self.notas,
            'completada': self.completada
        }