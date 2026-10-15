import type { SVGProps } from 'react';

export function ChickenLogo(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 32 32" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-brand-logo="chicken" {...props}><path d="M19 6c-2-3-1-5 1-5 1 0 1 2 1 2 1-2 3-1 3 1v2"/><path d="M7 15 2 11l1 8c0 5 4 8 10 8 6 0 10-4 10-9v-3c3-1 5-3 5-6 0-3-2-5-5-5s-5 2-5 5v3c-4-1-8 0-11 3Z"/><path d="m28 9 3 2-4 1M25 14c2 3-1 5-2 2M9 17c1 4 5 5 8 1M10 27v3h-3m10-3v3h3"/><circle cx="24" cy="8" r=".8" fill="currentColor" stroke="none"/></svg>;
}
