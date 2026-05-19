import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditor } from '../contexts/AuditorContext';
import {
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

export default function AuditorLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuditor();
  const [accessCode, setAccessCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/portal/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when input changes
  useEffect(() => {
    if (accessCode) {
      clearError();
      setLocalError(null);
    }
  }, [accessCode, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessCode.trim()) {
      setLocalError('Please enter your access code');
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);

    try {
      await login(accessCode.trim());
      navigate('/portal/dashboard');
    } catch {
      // Error is handled by context
      setIsSubmitting(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAccessCode(text.trim());
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const displayError = error || localError;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30 mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Auditor Portal</h1>
          <p className="text-purple-200/70">Enter your access code to view audit materials</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {displayError && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <ExclamationCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-medium">Authentication Failed</p>
                  <p className="text-red-700/70 text-sm mt-1">{displayError}</p>
                </div>
              </div>
            )}

            {/* Access Code Input */}
            <div>
              <label
                htmlFor="accessCode"
                className="block text-sm font-medium text-purple-200 mb-2"
              >
                Access Code
              </label>
              <div className="relative">
                <input
                  id="accessCode"
                  type={showCode ? 'text' : 'password'}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter your access code"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-24"
                  autoComplete="off"
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="p-2 text-purple-700 hover:text-white transition-colors"
                    title="Paste from clipboard"
                  >
                    <ClipboardDocumentIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="p-2 text-purple-700 hover:text-white transition-colors"
                    title={showCode ? 'Hide code' : 'Show code'}
                  >
                    {showCode ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-purple-700/50">
                Your access code was provided by the audit team
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !accessCode.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-5 h-5" />
                  <span>Access Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-center text-sm text-purple-200/50">
              Having trouble accessing the portal?{' '}
              <a
                href="mailto:support@example.com"
                className="text-purple-600 hover:text-purple-700 transition-colors"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-purple-700/40">
            🔒 This portal uses secure, encrypted connections. Your access code provides temporary,
            limited access to audit materials.
          </p>
        </div>
      </div>
    </div>
  );
}
