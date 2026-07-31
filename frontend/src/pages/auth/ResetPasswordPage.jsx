import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/common/CrudForm';
import { authApi } from '@/lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = searchParams.get('token');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword({ token, password: data.password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold">Invalid link</h2>
        <p className="text-muted-foreground">This password reset link is invalid or expired.</p>
        <Link to="/forgot-password"><Button>Request new link</Button></Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Reset password</h2>
        <p className="text-muted-foreground mt-1">Enter your new password</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <FormField label="New Password" error={errors.password} required>
          <Input type="password" {...register('password', { required: true, minLength: 8 })} />
        </FormField>
        <FormField label="Confirm Password" error={errors.confirmPassword} required>
          <Input type="password" {...register('confirmPassword', { required: true })} />
        </FormField>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </motion.div>
  );
}
