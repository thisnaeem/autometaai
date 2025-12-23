'use client';

import React from 'react';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { SparklesIcon, TwitterIcon, Github01Icon, Linkedin01Icon, Mail01Icon } from '@hugeicons/core-free-icons';

export default function Footer() {
  const footerLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Dashboard', href: '/app' },
      { label: 'Describe', href: '/describe' }
    ],
    resources: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Tutorials', href: '#' },
      { label: 'Blog', href: '#' }
    ],
    company: [
      { label: 'About Us', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' }
    ]
  };

  const socialLinks = [
    { icon: TwitterIcon, href: '#', label: 'Twitter' },
    { icon: Github01Icon, href: '#', label: 'GitHub' },
    { icon: Linkedin01Icon, href: '#', label: 'LinkedIn' },
    { icon: Mail01Icon, href: '#', label: 'Email' }
  ];

  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                <HugeiconsIcon icon={SparklesIcon} size={24} className="text-white" />
              </div>
              <span className="text-2xl font-bold text-white">csvout</span>
            </Link>
            <p className="text-slate-400 mb-6 max-w-sm">
              AI-powered metadata generation and image-to-prompt conversion for stock platforms and AI tools.
              Optimize your content workflow today.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors duration-300 group"
                >
                  <HugeiconsIcon icon={social.icon} size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-slate-400 hover:text-white transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-slate-400 hover:text-white transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} csvout. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/signin" className="text-slate-400 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="text-slate-400 hover:text-white transition-colors">
                Sign Up
              </Link>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
