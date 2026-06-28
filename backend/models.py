from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Float
from sqlalchemy import ForeignKey
from sqlalchemy import DateTime
from sqlalchemy.sql import func
from sqlalchemy import JSON


from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)
    hashed_password = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Plant(Base):
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    plant_name = Column(String)

    lat = Column(Float)
    lon = Column(Float)

    capacity_kw = Column(Float)
    tilt = Column(Float)
    azimuth = Column(Float)


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)

    plant_id = Column(Integer, ForeignKey("plants.id"))

    predicted_energy = Column(Float)
    actual_energy = Column(Float)
    performance_ratio = Column(Float)
    forecast_7_days = Column(JSON)
    monthly_energy = Column(JSON)
    annual_energy = Column(Float)

    created_at = Column(DateTime(timezone=True), server_default=func.now())