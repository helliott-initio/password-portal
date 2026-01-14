import { useState, useEffect } from 'react';
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
import { Layout } from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import type { PasswordDoc } from '../types';
import styles from './QueuePage.module.css';

type FilterStatus = 'all' | 'pending' | 'sent' | 'viewed' | 'expired' | 'revoked';
type FilterSource = 'all' | 'dashboard' | 'api' | 'batch';

export function QueuePage() {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState<PasswordDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadPasswords();
  }, [filterStatus, filterSource]);

  const loadPasswords = async () => {
    setLoading(true);
    try {
      const passwordsRef = collection(db, 'passwords');
      let q = query(passwordsRef, orderBy('createdAt', 'desc'));

      // Apply status filter
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

      // Apply source filter (client-side since Firestore doesn't support multiple where clauses well)
      if (filterSource !== 'all') {
        results = results.filter((p) => p.source === filterSource);
      }

      // Apply email search (client-side)
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
      alert('Email sent successfully!');
    } catch (error: unknown) {
      console.error('Error sending email:', error);
      const firebaseError = error as { code?: string; message?: string; details?: unknown };
      const errorMessage = firebaseError.message || firebaseError.code || 'Unknown error';
      alert(`Failed to send email: ${errorMessage}`);
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
    } catch (error) {
      console.error('Error revoking password:', error);
      alert('Failed to revoke password');
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
    } catch (error) {
      console.error('Error deleting password:', error);
      alert('Failed to delete password');
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
      setSelectedIds(new Set());
      await loadPasswords();
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      alert('Some emails may have failed to send');
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: PasswordDoc['status']) => {
    const statusStyles: Record<string, string> = {
      pending: styles.statusPending,
      sent: styles.statusSent,
      viewed: styles.statusViewed,
      expired: styles.statusExpired,
      revoked: styles.statusRevoked,
    };
    return (
      <span className={`${styles.statusBadge} ${statusStyles[status]}`}>
        {status}
      </span>
    );
  };

  const pendingCount = passwords.filter(
    (p) => p.status === 'pending' || p.status === 'sent'
  ).length;

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Password Queue</h1>
          <div className={styles.headerActions}>
            <Button
              variant="secondary"
              onClick={() => (window.location.href = '/admin/batch')}
            >
              Batch Upload
            </Button>
            <Button
              variant="primary"
              onClick={() => (window.location.href = '/admin/create')}
            >
              Create Link
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className={styles.filtersCard}>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className={styles.select}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Source</label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as FilterSource)}
                className={styles.select}
              >
                <option value="all">All Sources</option>
                <option value="dashboard">Dashboard</option>
                <option value="api">API</option>
                <option value="batch">Batch</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Search</label>
              <Input
                placeholder="Search by email or name..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>

            <Button variant="ghost" onClick={loadPasswords}>
              Refresh
            </Button>
          </div>
        </Card>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <Card className={styles.bulkActionsCard}>
            <div className={styles.bulkActions}>
              <span>{selectedIds.size} selected</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkSend}
                loading={actionLoading === 'bulk'}
              >
                Send Emails
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </Card>
        )}

        {/* Password list */}
        <Card>
          <CardHeader>
            <CardTitle subtitle={`${pendingCount} pending, ${passwords.length} total`}>
              Password Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : passwords.length === 0 ? (
              <div className={styles.empty}>
                <p>No password links found</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.checkboxCol}>
                        <input
                          type="checkbox"
                          checked={selectedIds.size === passwords.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Recipient</th>
                      <th>Created</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Viewed</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passwords.map((password) => (
                      <tr key={password.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(password.id)}
                            onChange={() => handleSelect(password.id)}
                          />
                        </td>
                        <td>
                          <div className={styles.recipient}>
                            <span className={styles.recipientName}>
                              {password.recipientName || 'Unknown'}
                            </span>
                            <span className={styles.recipientEmail}>
                              {password.recipientEmail}
                            </span>
                          </div>
                        </td>
                        <td className={styles.dateCell}>
                          {formatDate(password.createdAt)}
                          <span className={styles.createdBy}>
                            by {password.createdByEmail?.split('@')[0] || 'API'}
                          </span>
                        </td>
                        <td>
                          <span className={styles.sourceBadge}>{password.source}</span>
                        </td>
                        <td>{getStatusBadge(password.status)}</td>
                        <td className={styles.dateCell}>
                          {password.viewedAt ? (
                            <>
                              {formatDate(password.viewedAt)}
                              <span className={styles.viewedFrom}>
                                from {password.viewedFromIP}
                              </span>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <div className={styles.actions}>
                            {(password.status === 'pending' ||
                              password.status === 'sent') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSendEmail(password.id)}
                                  loading={actionLoading === password.id}
                                  disabled={!!actionLoading}
                                >
                                  {password.emailSent ? 'Resend' : 'Send'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevoke(password.id)}
                                  disabled={!!actionLoading}
                                >
                                  Revoke
                                </Button>
                              </>
                            )}
                            {user?.role === 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(password.id)}
                                disabled={!!actionLoading}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
