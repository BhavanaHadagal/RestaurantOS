import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore, useThemeStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormField } from '@/components/common/CrudForm';
import { Avatar } from '@/components/ui/Avatar';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [message, setMessage] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onChangePassword = async (data) => {
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setMessage('Password changed successfully');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
          <Avatar
            src={user?.avatar}
            firstName={user?.firstName}
            lastName={user?.lastName}
            size="lg"
          />
          <div>
            <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {user?.restaurantName && (
              <p className="text-sm text-muted-foreground">{user.restaurantName}</p>
            )}
            <p className="text-sm text-muted-foreground">{user?.role?.name}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>
              Light
            </Button>
            <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>
              Dark
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            {message && <p className="text-sm">{message}</p>}
            <FormField label="Current Password" error={errors.currentPassword} required>
              <Input type="password" {...register('currentPassword', { required: true })} />
            </FormField>
            <FormField label="New Password" error={errors.newPassword} required>
              <Input type="password" {...register('newPassword', { required: true, minLength: 8 })} />
            </FormField>
            <Button type="submit">Update Password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
