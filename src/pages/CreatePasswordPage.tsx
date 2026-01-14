import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import { Layout } from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Textarea } from '../components/common/Input';
import { generatePassword, generatePasswordOptions } from '../utils/passwordGenerator';
import type { CreatePasswordForm, PasswordCreationResult } from '../types';
import styles from './CreatePasswordPage.module.css';

export function CreatePasswordPage() {
  const [form, setForm] = useState<CreatePasswordForm>({
    recipientEmail: '',
    recipientName: '',
    password: '',
    notes: '',
    sendNotification: false,
  });
  const [passwordOptions, setPasswordOptions] = useState<string[]>([]);
  const [result, setResult] = useState<PasswordCreationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'password' | 'link' | null>(null);

  const handleGeneratePasswords = () => {
    const options = generatePasswordOptions(4);
    setPasswordOptions(options);
  };

  const handleSelectPassword = (password: string) => {
    setForm({ ...form, password });
    setPasswordOptions([]);
  };

  const handleRegenerateOne = (index: number) => {
    const newOptions = [...passwordOptions];
    newOptions[index] = generatePassword();
    setPasswordOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const createPasswordLink = httpsCallable(functions, 'createPasswordLink');
      const response = await createPasswordLink({
        recipientEmail: form.recipientEmail,
        recipientName: form.recipientName,
        password: form.password,
        notes: form.notes,
        sendNotification: form.sendNotification,
      });

      const data = response.data as PasswordCreationResult;
      setResult(data);
    } catch (err) {
      console.error('Error creating password link:', err);
      setError('Failed to create password link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (type: 'password' | 'link') => {
    if (!result) return;

    const text = type === 'password' ? result.password : result.link;
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleReset = () => {
    setForm({
      recipientEmail: '',
      recipientName: '',
      password: '',
      notes: '',
      sendNotification: false,
    });
    setResult(null);
    setError(null);
    setPasswordOptions([]);
  };

  if (result) {
    return (
      <Layout>
        <div className={styles.page}>
          <Card className={styles.successCard}>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
            </div>
            <h2 className={styles.successTitle}>Password Link Created</h2>
            <p className={styles.successSubtitle}>
              Link created for {result.recipientEmail}
            </p>

            <div className={styles.resultSection}>
              <label className={styles.resultLabel}>Password</label>
              <div className={styles.resultValue}>
                <code>{result.password}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy('password')}
                >
                  {copied === 'password' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className={styles.resultSection}>
              <label className={styles.resultLabel}>One-Time Link</label>
              <div className={styles.resultValue}>
                <code className={styles.linkCode}>{result.link}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy('link')}
                >
                  {copied === 'link' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className={styles.successActions}>
              <Button variant="secondary" onClick={handleReset}>
                Create Another
              </Button>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.page}>
        <Card>
          <CardHeader>
            <CardTitle subtitle="Generate a secure one-time password link">
              Create Password Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <Input
                  label="Recipient Email"
                  type="email"
                  value={form.recipientEmail}
                  onChange={(e) =>
                    setForm({ ...form, recipientEmail: e.target.value })
                  }
                  placeholder="user@example.com"
                  required
                />
                <Input
                  label="Recipient Name"
                  value={form.recipientName}
                  onChange={(e) =>
                    setForm({ ...form, recipientName: e.target.value })
                  }
                  placeholder="John Smith"
                />
              </div>

              <div className={styles.passwordSection}>
                <div className={styles.passwordHeader}>
                  <label className={styles.passwordLabel}>Password</label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleGeneratePasswords}
                  >
                    Generate Options
                  </Button>
                </div>

                {passwordOptions.length > 0 && (
                  <div className={styles.passwordOptions}>
                    {passwordOptions.map((pwd, index) => (
                      <div key={index} className={styles.passwordOption}>
                        <code>{pwd}</code>
                        <div className={styles.passwordOptionActions}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRegenerateOne(index)}
                          >
                            ↻
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleSelectPassword(pwd)}
                          >
                            Use
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Input
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter or generate a password"
                  required
                />
              </div>

              <Textarea
                label="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes about this password (not shared with recipient)"
                rows={3}
              />

              <div className={styles.checkboxWrapper}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.sendNotification}
                    onChange={(e) =>
                      setForm({ ...form, sendNotification: e.target.checked })
                    }
                  />
                  <span className={styles.checkboxLabel}>
                    Send email notification to recipient
                  </span>
                </label>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.formActions}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                >
                  Create Password Link
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
