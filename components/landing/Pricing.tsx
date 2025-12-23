'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon, FlashIcon, CrownIcon, Rocket01Icon } from '@hugeicons/core-free-icons';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const plans = [
  {
    name: 'Starter',
    icon: FlashIcon,
    price: 'Free',
    period: 'forever',
    description: 'Perfect for trying out csvout',
    features: [
      '10 images per month',
      'Basic metadata generation',
      'Standard keywords',
      'Email support',
      'Export to CSV'
    ],
    gradient: 'from-blue-500 to-cyan-500',
    popular: false
  },
  {
    name: 'Pro',
    icon: CrownIcon,
    price: '$29',
    period: 'per month',
    description: 'For professional creators',
    features: [
      '500 images per month',
      'Advanced AI metadata',
      'Premium keywords & tags',
      'Image to prompt generation',
      'Priority support',
      'Batch processing',
      'All export formats',
      'API access'
    ],
    gradient: 'from-indigo-500 to-blue-500',
    popular: true
  },
  {
    name: 'Enterprise',
    icon: Rocket01Icon,
    price: '$99',
    period: 'per month',
    description: 'For teams and agencies',
    features: [
      'Unlimited images',
      'Custom AI training',
      'White-label solution',
      'Dedicated account manager',
      '24/7 priority support',
      'Advanced analytics',
      'Team collaboration',
      'Custom integrations',
      'SLA guarantee'
    ],
    gradient: 'from-cyan-500 to-teal-500',
    popular: false
  }
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6">
            Simple, Transparent
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600"> Pricing</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Choose the perfect plan for your needs. Upgrade or downgrade anytime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}

              <div className={`relative h-full p-8 bg-white rounded-3xl border ${plan.popular ? 'border-blue-300 shadow-xl' : 'border-slate-200'} hover:border-blue-300 hover:shadow-xl transition-all duration-300`}>
                {/* Icon */}
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${plan.gradient} mb-6 shadow-lg`}>
                  <HugeiconsIcon icon={plan.icon} size={40} className="text-white" />
                </div>

                <h3 className="text-3xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-slate-600 mb-6">{plan.description}</p>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600">/ {plan.period}</span>
                  </div>
                </div>

                <Link href="/describe">
                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    size="lg"
                    className={`w-full mb-8 ${plan.popular ? `bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white shadow-lg` : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                  >
                    Get Started
                  </Button>
                </Link>

                <div className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <HugeiconsIcon icon={Tick02Icon} size={24} className={`flex-shrink-0 mt-0.5 ${plan.popular ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
