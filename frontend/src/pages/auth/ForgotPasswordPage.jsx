import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/common/CrudForm';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function ForgotPasswordPage() {
  const { accessToken } = useAuthStore();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  if (accessToken) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-[#0a0a0b] px-4">
      {sent ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md text-center">
          <CheckCircle className="h-12 w-12 text-orange-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white mt-4">Check your email</h2>
          <p className="text-zinc-500 mt-2">
            If an account exists with that email, we sent a password reset link.
          </p>
          <Link to="/login"><Button className="mt-6">Back to login</Button></Link>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
          <h2 className="text-2xl font-bold text-white">Forgot password?</h2>
          <p className="text-zinc-500 mt-1">Enter your email to receive a reset link</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <FormField label="Email" error={errors.email} required>
              <Input
                type="email"
                className="bg-zinc-900 border-zinc-800 text-white"
                {...register('email', { required: 'Email is required' })}
              />
            </FormField>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-amber-500 border-0">
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
