from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from flask_login import UserMixin
import bcrypt
import secrets
import os
import re

db = SQLAlchemy()

class Recluta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    estado = db.Column(db.String(20), nullable=False)
    puesto = db.Column(db.String(100), nullable=True)
    notas = db.Column(db.Text, nullable=True)
    foto_url = db.Column(db.String(255), nullable=True)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relación con entrevistas
    entrevistas = db.relationship('Entrevista', backref='recluta', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Recluta {self.nombre}>'

    def serialize(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'email': self.email,
            'telefono': self.telefono,
            'estado': self.estado,
            'puesto': self.puesto,
            'notas': self.notas,
            'foto_url': self.foto_url,
            'fecha_registro': self.fecha_registro.strftime('%Y-%m-%d %H:%M:%S') if self.fecha_registro else None,
            'last_updated': self.last_updated.strftime('%Y-%m-%d %H:%M:%S') if self.last_updated else None
        }

    @staticmethod
    def validate_email(email):
        """Valida que el correo electrónico tenga un formato correcto"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

class Usuario(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    nombre = db.Column(db.String(100), nullable=True)
    telefono = db.Column(db.String(20), nullable=True)
    foto_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    
    # Relación con sesiones
    sessions = db.relationship('UserSession', backref='usuario', lazy=True, cascade="all, delete-orphan")
    
    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=15)
    
    @property
    def password(self):
        raise AttributeError('La contraseña no es un atributo legible')
        
    @password.setter
    def password(self, password):
        # Validar longitud mínima
        if len(password) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
            
        # Genera un hash seguro de la contraseña
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        # Si la cuenta está bloqueada, verificar si ya pasó el tiempo
        if self.is_locked():
            return False
            
        # Verificar la contraseña
        is_valid = bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        
        # Actualizar contadores de intentos fallidos
        if is_valid:
            # Resetear contador si la contraseña es correcta
            self.failed_login_attempts = 0
            self.last_login = datetime.utcnow()
        else:
            # Incrementar contador de intentos fallidos
            self.failed_login_attempts += 1
            
            # Bloquear cuenta si se exceden los intentos
            if self.failed_login_attempts >= self.MAX_FAILED_ATTEMPTS:
                self.locked_until = datetime.utcnow() + self.LOCKOUT_DURATION
                
        db.session.commit()
        return is_valid
    
    def is_locked(self):
        """Verifica si la cuenta está bloqueada"""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
            
        # Si el tiempo de bloqueo ya pasó, desbloquear la cuenta
        if self.locked_until:
            self.locked_until = None
            self.failed_login_attempts = 0
            db.session.commit()
            
        return False
    
    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "nombre": self.nombre,
            "telefono": self.telefono,
            "foto_url": self.foto_url,
            "is_admin": self.is_admin,
            "created_at": self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            "last_login": self.last_login.strftime('%Y-%m-%d %H:%M:%S') if self.last_login else None
        }
    
    def __repr__(self):
        return f'<Usuario {self.email}>'

class UserSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.String(255), nullable=True)
    session_token = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_valid = db.Column(db.Boolean, default=True)
    
    @property
    def is_expired(self):
        return datetime.utcnow() > self.expires_at if self.expires_at else True
    
    def update_activity(self):
        """Actualiza la marca de tiempo de la última actividad"""
        self.last_activity = datetime.utcnow()
        db.session.commit()
    
    def invalidate(self):
        """Invalida la sesión"""
        self.is_valid = False
        db.session.commit()
    
    @staticmethod
    def cleanup_expired_sessions():
        """Elimina sesiones expiradas de la base de datos"""
        UserSession.query.filter(
            (UserSession.expires_at < datetime.utcnow()) | 
            (UserSession.is_valid == False)
        ).delete()
        db.session.commit()
    
    def __repr__(self):
        return f'<UserSession {self.usuario_id}>'

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
    codigo_acceso = db.Column(db.String(20), nullable=True)  # Código único para acceso a la entrevista
    recordatorio_enviado = db.Column(db.Boolean, default=False)  # Flag para controlar envío de recordatorios
    
    def __init__(self, **kwargs):
        super(Entrevista, self).__init__(**kwargs)
        # Generar código de acceso aleatorio para entrevistas virtuales
        if kwargs.get('tipo') == 'virtual':
            self.codigo_acceso = secrets.token_urlsafe(8)
    
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
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'codigo_acceso': self.codigo_acceso if self.tipo == 'virtual' else None
        }
    
    def __repr__(self):
        return f'<Entrevista {self.id}>'

# Modelo para auditoría
class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    action = db.Column(db.String(255), nullable=False)
    entity_type = db.Column(db.String(50), nullable=True)
    entity_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)
    
    @staticmethod
    def log(action, user_id=None, ip_address=None, entity_type=None, entity_id=None, details=None):
        """Registra una acción en el log de auditoría"""
        log_entry = AuditLog(
            user_id=user_id,
            ip_address=ip_address,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details
        )
        db.session.add(log_entry)
        db.session.commit()
    
    def __repr__(self):
        return f'<AuditLog {self.action}>'