'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Image02Icon, UserMultiple02Icon, StarIcon } from '@hugeicons/core-free-icons';

const stats = [
  {
    icon: Image02Icon,
    value: '1M+',
    label: 'Images Processed',
    description: 'Metadata generated for millions of images',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: UserMultiple02Icon,
    value: '50K+',
    label: 'Active Creators',
    description: 'Photographers and artists trust us',
    gradient: 'from-indigo-500 to-blue-500'
  },
  {
    icon: Image02Icon,
    value: '300%',
    label: 'Visibility Boost',
    description: 'Average increase in content discovery',
    gradient: 'from-cyan-500 to-teal-500'
  },
  {
    icon: StarIcon,
    value: '4.9/5',
    label: 'User Rating',
    description: 'Based on 10,000+ reviews',
    gradient: 'from-emerald-500 to-green-500'
  }
];

export default function Stats() {
  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
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
            Trusted by
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600"> Thousands</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Join the community of creators who are transforming their workflow with csvout
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              <div className="relative h-full p-8 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 text-center">
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`} />

                <div className="relative z-10">
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${stat.gradient} mb-6 shadow-lg`}>
                    <HugeiconsIcon icon={stat.icon} size={40} className="text-white" />
                  </div>

                  <div className="text-5xl font-bold text-slate-900 mb-2">
                    {stat.value}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {stat.label}
                  </h3>

                  <p className="text-slate-600 text-sm">
                    {stat.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
