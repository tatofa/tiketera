from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlmodel import Field, Session, SQLModel, create_engine, select

app = FastAPI(title="CHNG Ticketera API", version="0.1.0")
engine = create_engine("sqlite:///ticketera.db")
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = "dev-secret-change"


class Role(str, Enum):
    admin = "admin"
    organizer = "organizer"
    validator = "validator"
    buyer = "buyer"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: EmailStr = Field(index=True, unique=True)
    password_hash: str
    role: Role = Field(default=Role.buyer)


class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    venue: str
    starts_at: datetime
    published: bool = False
    max_capacity: int


class TicketType(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id", index=True)
    name: str
    price: float
    stock: int
    sales_start: datetime
    sales_end: datetime


class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    total: float
    status: str = "paid"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Ticket(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", index=True)
    ticket_type_id: int = Field(foreign_key="tickettype.id", index=True)
    qr_code: str = Field(index=True, unique=True)
    used: bool = False


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    role: Role = Role.buyer


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class EventIn(BaseModel):
    name: str
    description: str = ""
    venue: str
    starts_at: datetime
    max_capacity: int


class TicketTypeIn(BaseModel):
    name: str
    price: float
    stock: int
    sales_start: datetime
    sales_end: datetime


class CheckoutIn(BaseModel):
    ticket_type_id: int
    quantity: int


def create_db():
    SQLModel.metadata.create_all(engine)


def mk_token(user: User) -> str:
    return jwt.encode({"sub": user.id, "role": user.role.value}, SECRET, algorithm="HS256")


def current_user(authorization: Optional[str] = Header(None)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    with Session(engine) as session:
        user = session.get(User, payload.get("sub"))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user


def require_roles(*roles: Role):
    def dep(user: User = Depends(current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return dep


@app.on_event("startup")
def startup():
    create_db()


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/auth/register")
def register(data: RegisterIn):
    with Session(engine) as session:
        exists = session.exec(select(User).where(User.email == data.email)).first()
        if exists:
            raise HTTPException(status_code=400, detail="email already exists")
        user = User(email=data.email, password_hash=pwd.hash(data.password), role=data.role)
        session.add(user)
        session.commit()
        session.refresh(user)
        return {"id": user.id, "email": user.email, "role": user.role}


@app.post("/auth/login")
def login(data: LoginIn):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == data.email)).first()
        if not user or not pwd.verify(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="invalid credentials")
        return {"access_token": mk_token(user)}


@app.post("/events")
def create_event(data: EventIn, _: User = Depends(require_roles(Role.admin, Role.organizer))):
    with Session(engine) as session:
        event = Event(**data.model_dump())
        session.add(event)
        session.commit()
        session.refresh(event)
        return event


@app.get("/events")
def list_events(published_only: bool = True):
    with Session(engine) as session:
        q = select(Event)
        if published_only:
            q = q.where(Event.published == True)
        return session.exec(q).all()


@app.patch("/events/{event_id}/publish")
def publish_event(event_id: int, published: bool, _: User = Depends(require_roles(Role.admin, Role.organizer))):
    with Session(engine) as session:
        event = session.get(Event, event_id)
        if not event:
            raise HTTPException(status_code=404, detail="event not found")
        event.published = published
        session.add(event)
        session.commit()
        session.refresh(event)
        return event


@app.post("/events/{event_id}/ticket-types")
def create_ticket_type(event_id: int, data: TicketTypeIn, _: User = Depends(require_roles(Role.admin, Role.organizer))):
    with Session(engine) as session:
        event = session.get(Event, event_id)
        if not event:
            raise HTTPException(status_code=404, detail="event not found")
        tt = TicketType(event_id=event_id, **data.model_dump())
        session.add(tt)
        session.commit()
        session.refresh(tt)
        return tt


@app.post("/checkout")
def checkout(data: CheckoutIn, user: User = Depends(require_roles(Role.buyer, Role.admin))):
    now = datetime.now(timezone.utc)
    with Session(engine) as session:
        tt = session.get(TicketType, data.ticket_type_id)
        if not tt:
            raise HTTPException(status_code=404, detail="ticket type not found")
        if not (tt.sales_start <= now <= tt.sales_end):
            raise HTTPException(status_code=400, detail="sales window closed")
        if tt.stock < data.quantity:
            raise HTTPException(status_code=400, detail="insufficient stock")

        tt.stock -= data.quantity
        total = round(tt.price * data.quantity, 2)
        order = Order(user_id=user.id, total=total)
        session.add(order)
        session.commit()
        session.refresh(order)

        tickets = []
        for i in range(data.quantity):
            qr = f"TK-{order.id}-{tt.id}-{i}-{int(now.timestamp())}"
            ticket = Ticket(order_id=order.id, ticket_type_id=tt.id, qr_code=qr)
            session.add(ticket)
            tickets.append(qr)

        session.add(tt)
        session.commit()
        return {"order_id": order.id, "total": total, "tickets": tickets}


@app.post("/validate/{qr_code}")
def validate_ticket(qr_code: str, _: User = Depends(require_roles(Role.validator, Role.admin))):
    with Session(engine) as session:
        ticket = session.exec(select(Ticket).where(Ticket.qr_code == qr_code)).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="ticket not found")
        if ticket.used:
            raise HTTPException(status_code=409, detail="ticket already used")
        ticket.used = True
        session.add(ticket)
        session.commit()
        return {"valid": True, "ticket_id": ticket.id}


@app.get("/me/orders")
def my_orders(user: User = Depends(current_user)):
    with Session(engine) as session:
        orders = session.exec(select(Order).where(Order.user_id == user.id)).all()
        return orders
