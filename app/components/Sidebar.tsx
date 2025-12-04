"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <aside className="w-64 border-r border-gray-200 bg-white p-6 flex flex-col gap-8 h-screen sticky top-0">
            <div className="flex items-center gap-3 px-2">
                <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center font-bold text-white">
                    AI
                </div>
                <span className="text-lg font-semibold tracking-tight text-gray-900">Chroma Toolkit</span>
            </div>

            <nav className="flex flex-col gap-1">
                <Link
                    href="/"
                    className={`flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive('/')
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                >
                    <svg className={`h-4 w-4 ${isActive('/') ? 'text-gray-900' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Dashboard
                </Link>
                <Link
                    href="/datasets"
                    className={`flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive('/datasets')
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                >
                    <svg className={`h-4 w-4 ${isActive('/datasets') ? 'text-gray-900' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Datasets
                </Link>
                <Link
                    href="/training"
                    className={`flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive('/training')
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                >
                    <svg className={`h-4 w-4 ${isActive('/training') ? 'text-gray-900' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Training
                </Link>
                <a href="#" className="flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                </a>
            </nav>
        </aside>
    );
}
