'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { HugeiconsIcon } from '@hugeicons/react';
import { TextIcon, Clock01Icon, ShoppingBasket01Icon, Logout01Icon, Image02Icon, VideoIcon, FileEditIcon, Invoice01Icon, FlashIcon, PaintBoardIcon, Settings02Icon } from '@hugeicons/core-free-icons';

const Sidebar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navigation = [
    {
      name: 'Describe',
      href: '/describe',
      icon: <HugeiconsIcon icon={TextIcon} size={20} strokeWidth={2} />
    },
    {
      name: 'BG Remover',
      href: '/bg-remover',
      icon: <HugeiconsIcon icon={Image02Icon} size={20} strokeWidth={2} />
    },
    {
      name: 'Runway Prompt',
      href: '/runway-prompt',
      icon: <HugeiconsIcon icon={VideoIcon} size={20} strokeWidth={2} />
    },
    {
      name: 'Metadata Gen',
      href: '/metadata-gen',
      icon: <HugeiconsIcon icon={FileEditIcon} size={20} strokeWidth={2} />
    },
    {
      name: 'History',
      href: '/history',
      icon: <HugeiconsIcon icon={Clock01Icon} size={20} strokeWidth={2} />
    },
    {
      name: 'Buy Credits',
      href: '/buy-credits',
      icon: <HugeiconsIcon icon={ShoppingBasket01Icon} size={20} strokeWidth={2} />
    },
    {
      name: 'Payment Requests',
      href: '/payment-requests',
      icon: <HugeiconsIcon icon={Invoice01Icon} size={20} strokeWidth={2} />
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: <HugeiconsIcon icon={Settings02Icon} size={20} strokeWidth={2} />
    }
  ];

  return (
    <div className="flex flex-col w-64 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 h-full shadow-sm">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          csvout
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-md hover:scale-[1.02]'
              )}
            >
              <div className={cn(
                'transition-transform duration-200',
                isActive ? 'scale-110' : 'group-hover:scale-110'
              )}>
                {item.icon}
              </div>
              <span className="ml-3 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 space-y-4 bg-white/50 backdrop-blur-sm">
        {/* User Info */}
        <div className="flex items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white text-sm font-bold">
              {session?.user?.name?.charAt(0)?.toUpperCase() || session?.user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {session?.user?.email || ''}
            </p>
            {/* Credits Display - Side by Side */}
            <div className="mt-2 flex items-center gap-3">
              {/* General Credits */}
              {(session?.user as any)?.credits !== undefined && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200">
                  <HugeiconsIcon icon={FlashIcon} size={14} className="text-blue-600" />
                  <p className="text-xs text-blue-700 font-bold">
                    {(session?.user as any).credits}
                  </p>
                </div>
              )}
              {/* BG Removal Credits */}
              {(session?.user as any)?.bgRemovalCredits !== undefined && (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-lg border border-purple-200">
                    <HugeiconsIcon icon={PaintBoardIcon} size={14} className="text-purple-600" />
                    <p className="text-xs text-purple-700 font-bold">
                      {(session?.user as any).bgRemovalCredits}
                    </p>
                  </div>
                  {(session?.user as any)?.bgCreditsExpiresAt && (
                    <p className="text-[10px] text-slate-500 px-1">
                      Exp: {new Date((session?.user as any).bgCreditsExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/signin' } } })}
          className="w-full flex items-center justify-center py-2.5 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all duration-200 rounded-xl font-medium"
        >
          <HugeiconsIcon icon={Logout01Icon} size={16} strokeWidth={2} className="mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;