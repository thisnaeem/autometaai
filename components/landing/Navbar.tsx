'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon, Cancel01Icon, SparklesIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '/pricing', label: 'Pricing' }
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-6 lg:px-8",
        isScrolled ? "py-3" : "py-6"
      )}
    >
      <div className={cn(
        "max-w-7xl mx-auto transition-all duration-300 rounded-[24px] border flex items-center justify-between px-6 h-16 sm:h-20",
        isScrolled
          ? "bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          : "bg-transparent border-transparent"
      )}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <HugeiconsIcon icon={SparklesIcon} size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            csvout
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/signin" className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link href="/signup">
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98] flex items-center gap-2"
            >
              Get Started
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-slate-700 hover:bg-slate-100/50 rounded-xl transition-colors"
        >
          {isMobileMenuOpen ? <HugeiconsIcon icon={Cancel01Icon} size={24} /> : <HugeiconsIcon icon={Menu01Icon} size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-4 right-4 mt-4 md:hidden bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-lg font-bold text-slate-700 hover:text-blue-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
                <Link href="/signin" onClick={() => setIsMobileMenuOpen(false)} className="text-center py-4 font-bold text-slate-700">
                  Sign In
                </Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                  >
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
