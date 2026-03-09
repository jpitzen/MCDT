'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Static logo paths
const DEFAULT_LOGO = '/castle-logo.svg';
const MANIFEST_URL = '/branding/manifest.json';

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO);
  
  // Track if mousedown started on the backdrop (not on modal content or autocomplete)
  const mouseDownOnBackdrop = useRef(false);
  
  const { login, isLoading } = useAuthStore();

  useEffect(() => {
    // Check branding manifest for custom login logo
    const checkLogo = async () => {
      try {
        const response = await fetch(`${MANIFEST_URL}?v=${Date.now()}`);
        if (response.ok) {
          const manifest = await response.json();
          if (manifest.login_logo) {
            setLogoUrl(`${manifest.login_logo}?v=${Date.now()}`);
            return;
          }
        }
      } catch {
        // Manifest not found or invalid, use default
      }
      setLogoUrl(DEFAULT_LOGO);
    };
    
    if (isOpen) {
      checkLogo();
    }
  }, [isOpen]);

  // Track mousedown on backdrop - only set flag if clicking directly on backdrop
  const handleBackdropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  }, []);

  // Only close if both mousedown AND click were on the backdrop
  // This prevents closing when selecting browser autocomplete suggestions
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && mouseDownOnBackdrop.current) {
      onClose();
    }
    mouseDownOnBackdrop.current = false;
  }, [onClose]);

  // Prevent modal content events from bubbling and reset backdrop flag
  const handleModalMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    mouseDownOnBackdrop.current = false;
  }, []);

  const handleModalClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    try {
      await login(username, password);
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Login failed. Please check your credentials.');
      } else {
        setError('Login failed. Please check your credentials.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div 
        className="modal-content" 
        onMouseDown={handleModalMouseDown}
        onClick={handleModalClick}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-medium hover:text-gray-dark dark:hover:text-gray-200 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={logoUrl}
            alt="CloudEstimator"
            className="h-16 object-contain"
            onError={(e) => {
              // Fallback to default logo if custom logo fails to load
              (e.target as HTMLImageElement).src = DEFAULT_LOGO;
            }}
          />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-center text-gray-dark dark:text-gray-200 mb-6">
          Sign in to your account
        </h2>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="input-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="Enter your username"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="input-label">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder="Enter your password"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-medium hover:text-gray-dark dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full btn-primary py-3 flex items-center justify-center gap-2',
              isLoading && 'opacity-70'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer info */}
        <p className="text-center text-sm text-gray-medium dark:text-gray-400 mt-6">
          Use your Active Directory or local admin credentials
        </p>
      </div>
    </div>
  );
}
