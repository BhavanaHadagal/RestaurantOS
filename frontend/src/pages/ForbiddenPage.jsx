import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { getDefaultRouteForRole } from '@/lib/rbac';

export default function ForbiddenPage() {
  const getRole = useAuthStore((s) => s.getRole);
  const role = getRole() || 'Unknown';
  const homeRoute = getDefaultRouteForRole(role === 'Unknown' ? null : role);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold">403 — Access Denied</h1>
        <p className="mt-3 text-muted-foreground">
          {role === 'Unknown' ? (
            <>Your session may be outdated. Try signing in again, or use the button below.</>
          ) : (
            <>
              Your role <span className="font-medium text-foreground">({role})</span> does not have
              permission to access this page.
            </>
          )}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={homeRoute}>
            <Button><Home className="h-4 w-4" /> Go to Dashboard</Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
