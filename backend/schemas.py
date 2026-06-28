from pydantic import BaseModel


class UserSignup(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class PlantCreate(BaseModel):
    plant_name: str
    lat: float
    lon: float
    capacity_kw: float
    tilt: float
    azimuth: float