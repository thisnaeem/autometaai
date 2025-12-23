'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CreditCard, Shield, Zap, Info } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, PackageIcon, FlashIcon, CrownIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

type LocationType = 'pakistan' | 'international';

interface CreditPackage {
  name: string;
  credits: number;
  price: string | number;
  priceInPKR?: number;
  features: string[];
  popular?: boolean;
  qrCode?: string;
  currency?: string;
  icon?: any;
  gradient?: string;
}

const pakistanGeneralPackages: CreditPackage[] = [
  {
    name: 'Starter',
    credits: 100,
    price: 300,
    features: [
      '100 AI generations',
      'All tools access',
      'Standard processing',
      'Email support'
    ]
  },
  {
    name: 'Pro',
    credits: 500,
    price: 1000,
    popular: true,
    features: [
      '500 AI generations',
      'All tools access',
      'Fast processing',
      'Batch operations',
      'Export to CSV',
      'Priority support'
    ]
  },
  {
    name: 'Power',
    credits: 1000,
    price: 2000,
    features: [
      '1000 AI generations',
      'All tools access',
      'Priority processing',
      'Batch operations',
      'Export to CSV',
      'Priority support'
    ]
  },
];

const internationalGeneralPackages: CreditPackage[] = [
  {
    name: 'Starter',
    credits: 100,
    price: 5,
    currency: 'USD',
    qrCode: 'Binance 10$ equal to 1000 cradit.png', // Fallback
    features: [
      '100 AI generations',
      'All tools access',
      'Standard processing',
      'Email support'
    ]
  },
  {
    name: 'Pro',
    credits: 500,
    price: 10,
    currency: 'USD',
    popular: true,
    qrCode: 'Binance 10$ equal to 1000 cradit.png',
    features: [
      '500 AI generations',
      'All tools access',
      'Fast processing',
      'Batch operations',
      'Export to CSV',
      'Priority support'
    ]
  },
  {
    name: 'Power',
    credits: 1000,
    price: 20,
    currency: 'USD',
    qrCode: 'Binance 20$ equal to 2000 credit.png',
    features: [
      '1000 AI generations',
      'All tools access',
      'Priority processing',
      'Batch operations',
      'Export to CSV',
      'Priority support'
    ]
  },
];

const pakistanBgRemovalPackages: CreditPackage[] = [
  {
    name: 'Starter',
    credits: 100,
    price: 200,
    features: [
      '100 BG removals',
      'Single & bulk processing',
      'High quality output',
      'Expires in 30 days',
      'Email support'
    ]
  },
  {
    name: 'Pro',
    credits: 500,
    price: 1000,
    popular: true,
    features: [
      '500 BG removals',
      'Single & bulk processing',
      'High quality output',
      'Expires in 30 days',
      'Fast processing',
      'Priority support'
    ]
  },
  {
    name: 'Elite',
    credits: 1000,
    price: 2000,
    features: [
      '1000 BG removals',
      'Single & bulk processing',
      'High quality output',
      'Expires in 30 days',
      'Priority processing',
      '24/7 Priority support'
    ]
  },
];

const internationalBgRemovalPackages: CreditPackage[] = [
  {
    name: 'Starter',
    credits: 500,
    price: 5,
    qrCode: 'Binance 10$ equal to 1000 cradit.png',
    currency: 'USD',
    icon: FlashIcon,
    gradient: 'from-purple-500 to-pink-500',
    features: [
      '500 BG removals',
      'Single & bulk processing',
      'High quality output',
      'Expires in 30 days',
      'Email support'
    ]
  },
  {
    name: 'Professional',
    credits: 1000,
    price: 10,
    qrCode: 'Binance 10$ equal to 1000 cradit.png',
    popular: true,
    currency: 'USD',
    icon: CrownIcon,
    gradient: 'from-purple-500 to-indigo-500',
    features: [
      '1000 BG removals',
      'Single & bulk processing',
      'High quality output',
      'Expires in 30 days',
      'Priority processing',
      'Priority support'
    ]
  },
];

export default function BuyCreditsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [location, setLocation] = useState<LocationType>('pakistan');
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [creditType, setCreditType] = useState<'GENERAL' | 'BG_REMOVAL'>('GENERAL');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push('/signin');
      return;
    }
  }, [session, isPending, router]);

  const getCurrentPackages = () => {
    if (creditType === 'BG_REMOVAL') {
      return location === 'pakistan' ? pakistanBgRemovalPackages : internationalBgRemovalPackages;
    }
    return location === 'pakistan' ? pakistanGeneralPackages : internationalGeneralPackages;
  };

  const handleLocationChange = (newLocation: LocationType) => {
    setLocation(newLocation);
    setSelectedPackage(null);
  };

  const handleCreditTypeChange = (type: 'GENERAL' | 'BG_REMOVAL') => {
    setCreditType(type);
    setSelectedPackage(null);
  };

  const handleBuy = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);

    // Redirect to payment processing page
    const params = new URLSearchParams({
      packageName: pkg.name,
      credits: pkg.credits.toString(),
      price: pkg.price.toString(),
      currency: pkg.currency || 'PKR',
      location: location,
      creditType: creditType,
      qrCode: pkg.qrCode || ''
    });

    router.push(`/buy-credits/payment?${params.toString()}`);
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-4">
          Upgrade Your Creation Speed
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
          Choose the perfect credit package for your stock photography workflow.
          Never run out of power mid-session.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 max-w-2xl mx-auto mb-10 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700 text-left">
            <strong>Credit Expiration Policy:</strong> General AI credits never expire.
            Background Removal credits are valid for <strong>30 days</strong> from the date of purchase.
            Enjoy our BG Remover pricing: <strong>1 credit = 2 PKR</strong>.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-center gap-6 mb-12">
          {/* Credit Type Toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => handleCreditTypeChange('GENERAL')}
              className={cn(
                "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                creditType === 'GENERAL'
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              General AI
            </button>
            <button
              onClick={() => handleCreditTypeChange('BG_REMOVAL')}
              className={cn(
                "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                creditType === 'BG_REMOVAL'
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              BG Remover
            </button>
          </div>

          {/* Location Toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => handleLocationChange('pakistan')}
              className={cn(
                "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                location === 'pakistan'
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Pakistan
            </button>
            <button
              onClick={() => handleLocationChange('international')}
              className={cn(
                "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                location === 'international'
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              International
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {getCurrentPackages().map((pkg) => (
          <Card
            key={pkg.name}
            className={cn(
              "relative border-2 transition-all duration-300 hover:shadow-2xl overflow-hidden rounded-[32px]",
              pkg.popular ? "border-blue-500 scale-105" : "border-slate-100 hover:border-slate-200"
            )}
          >
            {pkg.popular && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white px-6 py-1.5 rounded-bl-2xl font-bold text-xs">
                MOST POPULAR
              </div>
            )}
            <CardHeader className="pt-10 pb-6 text-center">
              <div className={cn(
                "w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-gradient-to-tr shadow-lg shadow-blue-500/10",
                pkg.gradient || "from-blue-600 to-indigo-600"
              )}>
                <HugeiconsIcon icon={pkg.icon || PackageIcon} size={32} className="text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">{pkg.name}</CardTitle>
              <CardDescription className="text-slate-500 font-medium">For creative power</CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8 border-b border-slate-50">
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-black text-slate-900">
                  {pkg.currency === 'USD' ? '$' : 'Rs.'}{pkg.price}
                </span>
                <span className="text-slate-400 font-bold">one-time</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 rounded-full">
                <Zap className="w-4 h-4 text-blue-600 fill-blue-600" />
                <span className="text-blue-700 font-black text-sm">{pkg.credits} Credits</span>
              </div>
            </CardContent>
            <CardContent className="pt-8 pb-10">
              <ul className="space-y-4">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span className="text-slate-600 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pb-10 pt-0">
              <Button
                onClick={() => handleBuy(pkg)}
                className={cn(
                  "w-full h-14 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] group",
                  pkg.popular
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                )}
              >
                Get Started
                <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-100 pt-16">
        <div className="flex flex-col items-center text-center p-6">
          <div className="p-4 bg-blue-50 rounded-2xl mb-6">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Flexible Payments</h3>
          <p className="text-slate-500">Pay via EasyPaisa, JazzCash, or crypto for international users.</p>
        </div>
        <div className="flex flex-col items-center text-center p-6">
          <div className="p-4 bg-green-50 rounded-2xl mb-6">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Secure Transactions</h3>
          <p className="text-slate-500">Manual approval process ensures your credits are safely delivered.</p>
        </div>
        <div className="flex flex-col items-center text-center p-6">
          <div className="p-4 bg-orange-50 rounded-2xl mb-6">
            <Zap className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Instant Scale</h3>
          <p className="text-slate-500">Bulk processing tools available as soon as your payment is confirmed.</p>
        </div>
      </div>
    </div>
  );
}
