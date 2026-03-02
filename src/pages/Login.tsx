import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
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
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
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
        toast.error('Λάθος email ή κωδικός');
      } else {
        toast.error('Αποτυχία σύνδεσης: ' + error.message);
      }
      setLoading(false);
    } else {
      toast.success('Καλώς ήρθατε!');
      navigate('/packages', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      {/* Decorative shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, hsl(43,96%,50%), hsl(43,100%,62%))' }}
          >
            <span className="text-xl font-black text-white tracking-tighter">FC</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            First <span className="text-amber-500">Class</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Premium Financial Management
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Είσοδος</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className={`w-full h-11 px-4 rounded-xl text-sm text-slate-900 bg-slate-50 border placeholder-slate-300 outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-100 ${errors.email ? 'border-red-300' : 'border-slate-200'}`}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Κωδικός</label>
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
                  className={`w-full h-11 px-4 pr-11 rounded-xl text-sm text-slate-900 bg-slate-50 border placeholder-slate-300 outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-100 ${errors.password ? 'border-red-300' : 'border-slate-200'}`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-bold text-white transition-all mt-2 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, hsl(43,96%,48%), hsl(43,90%,55%))' }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Είσοδος
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs text-slate-300">
          First Class © 2025
        </p>
      </div>
    </div>
  );
}
