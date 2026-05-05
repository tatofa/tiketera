'use client';
import { useEffect } from 'react';
import { seedDemo } from '@/lib/store';

export default function BootstrapDemo() {
  useEffect(() => { seedDemo(); }, []);
  return null;
}
