import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import { Layout } from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input, Textarea } from '../components/common/Input';
import { PasswordList } from '../components/common/PasswordList';
import { generateBatch, generatePassword, type PasswordMode } from '../utils/passwordGenerator';
import type { GeneratedPassword, PasswordCreationResult } from '../types';
import styles from './CreatePasswordPage.module.css';

const QUANTITY_PRESETS = [1, 10, 25, 50, 100, 500];

function toBatchPasswords(batch: ReturnType<typeof generateBatch>): GeneratedPassword[] {
  return batch.map((p) => ({ id: p.id, value: p.password, copied: false }));
}

export function CreatePasswordPage() {
  const [passwords, setPasswords] = useState<GeneratedPassword[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('simple');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [sendNotification, setSendNotification] = useState(false);
  const [result, setResult] = useState<PasswordCreationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'password' | 'link' | null>(null);

  const generatePasswords = useCallback((count: number, mode: PasswordMode) => {
    const batch = generateBatch(count, { mode });
    setPasswords(toBatchPasswords(batch));
  }, []);

  // Auto-generate on mount and when mode changes
  useEffect(() => {
    generatePasswords(quantity, passwordMode);
  }, [passwordMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = () => {
    generatePasswords(quantity, passwordMode);
  };

  const handleQuantityChange = (value: string) => {
    const num = Math.max(1, Math.min(1000, parseInt(value, 10) || 1));
    setQuantity(num);
  };

  const handleCopyPassword = async (id: string) => {
    const pw = passwords.find((p) => p.id === id);
    if (!pw) return;
    await navigator.clipboard.writeText(pw.value);
    setPasswords((prev) =>
      prev.map((p) => (p.id === id ? { ...p, copied: true } : p))
    );
    setTimeout(() => {
      setPasswords((prev) =>
        prev.map((p) => (p.id === id ? { ...p, copied: false } : p))
      );
    }, 2000);
  };

  const handleCopyAll = async () => {
    const allPasswords = passwords.map((p) => p.value).join('\n');
    await navigator.clipboard.writeText(allPasswords);
  };

  const handleRegenerateSingle = (id: string) => {
    const newPassword = generatePassword({ mode: passwordMode });
    setPasswords((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, value: newPassword, copied: false }
          : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.length === 0) return;
    setError(null);
    setLoading(true);

    try {
      const createPasswordLink = httpsCallable(functions, 'createPasswordLink');
      const response = await createPasswordLink({
        recipientEmail,
        recipientName,
        password: passwords[0].value,
        notes,
        sendNotification,
      });

      const data = response.data as PasswordCreationResult;
      setResult(data);
    } catch (err) {
      setError('Failed to create password link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResult = async (type: 'password' | 'link') => {
    if (!result) return;
    const text = type === 'password' ? result.password : result.link;
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleReset = () => {
    setRecipientEmail('');
    setRecipientName('');
    setNotes('');
    setSendNotification(false);
    setResult(null);
    setError(null);
    generatePasswords(quantity, passwordMode);
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
                  onClick={() => handleCopyResult('password')}
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
                  onClick={() => handleCopyResult('link')}
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
            <CardTitle subtitle="Generate secure passwords">
              Password Generator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.form}>
              <div className={styles.passwordSection}>
                <div className={styles.passwordHeader}>
                  <label className={styles.passwordLabel}>Mode</label>
                </div>

                {/* Mode Toggle */}
                <div className={styles.modeToggle}>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${passwordMode === 'simple' ? styles.active : ''}`}
                    onClick={() => setPasswordMode('simple')}
                  >
                    <span className={styles.modeIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12h8" />
                      </svg>
                    </span>
                    <span className={styles.modeContent}>
                      <span className={styles.modeName}>Simple</span>
                      <span className={styles.modeExample}>TreeBridge47</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${passwordMode === 'secure' ? styles.active : ''}`}
                    onClick={() => setPasswordMode('secure')}
                  >
                    <span className={styles.modeIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <span className={styles.modeContent}>
                      <span className={styles.modeName}>Secure</span>
                      <span className={styles.modeExample}>Movie3Cartoon)Bottle</span>
                    </span>
                  </button>
                </div>

                {/* Quantity Controls */}
                <div className={styles.quantitySection}>
                  <label className={styles.passwordLabel}>Quantity</label>
                  <div className={styles.quantityControls}>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      min={1}
                      max={1000}
                    />
                    <div className={styles.presetButtons}>
                      {QUANTITY_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`${styles.presetBtn} ${quantity === preset ? styles.active : ''}`}
                          onClick={() => setQuantity(preset)}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button variant="primary" onClick={handleGenerate}>
                  Generate
                </Button>
              </div>

              {/* Password List */}
              {passwords.length > 0 && (
                <PasswordList
                  passwords={passwords}
                  onCopy={handleCopyPassword}
                  onCopyAll={handleCopyAll}
                  onRegenerate={handleRegenerateSingle}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Password Link Section */}
        <Card>
          <CardHeader>
            <CardTitle subtitle="Send a password securely via one-time link">
              Create Password Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showLinkForm ? (
              <Button variant="secondary" onClick={() => setShowLinkForm(true)}>
                Create Password Link
              </Button>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGrid}>
                  <Input
                    label="Recipient Email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                  <Input
                    label="Recipient Name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="John Smith"
                  />
                </div>

                <div className={styles.passwordSection}>
                  <div className={styles.passwordHeader}>
                    <label className={styles.passwordLabel}>Password</label>
                  </div>
                  <div className={styles.generatedPassword}>
                    <code className={styles.passwordCode}>
                      {passwords.length > 0 ? passwords[0].value : ''}
                    </code>
                  </div>
                  <p className={styles.helperText}>
                    Uses the first generated password above
                  </p>
                </div>

                <Textarea
                  label="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes about this password (not shared with recipient)"
                  rows={3}
                />

                <div className={styles.checkboxWrapper}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                    />
                    <span className={styles.checkboxLabel}>
                      Send email notification to recipient
                    </span>
                  </label>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.formActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowLinkForm(false)}
                  >
                    Cancel
                  </Button>
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
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
