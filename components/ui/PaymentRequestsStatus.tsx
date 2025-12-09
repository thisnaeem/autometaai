'use client';

import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CreditCardIcon, Clock01Icon, Tick02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

interface PaymentRequest {
  id: string;
  creditsRequested: number;
  amount: number;
  currency: string;
  location: string;
  paymentMethod: string;
  transactionId: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
}

interface PaymentRequestsStatusProps {
  className?: string;
}

export default function PaymentRequestsStatus({ className = '' }: PaymentRequestsStatusProps) {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentRequests();
  }, []);

  const fetchPaymentRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/payment-requests');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment requests');
      }

      setPaymentRequests(data.paymentRequests);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch payment requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300';
      case 'APPROVED':
        return 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-300';
      case 'REJECTED':
        return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const relevantRequests = paymentRequests.filter(
    request => request.status === 'PENDING' || request.status === 'APPROVED' || request.status === 'REJECTED'
  );

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-slate-200 rounded-xl"></div>
              <div className="h-32 bg-slate-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (relevantRequests.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-2xl shadow-lg p-12 border border-slate-200 text-center">
          <HugeiconsIcon icon={CreditCardIcon} size={80} className="mx-auto mb-6 text-slate-300" />
          <h3 className="text-2xl font-bold text-slate-900 mb-2">No Payment Requests</h3>
          <p className="text-slate-600 text-lg mb-8">
            You haven&apos;t made any payment requests yet. Purchase credits to get started!
          </p>
          <button
            onClick={() => window.location.href = '/app/buy-credits'}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Buy Credits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <HugeiconsIcon icon={CreditCardIcon} size={28} className="mr-3 text-blue-600" />
          Your Payment Requests
        </h2>
        <div className="space-y-4">
          {relevantRequests.map((request) => (
            <div key={request.id} className="p-6 border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 rounded-xl hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {request.creditsRequested} Credits
                    </span>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 ${getStatusBadgeClass(request.status)}`}>
                      {request.status === 'PENDING' && <HugeiconsIcon icon={Clock01Icon} size={16} className="inline mr-1" />}
                      {request.status === 'APPROVED' && <HugeiconsIcon icon={Tick02Icon} size={16} className="inline mr-1" />}
                      {request.status === 'REJECTED' && <HugeiconsIcon icon={Cancel01Icon} size={16} className="inline mr-1" />}
                      {request.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    {request.currency === 'PKR' ? '₨' : '$'}{request.amount} &bull; {formatDate(request.createdAt)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-1">Payment Method</span>
                  <p className="text-slate-900">{request.paymentMethod}</p>
                </div>
                {request.transactionId && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700 block mb-1">Transaction ID</span>
                    <p className="text-slate-900 font-mono text-xs break-all">{request.transactionId}</p>
                  </div>
                )}
              </div>

              {request.status === 'PENDING' && (
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl text-sm text-yellow-900 font-medium">
                  <HugeiconsIcon icon={Clock01Icon} size={18} className="inline mr-2" />
                  Your payment is being reviewed. Credits will be added once approved.
                </div>
              )}

              {request.status === 'APPROVED' && request.processedAt && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-xl text-sm text-emerald-900 font-medium">
                  <HugeiconsIcon icon={Tick02Icon} size={18} className="inline mr-2" />
                  Payment approved on {formatDate(request.processedAt)}. Credits have been added to your account.
                </div>
              )}

              {request.status === 'REJECTED' && (
                <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-xl text-sm text-red-900 font-medium">
                  <HugeiconsIcon icon={Cancel01Icon} size={18} className="inline mr-2" />
                  Payment request has been rejected. {request.adminNotes ? 'Please see admin notes below for details.' : 'Please contact support for more information.'}
                </div>
              )}

              {request.adminNotes && (
                <div className="mt-4 p-4 bg-slate-100 border-2 border-slate-300 rounded-xl text-sm">
                  <span className="font-semibold text-slate-900 block mb-2">Admin Notes:</span>
                  <p className="text-slate-700 leading-relaxed">{request.adminNotes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
