import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/common/Button';
import { generatePassword } from '../utils/passwordGenerator';
import type { PasswordDoc } from '../types';
import styles from './QueuePage.module.css';

type FilterStatus = 'all' | 'pending' | 'sent' | 'viewed' | 'expired' | 'revoked';

interface BatchRow {
  email: string;
  name: string;
  password: string;
  notes: string;
  valid: boolean;
  error?: string;
}

interface UploadResult {
  email: string;
  success: boolean;
  link?: string;
  error?: string;
}

export function QueuePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [passwords, setPasswords] = useState<PasswordDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Batch upload state
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchStep, setBatchStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchResults, setBatchResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPasswords();
  }, [filterStatus]);

  const loadPasswords = async () => {
    setLoading(true);
    try {
      const passwordsRef = collection(db, 'passwords');
      let q = query(passwordsRef, orderBy('createdAt', 'desc'));

      if (filterStatus !== 'all') {
        q = query(
          passwordsRef,
          where('status', '==', filterStatus),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      let results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PasswordDoc[];

      if (searchEmail) {
        const search = searchEmail.toLowerCase();
        results = results.filter(
          (p) =>
            p.recipientEmail.toLowerCase().includes(search) ||
            p.recipientName?.toLowerCase().includes(search)
        );
      }

      setPasswords(results);
    } catch (error) {
      console.error('Error loading passwords:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const stats = {
    total: passwords.length,
    pending: passwords.filter((p) => p.status === 'pending').length,
    sent: passwords.filter((p) => p.status === 'sent').length,
    viewed: passwords.filter((p) => p.status === 'viewed').length,
    expired: passwords.filter((p) => p.status === 'expired').length,
    revoked: passwords.filter((p) => p.status === 'revoked').length,
  };

  const handleSelectAll = () => {
    if (selectedIds.size === passwords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(passwords.map((p) => p.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSendEmail = async (passwordId: string) => {
    setActionLoading(passwordId);
    try {
      const sendEmail = httpsCallable(functions, 'sendPasswordEmail');
      await sendEmail({ passwordId });
      await loadPasswords();
      showToast('Email sent successfully!', 'success');
    } catch (error: unknown) {
      console.error('Error sending email:', error);
      const firebaseError = error as { code?: string; message?: string; details?: unknown };
      const errorMessage = firebaseError.message || firebaseError.code || 'Unknown error';
      showToast(`Failed to send email: ${errorMessage}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (passwordId: string) => {
    if (!confirm('Are you sure you want to revoke this password link?')) return;

    setActionLoading(passwordId);
    try {
      await updateDoc(doc(db, 'passwords', passwordId), {
        status: 'revoked',
      });
      await loadPasswords();
      showToast('Password link revoked', 'success');
    } catch (error) {
      console.error('Error revoking password:', error);
      showToast('Failed to revoke password', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (passwordId: string) => {
    if (!confirm('Are you sure you want to permanently delete this record?')) return;

    setActionLoading(passwordId);
    try {
      await deleteDoc(doc(db, 'passwords', passwordId));
      await loadPasswords();
      showToast('Record deleted', 'success');
    } catch (error) {
      console.error('Error deleting password:', error);
      showToast('Failed to delete password', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkSend = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Send emails to ${selectedIds.size} recipients?`)) return;

    setActionLoading('bulk');
    try {
      const sendEmail = httpsCallable(functions, 'sendPasswordEmail');
      for (const id of selectedIds) {
        await sendEmail({ passwordId: id });
      }
      const count = selectedIds.size;
      setSelectedIds(new Set());
      await loadPasswords();
      showToast(`Sent ${count} emails successfully`, 'success');
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      showToast('Some emails may have failed to send', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date: Date | { toDate: () => Date } | undefined) => {
    if (!date) return '-';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (date: Date | { toDate: () => Date } | undefined) => {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate();
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return '';
  };

  // Batch upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim());
    const parsedRows: BatchRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const [email, name, password, notes] = values;

      const row: BatchRow = {
        email: email || '',
        name: name || '',
        password: password || generatePassword(),
        notes: notes || '',
        valid: true,
      };

      if (!row.email || !row.email.includes('@')) {
        row.valid = false;
        row.error = 'Invalid email';
      }

      parsedRows.push(row);
    }

    setBatchRows(parsedRows);
    setBatchStep('preview');
  };

  const handleBatchUpload = async () => {
    const validRows = batchRows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setBatchUploading(true);
    const uploadResults: UploadResult[] = [];

    try {
      const createPasswordLink = httpsCallable(functions, 'createPasswordLink');

      for (const row of validRows) {
        try {
          const response = await createPasswordLink({
            recipientEmail: row.email,
            recipientName: row.name,
            password: row.password,
            notes: row.notes,
            sendNotification: false,
          });

          const data = response.data as { link: string };
          uploadResults.push({
            email: row.email,
            success: true,
            link: data.link,
          });
        } catch {
          uploadResults.push({
            email: row.email,
            success: false,
            error: 'Failed to create link',
          });
        }
      }

      setBatchResults(uploadResults);
      setBatchStep('results');
      await loadPasswords();
      showToast(`Created ${uploadResults.filter(r => r.success).length} password links`, 'success');
    } catch (error) {
      console.error('Batch upload error:', error);
      showToast('Batch upload failed', 'error');
    } finally {
      setBatchUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = 'email,name,password,notes\nuser@example.com,John Smith,,Optional notes\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'password-batch-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadResults = () => {
    const csv = [
      'email,success,link,error',
      ...batchResults.map(
        (r) => `${r.email},${r.success},${r.link || ''},${r.error || ''}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'password-batch-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const closeBatchPanel = () => {
    setBatchOpen(false);
    setBatchRows([]);
    setBatchResults([]);
    setBatchStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validBatchCount = batchRows.filter((r) => r.valid).length;

  return (
    <Layout>
      <div className={styles.page}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Password Queue</h1>
            <span className={styles.subtitle}>{stats.total} total links</span>
          </div>
          <div className={styles.headerActions}>
            <Button variant="secondary" onClick={() => setBatchOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17,8 12,3 7,8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Batch Upload
            </Button>
            <Button variant="primary" onClick={() => (window.location.href = '/admin/create')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Link
            </Button>
          </div>
        </header>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          <button
            className={`${styles.statCard} ${filterStatus === 'all' ? styles.active : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>All</span>
          </button>
          <button
            className={`${styles.statCard} ${styles.pending} ${filterStatus === 'pending' ? styles.active : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            <span className={styles.statValue}>{stats.pending}</span>
            <span className={styles.statLabel}>Pending</span>
            {stats.pending > 0 && <span className={styles.statDot} />}
          </button>
          <button
            className={`${styles.statCard} ${styles.sent} ${filterStatus === 'sent' ? styles.active : ''}`}
            onClick={() => setFilterStatus('sent')}
          >
            <span className={styles.statValue}>{stats.sent}</span>
            <span className={styles.statLabel}>Sent</span>
          </button>
          <button
            className={`${styles.statCard} ${styles.viewed} ${filterStatus === 'viewed' ? styles.active : ''}`}
            onClick={() => setFilterStatus('viewed')}
          >
            <span className={styles.statValue}>{stats.viewed}</span>
            <span className={styles.statLabel}>Viewed</span>
          </button>
          <button
            className={`${styles.statCard} ${styles.expired} ${filterStatus === 'expired' ? styles.active : ''}`}
            onClick={() => setFilterStatus('expired')}
          >
            <span className={styles.statValue}>{stats.expired + stats.revoked}</span>
            <span className={styles.statLabel}>Closed</span>
          </button>
        </div>

        {/* Search & Bulk Actions */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPasswords()}
            />
            {searchEmail && (
              <button className={styles.clearSearch} onClick={() => { setSearchEmail(''); loadPasswords(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className={styles.toolbarRight}>
            {selectedIds.size > 0 && (
              <div className={styles.bulkActions}>
                <span className={styles.selectedCount}>{selectedIds.size} selected</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkSend}
                  loading={actionLoading === 'bulk'}
                >
                  Send All
                </Button>
                <button className={styles.clearSelection} onClick={() => setSelectedIds(new Set())}>
                  Clear
                </button>
              </div>
            )}
            <button className={styles.refreshBtn} onClick={loadPasswords} title="Refresh">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23,4 23,10 17,10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.skeletonTable}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.skeletonRow}>
                  <div className={styles.skeletonCell} style={{ width: '40px' }} />
                  <div className={styles.skeletonCell} style={{ flex: 2 }} />
                  <div className={styles.skeletonCell} style={{ flex: 1 }} />
                  <div className={styles.skeletonCell} style={{ width: '80px' }} />
                  <div className={styles.skeletonCell} style={{ width: '100px' }} />
                </div>
              ))}
            </div>
          ) : passwords.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3>No password links found</h3>
              <p>
                {filterStatus !== 'all'
                  ? `No ${filterStatus} links. Try a different filter.`
                  : 'Create your first password link or upload a batch.'}
              </p>
              <div className={styles.emptyActions}>
                <Button variant="primary" onClick={() => (window.location.href = '/admin/create')}>
                  Create Link
                </Button>
                <Button variant="secondary" onClick={() => setBatchOpen(true)}>
                  Batch Upload
                </Button>
              </div>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.checkCol}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === passwords.length && passwords.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Recipient</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th className={styles.actionsCol}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {passwords.map((password) => (
                  <tr
                    key={password.id}
                    className={`${selectedIds.has(password.id) ? styles.selected : ''} ${password.status === 'viewed' ? styles.rowViewed : ''}`}
                  >
                    <td className={styles.checkCol}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(password.id)}
                        onChange={() => handleSelect(password.id)}
                      />
                    </td>
                    <td>
                      <div className={styles.recipient}>
                        <span className={styles.recipientName}>
                          {password.recipientName || password.recipientEmail.split('@')[0]}
                        </span>
                        <span className={styles.recipientEmail}>{password.recipientEmail}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.dateInfo}>
                        <span className={styles.dateMain}>{formatDate(password.createdAt)}</span>
                        <span className={styles.dateRelative}>{getRelativeTime(password.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status-${password.status}`]}`}>
                        {password.status === 'pending' && !password.emailSent && (
                          <span className={styles.statusDot} />
                        )}
                        {password.status}
                        {password.status === 'viewed' && password.viewedAt && (
                          <span className={styles.statusMeta}>
                            {formatDate(password.viewedAt)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={styles.actionsCol}>
                      <div className={styles.actions}>
                        {(password.status === 'pending' || password.status === 'sent') && (
                          <>
                            <button
                              className={`${styles.actionBtn} ${styles.primary}`}
                              onClick={() => handleSendEmail(password.id)}
                              disabled={!!actionLoading}
                              title={password.emailSent ? 'Resend email' : 'Send email'}
                            >
                              {actionLoading === password.id ? (
                                <span className={styles.spinner} />
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 2L11 13" />
                                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                                </svg>
                              )}
                              {password.emailSent ? 'Resend' : 'Send'}
                            </button>
                            <button
                              className={styles.actionBtn}
                              onClick={() => handleRevoke(password.id)}
                              disabled={!!actionLoading}
                              title="Revoke link"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                              </svg>
                            </button>
                          </>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => handleDelete(password.id)}
                            disabled={!!actionLoading}
                            title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3,6 5,6 21,6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Batch Upload Panel */}
      {batchOpen && (
        <>
          <div className={styles.overlay} onClick={closeBatchPanel} />
          <div className={styles.batchPanel}>
            <header className={styles.batchHeader}>
              <h2>Batch Upload</h2>
              <button className={styles.closeBtn} onClick={closeBatchPanel}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>

            <div className={styles.batchContent}>
              {batchStep === 'upload' && (
                <div className={styles.uploadStep}>
                  <div
                    className={styles.dropZone}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17,8 12,3 7,8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p>Drop CSV file here or click to browse</p>
                    <span>Supports .csv files</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      hidden
                    />
                  </div>

                  <button className={styles.templateBtn} onClick={handleDownloadTemplate}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download CSV Template
                  </button>

                  <div className={styles.formatHelp}>
                    <h4>CSV Format</h4>
                    <p>Required columns:</p>
                    <code>email, name, password, notes</code>
                    <p className={styles.helpNote}>Leave password blank to auto-generate friendly passwords</p>
                  </div>
                </div>
              )}

              {batchStep === 'preview' && (
                <div className={styles.previewStep}>
                  <div className={styles.previewStats}>
                    <div className={styles.previewStat}>
                      <span className={styles.previewStatValue}>{batchRows.length}</span>
                      <span>Total</span>
                    </div>
                    <div className={`${styles.previewStat} ${styles.valid}`}>
                      <span className={styles.previewStatValue}>{validBatchCount}</span>
                      <span>Valid</span>
                    </div>
                    <div className={`${styles.previewStat} ${styles.invalid}`}>
                      <span className={styles.previewStatValue}>{batchRows.length - validBatchCount}</span>
                      <span>Invalid</span>
                    </div>
                  </div>

                  <div className={styles.previewTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Name</th>
                          <th>Password</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchRows.slice(0, 10).map((row, i) => (
                          <tr key={i} className={!row.valid ? styles.invalidRow : ''}>
                            <td>{row.email}</td>
                            <td>{row.name || '-'}</td>
                            <td><code>{row.password}</code></td>
                            <td>
                              {row.valid ? (
                                <span className={styles.validBadge}>Ready</span>
                              ) : (
                                <span className={styles.invalidBadge}>{row.error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {batchRows.length > 10 && (
                      <p className={styles.moreRows}>+ {batchRows.length - 10} more rows</p>
                    )}
                  </div>

                  <div className={styles.previewActions}>
                    <Button variant="ghost" onClick={() => { setBatchStep('upload'); setBatchRows([]); }}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleBatchUpload}
                      loading={batchUploading}
                      disabled={validBatchCount === 0}
                    >
                      Create {validBatchCount} Links
                    </Button>
                  </div>
                </div>
              )}

              {batchStep === 'results' && (
                <div className={styles.resultsStep}>
                  <div className={styles.resultsIcon}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22,4 12,14.01 9,11.01" />
                    </svg>
                  </div>
                  <h3>{batchResults.filter(r => r.success).length} links created</h3>
                  {batchResults.some(r => !r.success) && (
                    <p className={styles.failedNote}>
                      {batchResults.filter(r => !r.success).length} failed
                    </p>
                  )}

                  <div className={styles.resultsActions}>
                    <Button variant="secondary" onClick={handleDownloadResults}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7,10 12,15 17,10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download Results
                    </Button>
                    <Button variant="primary" onClick={closeBatchPanel}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
