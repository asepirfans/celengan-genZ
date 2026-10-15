'use client';

import { useLinkStatus } from 'next/link';

export function NavigationPending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" data-pending={pending || undefined} className="navigation-pending" />;
}
