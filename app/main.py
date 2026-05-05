from datetime import datetime, timedelta, timezone
from enum import Enum
from io import StringIO
from typing import Optional
import csv

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import PlainTextResponse
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlmodel import Field, Session, SQLModel, create_engine, select

app = FastAPI(title="CHNG Ticketera API", version="0.2.0")
engine = create_engine("sqlite:///ticketera.db")
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = "dev-secret-change"
HOLD_MINUTES = 10


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


class PromoCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True)
    discount_percent: float
    active: bool = True
    expires_at: datetime


class CartReservation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    ticket_type_id: int = Field(foreign_key="tickettype.id", index=True)
    quantity: int
    expires_at: datetime


class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    subtotal: float
    discount_amount: float = 0
    total: float
    status: str = "paid"
    payment_method: str = "card"
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


class CartIn(BaseModel):
    ticket_type_id: int
    quantity: int


class CheckoutIn(BaseModel):
    reservation_id: int
    payment_method: str = "card"
    promo_code: Optional[str] = None


class PromoIn(BaseModel):
    code: str
    discount_percent: float
    expires_at: datetime


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


def release_expired_holds(session: Session):
    now = datetime.now(timezone.utc)
    expired = session.exec(select(CartReservation).where(CartReservation.expires_at < now)).all()
    for r in expired:
        tt = session.get(TicketType, r.ticket_type_id)
        if tt:
            tt.stock += r.quantity
            session.add(tt)
        session.delete(r)
    session.commit()


@app.on_event("startup")
def startup():
    create_db()


@app.get("/health")
def health():
    return {"ok": True, "version": "0.2.0"}


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


@app.post("/promos")
def create_promo(data: PromoIn, _: User = Depends(require_roles(Role.admin, Role.organizer))):
    with Session(engine) as session:
        promo = PromoCode(**data.model_dump())
        session.add(promo)
        session.commit()
        session.refresh(promo)
        return promo


@app.post("/cart/reserve")
def reserve_cart(data: CartIn, user: User = Depends(require_roles(Role.buyer, Role.admin))):
    now = datetime.now(timezone.utc)
    with Session(engine) as session:
        release_expired_holds(session)
        tt = session.get(TicketType, data.ticket_type_id)
        if not tt:
            raise HTTPException(status_code=404, detail="ticket type not found")
        if not (tt.sales_start <= now <= tt.sales_end):
            raise HTTPException(status_code=400, detail="sales window closed")
        if tt.stock < data.quantity:
            raise HTTPException(status_code=400, detail="insufficient stock")
        tt.stock -= data.quantity
        hold = CartReservation(
            user_id=user.id,
            ticket_type_id=data.ticket_type_id,
            quantity=data.quantity,
            expires_at=now + timedelta(minutes=HOLD_MINUTES),
        )
        session.add(hold)
        session.add(tt)
        session.commit()
        session.refresh(hold)
        return {"reservation_id": hold.id, "expires_at": hold.expires_at}


@app.post("/checkout")
def checkout(data: CheckoutIn, user: User = Depends(require_roles(Role.buyer, Role.admin))):
    now = datetime.now(timezone.utc)
    with Session(engine) as session:
        release_expired_holds(session)
        hold = session.get(CartReservation, data.reservation_id)
        if not hold or hold.user_id != user.id:
            raise HTTPException(status_code=404, detail="reservation not found")

        tt = session.get(TicketType, hold.ticket_type_id)
        subtotal = round(tt.price * hold.quantity, 2)
        discount_amount = 0.0

        if data.promo_code:
            promo = session.exec(select(PromoCode).where(PromoCode.code == data.promo_code)).first()
            if not promo or not promo.active or promo.expires_at < now:
                raise HTTPException(status_code=400, detail="invalid promo")
            discount_amount = round(subtotal * (promo.discount_percent / 100), 2)

        total = max(round(subtotal - discount_amount, 2), 0)
        order = Order(
            user_id=user.id,
            subtotal=subtotal,
            discount_amount=discount_amount,
            total=total,
            payment_method=data.payment_method,
        )
        session.add(order)
        session.commit()
        session.refresh(order)

        tickets = []
        for i in range(hold.quantity):
            qr = f"TK-{order.id}-{tt.id}-{i}-{int(now.timestamp())}"
            ticket = Ticket(order_id=order.id, ticket_type_id=tt.id, qr_code=qr)
            session.add(ticket)
            tickets.append(qr)

        session.delete(hold)
        session.commit()
        return {"order_id": order.id, "total": total, "subtotal": subtotal, "discount": discount_amount, "tickets": tickets}


@app.post("/orders/{order_id}/refund")
def refund_order(order_id: int, _: User = Depends(require_roles(Role.admin, Role.organizer))):
    with Session(engine) as session:
        order = session.get(Order, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="order not found")
        if order.status == "refunded":
            raise HTTPException(status_code=400, detail="already refunded")
        tickets = session.exec(select(Ticket).where(Ticket.order_id == order_id)).all()
        for t in tickets:
            tt = session.get(TicketType, t.ticket_type_id)
            if tt:
                tt.stock += 1
                session.add(tt)
        order.status = "refunded"
        session.add(order)
        session.commit()
        return {"ok": True, "order_id": order_id, "status": "refunded"}


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
        return session.exec(select(Order).where(Order.user_id == user.id)).all()


@app.get("/admin/reports/sales")
def sales_report(
    event_id: Optional[int] = Query(default=None),
    as_csv: bool = False,
    _: User = Depends(require_roles(Role.admin, Role.organizer)),
):
    with Session(engine) as session:
        orders = session.exec(select(Order).where(Order.status == "paid")).all()
        rows = []
        for o in orders:
            tickets = session.exec(select(Ticket).where(Ticket.order_id == o.id)).all()
            if not tickets:
                continue
            tt = session.get(TicketType, tickets[0].ticket_type_id)
            if event_id and tt and tt.event_id != event_id:
                continue
            rows.append({"order_id": o.id, "total": o.total, "created_at": o.created_at.isoformat(), "payment_method": o.payment_method})

        if as_csv:
            buffer = StringIO()
            writer = csv.DictWriter(buffer, fieldnames=["order_id", "total", "created_at", "payment_method"])
            writer.writeheader()
            writer.writerows(rows)
            return PlainTextResponse(buffer.getvalue(), media_type="text/csv")

        return rows
