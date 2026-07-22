from typing import Optional

from pydantic import BaseModel, Field


class ProjectSummary(BaseModel):
    id: int
    name: str
    client_name: Optional[str] = None
    crm_platform: Optional[str] = None
    status: str = "draft"


class ProjectDetail(ProjectSummary):
    description: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    client_name: Optional[str] = Field(default=None, max_length=128)
    crm_platform: Optional[str] = Field(default=None, max_length=64)
    description: Optional[str] = Field(default=None, max_length=2000)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=128)
    client_name: Optional[str] = Field(default=None, max_length=128)
    crm_platform: Optional[str] = Field(default=None, max_length=64)
    description: Optional[str] = Field(default=None, max_length=2000)
    status: Optional[str] = Field(default=None, max_length=32)
