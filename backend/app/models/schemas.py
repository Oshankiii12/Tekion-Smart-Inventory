from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class UserQuery(BaseModel):
    user_description: str
    constraints: Optional[dict] = None


class Persona(BaseModel):
    label: str
    primary_needs: List[str]
    secondary_needs: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)


class CarSpecs(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    raw_name: Optional[str] = None
    year: Optional[int] = None
    seats: Optional[int] = None
    km_driven: Optional[int] = None
    price: Optional[int] = None
    price_band: Optional[str] = None
    fuel_type: Optional[str] = None
    drivetrain: Optional[str] = None
    transmission: Optional[str] = None
    tags: Optional[str] = None


class VehicleMatch(BaseModel):
    id: str
    name: str
    score: int
    reasons: List[str]
    image_url: Optional[str] = None
    price_band: Optional[str] = None
    body_type: Optional[str] = None
    specs: Optional[CarSpecs] = None


class RecommendationResponse(BaseModel):
    persona: Persona
    matches: List[VehicleMatch]
