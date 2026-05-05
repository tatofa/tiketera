'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { Store } from '@/lib/store';
import { Event, Ticket } from '@/lib/types';
import { dateTime } from '@/lib/format';

export default function TicketPage(){
 const {ticketId}=useParams<{ticketId:string}>(); const [ticket,setTicket]=useState<Ticket|null>(null); const [event,setEvent]=useState<Event|null>(null); const [qr,setQr]=useState('');
 useEffect(()=>{const t=Store.tickets().find(x=>x.id===ticketId)||null; setTicket(t); if(t) setEvent(Store.events().find(e=>e.id===t.eventId)||null); if(t) QRCode.toDataURL(t.qrToken).then(setQr);},[ticketId]);
 function download(){ if(!ticket||!event||!qr)return; const doc=new jsPDF(); doc.setFontSize(22); doc.text('Ticketera - Entrada digital',20,20); doc.setFontSize(14); doc.text(event.name,20,38); doc.text(`Titular: ${ticket.holderName}`,20,48); doc.text(`Estado: ${ticket.status}`,20,58); doc.addImage(qr,'PNG',20,70,70,70); doc.text(ticket.qrToken,20,150); doc.save(`entrada-${ticket.id}.pdf`); }
 if(!ticket) return <section className="container-page py-10">Entrada no encontrada.</section>;
 const d=event?.dates.find(x=>x.id===ticket.eventDateId); const tt=event?.ticketTypes.find(x=>x.id===ticket.ticketTypeId);
 return <section className="container-page py-10"><div className="card mx-auto max-w-2xl p-6"><h1 className="text-3xl font-black">Entrada digital</h1><p className="mt-2 text-slate-600">{event?.name}</p><div className="mt-6 grid gap-6 sm:grid-cols-[220px_1fr]"><div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">{qr && <img src={qr} alt="QR de entrada" className="w-full"/>}</div><div className="space-y-2 text-sm"><p><b>Titular:</b> {ticket.holderName}</p><p><b>Email:</b> {ticket.holderEmail}</p><p><b>Función:</b> {d?dateTime(d.start):'-'}</p><p><b>Tipo:</b> {tt?.name}</p><p><b>Estado:</b> {ticket.status}</p><p className="break-all"><b>Token:</b> {ticket.qrToken}</p><button className="btn-primary mt-4" onClick={download}>Descargar PDF</button></div></div></div></section>
}
