'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Refreshes the page every few seconds while an audit is running. */
export default function AutoRefresh({ on }: { on: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [on, router]);
  return null;
}
