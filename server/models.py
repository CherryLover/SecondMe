"""Pydantic 数据模型"""
from typing import Optional
from pydantic import BaseModel


# ==================== Auth ====================

class UserRegister(BaseModel):
    username: str
    password: str
    invite_code: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    created_at: str
    last_login_at: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str


# ==================== Invite Code ====================

class InviteCodeCreate(BaseModel):
    max_uses: int = 1
    expires_days: Optional[int] = None


class InviteCodeResponse(BaseModel):
    id: str
    code: str
    max_uses: int
    used_count: int
    expires_at: Optional[str] = None
    created_at: str


class InviteCodesResponse(BaseModel):
    invite_codes: list[InviteCodeResponse]


# ==================== User Management ====================

class UsersResponse(BaseModel):
    users: list[UserResponse]
    total: int
    page: int
    page_size: int


# ==================== Topic ====================

class TopicCreate(BaseModel):
    pass


class TopicUpdate(BaseModel):
    title: str


class TopicResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class TopicsResponse(BaseModel):
    topics: list[TopicResponse]


# ==================== Message ====================

class MessageCreate(BaseModel):
    content: str
    provider_id: Optional[str] = None
    model: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    topic_id: str
    role: str
    content: str
    created_at: str


class MessagesResponse(BaseModel):
    messages: list[MessageResponse]


class SendMessageResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
    topic_title_updated: bool
    memories_used: list[str]


# ==================== Provider ====================

class ProviderCreate(BaseModel):
    name: str
    base_url: str
    api_key: str
    enabled: bool = True


class ProviderUpdate(BaseModel):
    name: str
    base_url: str
    api_key: Optional[str] = None
    enabled: bool = True


class ProviderResponse(BaseModel):
    id: str
    name: str
    base_url: str
    enabled: bool
    created_at: str


class ProvidersResponse(BaseModel):
    providers: list[ProviderResponse]


class ModelInfo(BaseModel):
    id: str
    name: str


class ModelsResponse(BaseModel):
    models: list[ModelInfo]


# ==================== Memory ====================

class MemoryCreate(BaseModel):
    content: str


class MemoryUpdate(BaseModel):
    content: str


class MemoryResponse(BaseModel):
    id: str
    content: str
    source: str
    source_topic_id: Optional[str]
    source_message_id: Optional[str]
    use_count: int
    created_at: str
    last_used_at: Optional[str]
    memory_type: Optional[str] = "chat"


class MemoryUsageRecord(BaseModel):
    topic_id: str
    topic_title: str
    message_id: str
    used_at: str


class MemoryDetailResponse(MemoryResponse):
    usage_records: list[MemoryUsageRecord]


class MemoriesResponse(BaseModel):
    memories: list[MemoryResponse]
    total: int
    page: int
    page_size: int


# ==================== Flowmo ====================

class FlowmoCreate(BaseModel):
    content: str


class FlowmoResponse(BaseModel):
    id: str
    content: str
    source: str
    topic_id: Optional[str]
    message_id: Optional[str]
    created_at: str


class FlowmosResponse(BaseModel):
    flowmos: list[FlowmoResponse]
    total: int
    page: int
    page_size: int


class FlowmoTopicResponse(BaseModel):
    id: str
    title: str
    is_flowmo: bool
    created_at: str
    updated_at: str


# ==================== Settings ====================

class SettingsResponse(BaseModel):
    default_chat_provider_id: Optional[str] = None
    default_chat_model: Optional[str] = None
    embedding_provider_id: Optional[str] = None
    embedding_model: Optional[str] = None
    memory_top_k: int = 5
    memory_silent_minutes: int = 2
    memory_extraction_enabled: bool = True
    memory_context_messages: int = 6


class SettingsUpdate(BaseModel):
    default_chat_provider_id: Optional[str] = None
    default_chat_model: Optional[str] = None
    embedding_provider_id: Optional[str] = None
    embedding_model: Optional[str] = None
    memory_top_k: Optional[int] = None
    memory_silent_minutes: Optional[int] = None
    memory_extraction_enabled: Optional[bool] = None
    memory_context_messages: Optional[int] = None


# ==================== Common ====================

class SuccessResponse(BaseModel):
    success: bool = True


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


# ==================== TODO ====================

class TodoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: int = 3
    group_name: Optional[str] = None
    deadline: Optional[str] = None
    parent_id: Optional[str] = None


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    group_name: Optional[str] = None
    deadline: Optional[str] = None
    parent_id: Optional[str] = None


class TodoResponse(BaseModel):
    id: str
    user_id: str
    parent_id: Optional[str]
    title: str
    description: Optional[str]
    status: str
    priority: int
    group_name: Optional[str]
    deadline: Optional[str]
    completed_at: Optional[str]
    created_at: str
    updated_at: str
    children: list['TodoResponse'] = []


class TodosResponse(BaseModel):
    todos: list[TodoResponse]


class TodoGroupResponse(BaseModel):
    name: str
    count: int


class TodoGroupsResponse(BaseModel):
    groups: list[TodoGroupResponse]


class BatchUpdateRequest(BaseModel):
    ids: list[str]
    status: str


class BatchUpdateResponse(BaseModel):
    updated_count: int
    todos: list[TodoResponse]


# ==================== API Token ====================

class ApiTokenCreate(BaseModel):
    name: str


class ApiTokenResponse(BaseModel):
    id: str
    name: str
    token: Optional[str] = None  # 只在创建时返回
    token_preview: str
    created_at: str
    last_used_at: Optional[str]


class ApiTokensResponse(BaseModel):
    tokens: list[ApiTokenResponse]
