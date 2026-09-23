import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { Button, Card, CardBody, FieldHint, Input, Label } from '@/components/ui';

interface AuditorLoginResponse {
  sessionToken: string;
  auditorName: string;
  auditorEmail: string;
  auditId: string;
  auditName: string;
}

function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    return data?.error ?? data?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function AuditorLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [accessCode, setAccessCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(
    async (code: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await api.post<AuditorLoginResponse>('/api/audit-portal/auth', {
          accessCode: code,
        });
        localStorage.setItem('auditorAccessCode', code);
        localStorage.setItem('auditorPortalSession', JSON.stringify(res.data));
        navigate('/auditor-portal');
      } catch (err) {
        setError(extractError(err, 'Sign-in failed. Please check the access code and try again.'));
      } finally {
        setSubmitting(false);
      }
    },
    [navigate]
  );

  const autoVerifiedRef = useRef(false);
  useEffect(() => {
    if (autoVerifiedRef.current) return;
    const token = searchParams.get('token');
    if (!token) return;
    autoVerifiedRef.current = true;
    setAccessCode(token);
    void verify(token);
  }, [searchParams, verify]);

  const handleSignIn = async () => {
    if (!accessCode.trim()) {
      setError('Please enter your portal access code.');
      return;
    }
    await verify(accessCode.trim());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-brand-500/10 text-brand-700 mb-3">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-h1 text-surface-900">Auditor Sign-in</h1>
          <p className="text-small text-surface-600 mt-1.5 text-center">
            Enter the access code supplied by your audit coordinator.
          </p>
        </div>

        <Card>
          <CardBody density="comfy" className="space-y-4">
            <div>
              <Label htmlFor="auditor-access-code" required>
                Portal access code
              </Label>
              <Input
                id="auditor-access-code"
                type="password"
                autoComplete="one-time-code"
                autoFocus
                placeholder="Enter your access code"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !submitting) {
                    e.preventDefault();
                    void handleSignIn();
                  }
                }}
                invalid={!!error}
              />
              {error ? (
                <FieldHint error>{error}</FieldHint>
              ) : (
                <FieldHint>Access codes are issued per audit and expire automatically.</FieldHint>
              )}
            </div>

            <Button
              fullWidth
              size="lg"
              loading={submitting}
              disabled={!accessCode.trim()}
              onClick={handleSignIn}
            >
              Sign in
            </Button>
          </CardBody>
        </Card>

        <p className="text-center text-xs text-surface-500 mt-6">
          Having trouble? Contact your audit coordinator for assistance.
        </p>
      </div>
    </div>
  );
}
