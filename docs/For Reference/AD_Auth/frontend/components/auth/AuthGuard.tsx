'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user' | 'viewer';
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Preserve the current path so we can redirect back after login
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/?returnUrl=${returnUrl}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // Check role if required
  useEffect(() => {
    if (!isLoading && isAuthenticated && requiredRole && user) {
      // Role hierarchy with all roles from Phase 1 enhancements
      const roleHierarchy: Record<string, number> = { 
        viewer: 1, 
        user: 2, 
        professional_services: 2, 
        sales: 3, 
        approver: 3, 
        admin: 4 
      };
      const userLevel = roleHierarchy[user.role] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;
      
      if (userLevel < requiredLevel) {
        router.push('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, requiredRole, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-lighter">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-castle-red" />
          <p className="text-gray-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
