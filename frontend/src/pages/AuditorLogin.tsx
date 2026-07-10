import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { Button, Card, CardBody, FieldHint, Input, Label } from '@/components/ui';

interface AuditorLoginResponse {
  token?: string;
  auditorToken?: string;
  accessToken?: string;
  message?: string;
}

function extractToken(payload: AuditorLoginResponse | undefined): string | undefined {
  if (!payload) return undefined;
  return payload.token ?? payload.auditorToken ?? payload.accessToken;
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

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const verify = useCallback(
    async (emailValue: string, token: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await api.post<AuditorLoginResponse>('/api/auditor/auth/login', {
          email: emailValue,
          token,
        });
        const issued = extractToken(res.data);
        if (issued) {
          localStorage.setItem('auditorToken', issued);
        }
        navigate('/auditor-portal');
      } catch (err) {
        setError(extractError(err, 'Verification failed. Please check the code and try again.'));
      } finally {
        setSubmitting(false);
      }
    },
    [navigate]
  );

  // Auto-verify when ?token=... is present.
  const autoVerifiedRef = useRef(false);
  useEffect(() => {
    if (autoVerifiedRef.current) return;
    const token = searchParams.get('token');
    if (!token) return;
    autoVerifiedRef.current = true;
    const emailParam = searchParams.get('email') ?? '';
    setStep(2);
    setEmail(emailParam);
    setCode(token);
    void verify(emailParam, token);
  }, [searchParams, verify]);

  const handleSendLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      await api.post('/api/auditor/auth/login', { email: email.trim() });
      setInfo('Check your inbox for a sign-in link and one-time code.');
      setStep(2);
    } catch (err) {
      setError(extractError(err, 'Could not send sign-in link. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = () => {
    if (!code.trim()) {
      setError('Please enter the one-time code from your email.');
      return;
    }
    void verify(email.trim(), code.trim());
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
            Use your work email to access the auditor portal.
          </p>
        </div>

        <Card>
          <CardBody density="comfy" className="space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <Label htmlFor="auditor-email" required>
                    Email address
                  </Label>
                  <Input
                    id="auditor-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !submitting) {
                        e.preventDefault();
                        void handleSendLink();
                      }
                    }}
                    invalid={!!error}
                  />
                  {error ? (
                    <FieldHint error>{error}</FieldHint>
                  ) : (
                    <FieldHint>We&apos;ll send you a one-time sign-in link.</FieldHint>
                  )}
                </div>

                <Button
                  fullWidth
                  size="lg"
                  loading={submitting}
                  disabled={!email.trim()}
                  onClick={handleSendLink}
                >
                  Send sign-in link
                </Button>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="auditor-email-readonly">Email address</Label>
                  <Input
                    id="auditor-email-readonly"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <Label htmlFor="auditor-code" required>
                    One-time code
                  </Label>
                  <Input
                    id="auditor-code"
                    type="text"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="Paste your code"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !submitting) {
                        e.preventDefault();
                        handleVerify();
                      }
                    }}
                    invalid={!!error}
                  />
                  {error ? (
                    <FieldHint error>{error}</FieldHint>
                  ) : info ? (
                    <FieldHint>{info}</FieldHint>
                  ) : (
                    <FieldHint>Paste the code from your email to continue.</FieldHint>
                  )}
                </div>

                <Button
                  fullWidth
                  size="lg"
                  loading={submitting}
                  disabled={!code.trim()}
                  onClick={handleVerify}
                >
                  Verify
                </Button>

                <Button
                  fullWidth
                  variant="ghost"
                  size="sm"
                  disabled={submitting}
                  onClick={() => {
                    setStep(1);
                    setCode('');
                    setError(null);
                    setInfo(null);
                  }}
                >
                  Use a different email
                </Button>
              </>
            )}
          </CardBody>
        </Card>

        <p className="text-center text-xs text-surface-500 mt-6">
          Having trouble? Contact your audit coordinator for assistance.
        </p>
      </div>
    </div>
  );
}
