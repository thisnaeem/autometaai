'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, AccessIcon, GoogleIcon, ArrowRight01Icon, Loading03Icon } from '@hugeicons/core-free-icons';

function SignInForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn.email({
                email,
                password,
            });

            if (result.error) {
                setError(result.error.message || 'Failed to sign in');
            } else {
                router.push('/describe');
                router.refresh();
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await authClient.signIn.social({
                provider: 'google',
                callbackURL: '/describe',
            });
        } catch (err) {
            setError('Failed to sign in with Google');
            console.error(err);
        }
    };

    return (
        <div className="bg-white/70 backdrop-blur-xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 border border-white/40">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                <p className="text-slate-500">Sign in to your account to continue</p>
            </div>

            {error && (
                <Alert className="mb-6 border-red-100 bg-red-50/50 text-red-700 rounded-2xl flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1">Email Address</Label>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <HugeiconsIcon icon={Mail01Icon} size={20} />
                        </div>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            required
                            disabled={loading}
                            className="pl-12 h-14 rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all text-base"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                    </div>
                    <div className="relative group">
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            required
                            disabled={loading}
                            className="px-6 h-14 rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all text-base"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    disabled={loading}
                >
                    {loading ? (
                        <HugeiconsIcon icon={Loading03Icon} size={20} className="animate-spin" />
                    ) : (
                        <>
                            Sign In
                            <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
                        </>
                    )}
                </Button>
            </form>

            <div className="mt-8">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                        <span className="px-4 bg-transparent text-slate-400 backdrop-blur-sm">Or Securely Join With</span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full h-14 mt-6 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                >
                    <HugeiconsIcon icon={GoogleIcon} size={20} className="text-slate-700" />
                    Continue with Google
                </Button>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-100 text-center">
                <p className="text-slate-500 font-medium">
                    New to csvout?{' '}
                    <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-bold hover:underline underline-offset-4 decoration-2">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function SignInPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="bg-white/70 backdrop-blur-xl rounded-[32px] p-10 border border-white/40 h-[600px] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return <SignInForm />;
}
