'use client';
import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScanner({ onResult }: { onResult: (token: string) => void }) {
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render((decoded) => onResult(decoded), () => {});
    return () => { scanner.clear().catch(() => undefined); };
  }, [onResult]);
  return <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200"><div id="qr-reader" /></div>;
}
