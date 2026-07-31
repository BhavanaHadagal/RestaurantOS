import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/common/CrudForm';
import { getDefaultRouteForRole, getUserRole } from '@/lib/rbac';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const AUTH_LABEL = 'text-zinc-300';

export default function SignupPage() {
  const navigate = useNavigate();
  const { accessToken, setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  if (accessToken) {
    const role = useAuthStore.getState().getRole();
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const response = await authApi.signup({
        email: data.email.trim(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || undefined,
        restaurantName: data.restaurantName.trim(),
      });
      const { user, accessToken: token, refreshToken } = response.data.data;
      setAuth(user, token, refreshToken);
      navigate(getDefaultRouteForRole(getUserRole(user, token)));
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    '14-day free trial, no credit card',
    'Full AI insights & OCR included',
    'Owner account with all permissions',
    'Setup in under 5 minutes',
  ];

  return (
    <div className="dark min-h-screen flex bg-[#0a0a0b]">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80"
          alt="Restaurant interior"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0b]/90 via-[#0a0a0b]/70 to-orange-950/40" />
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16">
          <Link to="/" className="flex items-center gap-2.5 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 font-bold text-white">
              R
            </div>
            <span className="text-xl font-semibold text-white">RestaurantOS</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-sm text-orange-300 mb-6">
              <Sparkles className="h-4 w-4" />
              Start your free trial
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Build a restaurant that{' '}
              <span className="text-orange-400">actually thrives.</span>
            </h1>
            <p className="mt-4 text-zinc-400 text-lg max-w-md">
              Create your owner account and get instant access to dashboard, kitchen, inventory, and AI tools.
            </p>

            <ul className="mt-10 space-y-4">
              {perks.map((perk, i) => (
                <motion.li
                  key={perk}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 text-zinc-300"
                >
                  <CheckCircle2 className="h-5 w-5 text-orange-400 shrink-0" />
                  {perk}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-8 lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <Link to="/" className="flex items-center gap-2.5 mb-8 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 font-bold text-white">
            R
          </div>
          <span className="text-lg font-semibold text-white">RestaurantOS</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-md"
        >
          <h2 className="text-2xl font-bold text-white">Create your account</h2>
          <p className="mt-1 text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-400 hover:underline">Sign in</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="First name" error={errors.firstName} required labelClassName={AUTH_LABEL}>
                <Input
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                  placeholder="Raj"
                  autoComplete="given-name"
                  {...register('firstName', { required: 'First name is required' })}
                />
              </FormField>
              <FormField label="Last name" error={errors.lastName} required labelClassName={AUTH_LABEL}>
                <Input
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                  placeholder="Sharma"
                  autoComplete="family-name"
                  {...register('lastName', { required: 'Last name is required' })}
                />
              </FormField>
            </div>

            <FormField label="Restaurant name" error={errors.restaurantName} required labelClassName={AUTH_LABEL}>
              <Input
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                placeholder="Spice Route Kitchen"
                autoComplete="organization"
                {...register('restaurantName', { required: 'Restaurant name is required' })}
              />
            </FormField>

            <FormField label="Email" error={errors.email} required labelClassName={AUTH_LABEL}>
              <Input
                type="email"
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                placeholder="you@restaurant.com"
                autoComplete="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                })}
              />
            </FormField>

            <FormField label="Phone" error={errors.phone} labelClassName={AUTH_LABEL}>
              <Input
                type="tel"
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                placeholder="+91 98765 43210"
                autoComplete="tel"
                {...register('phone')}
              />
            </FormField>

            <FormField label="Password" error={errors.password} required labelClassName={AUTH_LABEL}>
              <Input
                type="password"
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />
            </FormField>

            <FormField label="Confirm password" error={errors.confirmPassword} required labelClassName={AUTH_LABEL}>
              <Input
                type="password"
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                placeholder="Confirm your password"
                autoComplete="new-password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (v) => v === password || 'Passwords do not match',
                })}
              />
            </FormField>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 hover:opacity-90 shadow-lg shadow-orange-500/20"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>

            <p className="text-xs text-zinc-600 text-center">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
