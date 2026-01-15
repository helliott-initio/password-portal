import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import styles from './PasswordViewPage.module.css';

type ViewState = 'loading' | 'ready' | 'revealed' | 'error' | 'expired';

interface PasswordData {
  password: string;
  recipientName?: string;
}

export function PasswordViewPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<ViewState>('loading');
  const [password, setPassword] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkPasswordLink();
  }, [id]);

  const checkPasswordLink = async () => {
    if (!id) {
      setState('error');
      setError('Invalid link');
      return;
    }

    try {
      const checkLink = httpsCallable(functions, 'checkPasswordLink');
      const response = await checkLink({ id });
      const data = response.data as { valid: boolean; recipientName?: string };

      if (data.valid) {
        setRecipientName(data.recipientName || '');
        setState('ready');
      } else {
        setState('expired');
      }
    } catch (err) {
      console.error('Error checking password link:', err);
      setState('expired');
    }
  };

  const handleRevealPassword = async () => {
    setState('loading');

    try {
      const viewPassword = httpsCallable(functions, 'viewPassword');
      const response = await viewPassword({ id });
      const data = response.data as PasswordData;

      setPassword(data.password);
      setState('revealed');
    } catch (err) {
      console.error('Error revealing password:', err);
      setState('error');
      setError('Failed to retrieve password. The link may have already been used.');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        {state === 'loading' && (
          <div className={styles.content}>
            <div className={styles.spinner}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            </div>
            <p className={styles.loadingText}>Loading...</p>
          </div>
        )}

        {state === 'ready' && (
          <div className={styles.content}>
            <h1 className={styles.title}>Your Password</h1>
            {recipientName && (
              <p className={styles.greeting}>Hello {recipientName}</p>
            )}
            <p className={styles.description}>
              Click the button below to reveal your password. This link can only
              be used once.
            </p>
            <button className={styles.revealButton} onClick={handleRevealPassword}>
              Reveal Password
            </button>
            <p className={styles.warning}>
              Once revealed, this link will expire immediately.
            </p>
          </div>
        )}

        {state === 'revealed' && (
          <div className={styles.content}>
            <h1 className={styles.title}>Your Password</h1>
            <div className={styles.passwordDisplay}>
              <code>{password}</code>
            </div>
            <button
              className={styles.copyButton}
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <p className={styles.instructions}>
              Please save this password securely. This page will not be
              accessible again.
            </p>
          </div>
        )}

        {state === 'expired' && (
          <div className={styles.content}>
            <div className={styles.expiredIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <circle cx="12" cy="16" r="0.5" fill="currentColor" />
              </svg>
            </div>
            <h1 className={styles.title}>Link Expired</h1>
            <p className={styles.description}>
              This password link has already been used or has expired.
            </p>
            <p className={styles.helpText}>
              If you need a new password, please contact your IT team.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className={styles.content}>
            <div className={styles.errorIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 className={styles.title}>Error</h1>
            <p className={styles.description}>{error}</p>
            <p className={styles.helpText}>
              Please contact your IT team for assistance.
            </p>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <p>Central IT Team - Initio Learning Trust</p>
      </footer>
    </div>
  );
}
