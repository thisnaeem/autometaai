'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { FlashIcon, CrownIcon, Rocket01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/Button';

interface CreditPackage {
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
  qrCode: string;
  currency: string;
  icon: typeof FlashIcon;
  gradient: string;
  features: string[];
}

type LocationType = 'pakistan' | 'international';

const pakistanPackages: CreditPackage[] = [
  {
    name: 'Starter',
    credits: 500,
    price: 1000,
    qrCode: '1000 Rs 500 Cradit.png',
    currency: 'PKR',
    icon: FlashIcon,
    gradient: 'from-blue-500 to-cyan-500',
    features: [
      '500 AI generations',
      'All tools access',
      'Export to CSV',
      'Email support'
    ]
  },
  {
    name: 'Professional',
    credits: 1000,
    price: 2000,
    qrCode: '2000Rs 1000 Cradit.png',
    popular: true,
    currency: 'PKR',
    icon: CrownIcon,
    gradient: 'from-indigo-500 to-blue-500',
    features: [
      '1000 AI generations',
      'All tools access',
      'Priority processing',
      'Batch operations',
      'Export to CSV',
      'Priority support'
    ]
  },
  {
    name: 'Business',
    credits: 1500,
    price: 3000,
    qrCode: '3000Rs 1500 Cradit.png',
    currency: 'PKR',
    icon: Rocket01Icon,
    gradient: 'from-cyan-500 to-teal-500',
    features: [
      '1500 AI generations',
      'All tools access',
      'Priority processing',
      'Batch operations',
      'Export to CSV',
      'Priority support',
      'Advanced features'
    ]
  },
  {
    name: 'Enterprise',
    credits: 2000,
    price: 4000,
    qrCode: '4000 Rs 2000 Cradit.png',
    currency: 'PKR',
    icon: Rocket01Icon,
    gradient: 'from-purple-500 to-pink-500',
    features: [
      '2000 AI generations',
      'All tools access',
      'Priority processing',
      'Batch operations',
      'Export to CSV',
      'Priority support',
      'Advanced features',
      'API access'
    ]
  },
  {
    name: 'Ultimate',
    credits: 2500,
    price: 5000,
    qrCode: '5000 Rs 2500 Cradit.png',
    currency: 'PKR',
    icon: Rocket01Icon,
    gradient: 'from-orange-500 to-red-500',
    features: [
      '2500 AI generations',
      'All tools access',
      'Priority processing',
      'Batch operations',
      'Export to CSV',
      'Priority support',
      'Advanced features',
      'API access',
      'Custom integrations'
    ]
  },
];

const internationalPackages: CreditPackage[] = [
  {
    name: 'Starter',
    credits: 500,
    price: 5,
    qrCode: 'Binance 10$ equal to 1000 cradit.png',
    currency: 'USD',
    icon: FlashIcon,
    gradient: 'from-blue-500 to-cyan-500',
    features: [
      '500 AI generations',
      'All tools access',
      'Export to CSV',
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
    gradient: 'from-indigo-500 to-blue-500',
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

export default function BuyCreditsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [location, setLocation] = useState<LocationType>('pakistan');
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, isPending, router]);

  const getCurrentPackages = () => {
    return location === 'pakistan' ? pakistanPackages : internationalPackages;
  };

  const handleLocationChange = (newLocation: LocationType) => {
    setLocation(newLocation);
    setSelectedPackage(null);
    setError('');
  };

  const handlePackageSelect = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
  };

  const handleProceedToPayment = () => {
    if (!selectedPackage) {
      setError('Please select a credit package');
      return;
    }

    const params = new URLSearchParams({
      credits: selectedPackage.credits.toString(),
      amount: selectedPackage.price.toString(),
      qrCode: selectedPackage.qrCode,
      currency: selectedPackage.currency,
      location: location
    });
    
    router.push(`/app/buy-credits/payment?${params.toString()}`);
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-4">
            Buy <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Credits</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Choose the perfect credit package for your needs. All credits never expire.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border-2 border-red-200 rounded-2xl max-w-2xl mx-auto">
            <p className="text-red-700 font-medium text-center">{error}</p>
          </div>
        )}

        {/* Location Selector */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Select Your Location</h2>
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => handleLocationChange('pakistan')}
              className={`px-10 py-4 rounded-xl font-semibold transition-all duration-300 text-lg ${
                location === 'pakistan'
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-xl'
                  : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              🇵🇰 Pakistan
            </Button>
            <Button
              onClick={() => handleLocationChange('international')}
              className={`px-10 py-4 rounded-xl font-semibold transition-all duration-300 text-lg ${
                location === 'international'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl'
                  : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              🌍 International
            </Button>
          </div>
        </div>

        {/* Credit Packages - Card Layout */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Choose Your Package</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {getCurrentPackages().map((pkg) => (
              <div
                key={pkg.credits}
                className="relative"
              >
                {pkg.popular && (
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      🔥 Most Popular
                    </div>
                  </div>
                )}

                <div
                  className={`relative h-full p-8 bg-white rounded-3xl border-2 cursor-pointer transition-all duration-300 hover:shadow-2xl ${
                    selectedPackage?.credits === pkg.credits
                      ? 'border-blue-500 shadow-2xl shadow-blue-500/25'
                      : pkg.popular
                      ? 'border-blue-300 shadow-xl'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                  onClick={() => handlePackageSelect(pkg)}
                >
                  {/* Icon */}
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${pkg.gradient} mb-6 shadow-lg`}>
                    <HugeiconsIcon icon={pkg.icon} size={40} className="text-white" />
                  </div>

                  <h3 className="text-3xl font-bold text-slate-900 mb-2">{pkg.name}</h3>
                  <p className="text-slate-600 mb-6">{pkg.credits} Credits</p>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-slate-900">
                        {pkg.currency === 'PKR' ? '₨' : '$'}{pkg.price}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mt-2">
                      {pkg.currency === 'PKR' ? '₨' : '$'}{(pkg.price / pkg.credits).toFixed(pkg.currency === 'PKR' ? 1 : 3)} per credit
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {pkg.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          size={20}
                          className={`flex-shrink-0 mt-0.5 ${
                            selectedPackage?.credits === pkg.credits || pkg.popular
                              ? 'text-blue-600'
                              : 'text-slate-400'
                          }`}
                        />
                        <span className="text-sm text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePackageSelect(pkg);
                    }}
                    variant={selectedPackage?.credits === pkg.credits || pkg.popular ? 'primary' : 'outline'}
                    size="lg"
                    className={`w-full ${
                      selectedPackage?.credits === pkg.credits || pkg.popular
                        ? `bg-gradient-to-r ${pkg.gradient} hover:opacity-90 text-white shadow-lg`
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {selectedPackage?.credits === pkg.credits ? 'Selected' : 'Select Package'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proceed to Payment Button */}
        {selectedPackage && (
          <div className="text-center mt-12">
            <Button
              onClick={handleProceedToPayment}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-16 py-5 text-xl font-bold rounded-xl shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 transition-all duration-300"
            >
              Proceed to Payment →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
