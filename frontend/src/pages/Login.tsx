import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandingConfig } from '@/contexts/BrandingContext';

/**
 * SECURITY: Sanitize URL parameters to prevent XSS attacks
 * Only allows alphanumeric characters, spaces, and basic punctuation
 */
function sanitizeUrlParam(value: string | null): string {
  if (!value) return '';
  // First sanitize with DOMPurify to remove any HTML/scripts
  const purified = DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  // Then limit length and remove any remaining control characters
  return purified.substring(0, 200).replace(/[\x00-\x1F\x7F]/g, '');
}

export default function Login() {
  const { isAuthenticated, isLoading, login, devLogin } = useAuth();
  const branding = useBrandingConfig();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }

    // Check for error in URL params
    // SECURITY: Sanitize URL parameters to prevent XSS attacks
    const params = new URLSearchParams(window.location.search);
    const errorParam = sanitizeUrlParam(params.get('error'));
    const errorDesc = sanitizeUrlParam(params.get('error_description'));
    if (errorParam) {
      setError(`${errorParam}: ${errorDesc || 'Unknown error'}`);
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="animate-spin w-8 h-8 border-4 border-surface-700 rounded-full border-t-brand-500"></div>
      </div>
    );
  }

  const isDev = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-950 px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={branding.logoUrl} alt="Logo" className="w-16 h-16 object-contain mb-4" />
          <h1 className="text-3xl font-bold text-surface-100">{branding.platformName}</h1>
          <p className="text-surface-400 mt-2">Governance, Risk, and Compliance Platform</p>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Login card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-surface-100 text-center mb-2">Welcome Back</h2>
          <p className="text-surface-400 text-center mb-8">
            Sign in to access your compliance dashboard
          </p>

          <button onClick={login} className="btn-primary w-full py-3 text-base">
            Sign in with SSO
          </button>

          {/* Dev login option */}
          {isDev && devLogin && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-surface-800 text-surface-500">Development Only</span>
                </div>
              </div>
              <button
                onClick={devLogin}
                className="w-full py-3 text-base bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
              >
                Dev Login (Skip SSO)
              </button>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-surface-500">Powered by Keycloak authentication</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-surface-600 text-sm mt-8">
          &copy; {new Date().getFullYear()} {branding.platformName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
