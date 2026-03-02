import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/components/auth/AuthProvider';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/packages', { replace: true });
    }
  }, [user, navigate]);

  const validateForm = () => {
    setErrors({});

    try {
      loginSchema.parse({ email, password });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error('Login failed: ' + error.message);
      }
      setLoading(false);
    } else {
      toast.success('Welcome back!');
      navigate('/packages', { replace: true });
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, hsl(222,47%,8%) 0%, hsl(222,47%,13%) 50%, hsl(222,40%,10%) 100%)' }}>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(hsl(43,85%,60%) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-5 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, hsl(43,85%,44%), hsl(43,100%,62%))' }}>
            <span className="text-2xl font-black text-white tracking-tighter">FC</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            First{' '}
            <span style={{ color: 'hsl(43,85%,60%)' }}>Class</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'hsl(222,20%,60%)' }}>
            Premium Financial Management Suite
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl" style={{ background: 'hsl(222,40%,13%)', border: '1px solid hsl(222,40%,20%)' }}>
          <h2 className="text-base font-semibold text-white mb-6">Είσοδος</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(222,20%,55%)' }}>Εμαιλ</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="w-full h-11 px-4 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
                style={{
                  background: 'hsl(222,40%,17%)',
                  border: `1px solid ${errors.email ? 'hsl(0,84%,60%)' : 'hsl(222,40%,24%)'}`,
                }}
                onFocus={e => e.target.style.borderColor = 'hsl(43,85%,48%)'}
                onBlur={e => e.target.style.borderColor = errors.email ? 'hsl(0,84%,60%)' : 'hsl(222,40%,24%)'}
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(222,20%,55%)' }}>Κωδικός</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full h-11 px-4 pr-11 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
                  style={{
                    background: 'hsl(222,40%,17%)',
                    border: `1px solid ${errors.password ? 'hsl(0,84%,60%)' : 'hsl(222,40%,24%)'}`,
                  }}
                  onFocus={e => e.target.style.borderColor = 'hsl(43,85%,48%)'}
                  onBlur={e => e.target.style.borderColor = errors.password ? 'hsl(0,84%,60%)' : 'hsl(222,40%,24%)'}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'hsl(222,20%,50%)' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-bold text-white transition-all mt-2 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, hsl(43,85%,44%), hsl(43,85%,52%))', boxShadow: '0 4px 20px hsl(43,85%,44%,0.35)' }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Είσοδος
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: 'hsl(222,20%,38%)' }}>
          First Class © 2025 — Premium Financial Suite
        </p>
      </div>
    </div>
  );
}
