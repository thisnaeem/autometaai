import React from 'react';
import Link from 'next/link';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-60 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100 rounded-full blur-[120px] opacity-60 animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Header */}
            <header className="relative z-10 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                        <span className="text-white font-bold text-xl">C</span>
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        csvout
                    </span>
                </Link>
                <div className="hidden sm:flex gap-6 text-sm font-medium text-slate-500">
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4 relative z-10">
                <div className="w-full max-w-[440px] animate-in fade-in zoom-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 p-6 text-center text-sm text-slate-400">
                <p>&copy; {new Date().getFullYear()} csvout. All rights reserved.</p>
            </footer>
        </div>
    );
}
