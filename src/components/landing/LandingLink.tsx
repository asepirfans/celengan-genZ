'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useApp } from '@/lib/store';
import type { ReactNode } from 'react';

export function LandingLink({children,className,register=false}:{children:ReactNode;className?:string;register?:boolean}){
 const {isAuthenticated}=useApp();
 return <Link href={isAuthenticated?'/dashboard':register?'/register':'/login'} className={className}>{isAuthenticated?<>Buka dashboard <ArrowUpRight size={17}/></>:children}</Link>;
}
