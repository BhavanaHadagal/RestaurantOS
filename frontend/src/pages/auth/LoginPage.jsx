import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/common/CrudForm';
import { getDefaultRouteForRole, getUserRole } from '@/lib/rbac';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  if (accessToken) {
    const role = useAuthStore.getState().getRole();
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const response = await authApi.login(data);
      const { user, accessToken: token, refreshToken } = response.data.data;
      queryClient.clear();
      setAuth(user, token, refreshToken);
      navigate(getDefaultRouteForRole(getUserRole(user, token)));
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach the API. Wait for the backend to wake up, then try again.');
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen flex bg-[#0a0a0b]">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=80"
          alt="Chef preparing food"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0b]/90 via-[#0a0a0b]/60 to-orange-950/30" />
        <div className="relative z-10 flex flex-col justify-end p-12 xl:p-16">
          <Link to="/" className="absolute top-12 left-12 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 font-bold text-white">
              R
            </div>
            <span className="text-xl font-semibold text-white">RestaurantOS</span>
          </Link>
          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md"
          >
            <p className="text-2xl font-medium text-white leading-relaxed">
              &ldquo;We went from surviving to thriving in four months.&rdquo;
            </p>
            <footer className="mt-4 text-zinc-400">— Priya Sharma, Spice Route Kitchen</footer>
          </motion.blockquote>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-md"
        >
          <h2 className="text-2xl font-bold text-white">Welcome back</h2>
          <p className="mt-1 text-zinc-500">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-orange-400 hover:underline">Sign up</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20">{error}</div>
            )}

            <FormField label="Email" error={errors.email} required>
              <Input
                type="email"
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                placeholder="owner@restaurantos.com"
                {...register('email', { required: 'Email is required' })}
              />
            </FormField>

            <FormField label="Password" error={errors.password} required>
              <Input
                type="password"
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                placeholder="Enter your password"
                {...register('password', { required: 'Password is required' })}
              />
            </FormField>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-orange-400 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 hover:opacity-90"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
