import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import type { AuditLogDoc } from '../../types';
import styles from './Settings.module.css';

type FilterAction = 'all' | 'create' | 'view' | 'send_email' | 'revoke' | 'api_call' | 'settings_change';

export function AuditLogSettings() {
  const [logs, setLogs] = useState<AuditLogDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<FilterAction>('all');
  const [pageSize] = useState(50);

  useEffect(() => {
    loadLogs();
  }, [filterAction]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const logsRef = collection(db, 'audit_logs');
      let q;

      if (filterAction === 'all') {
        q = query(logsRef, orderBy('timestamp', 'desc'), limit(pageSize));
      } else {
        q = query(
          logsRef,
          where('action', '==', filterAction),
          orderBy('timestamp', 'desc'),
          limit(pageSize)
        );
      }

      const snapshot = await getDocs(q);
      const logList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLogDoc[];

      setLogs(logList);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      'timestamp,action,actor,target,ip,details',
      ...logs.map((log) => {
        const timestamp = log.timestamp instanceof Date
          ? log.timestamp.toISOString()
          : (log.timestamp as Timestamp).toDate().toISOString();
        return `${timestamp},${log.action},${log.actorEmail || ''},${log.targetId || ''},${log.ip},${JSON.stringify(log.details)}`;
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      second: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    const actionStyles: Record<string, string> = {
      create: styles.actionCreate,
      view: styles.actionView,
      send_email: styles.actionEmail,
      revoke: styles.actionRevoke,
      api_call: styles.actionApi,
      settings_change: styles.actionSettings,
      regenerate: styles.actionCreate,
    };

    return (
      <span className={`${styles.actionBadge} ${actionStyles[action] || ''}`}>
        {action.replace('_', ' ')}
      </span>
    );
  };

  const formatDetails = (details: Record<string, unknown>) => {
    const entries = Object.entries(details).slice(0, 3);
    return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle subtitle="View all system activity">
          Audit Log
        </CardTitle>
        <Button variant="secondary" onClick={handleExport}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className={styles.filterRow}>
          <label>Filter by action:</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as FilterAction)}
            className={styles.filterSelect}
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="view">View</option>
            <option value="send_email">Send Email</option>
            <option value="revoke">Revoke</option>
            <option value="api_call">API Call</option>
            <option value="settings_change">Settings Change</option>
          </select>
          <Button variant="ghost" size="sm" onClick={loadLogs}>
            Refresh
          </Button>
        </div>

        {/* Logs list */}
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : logs.length === 0 ? (
          <div className={styles.empty}>
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target</th>
                  <th>IP</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.timestampCell}>
                      {formatDate(log.timestamp)}
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    <td>{log.actorEmail?.split('@')[0] || 'System'}</td>
                    <td>
                      {log.targetId ? (
                        <code className={styles.targetId}>
                          {log.targetId.substring(0, 8)}...
                        </code>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <code className={styles.ip}>{log.ip}</code>
                    </td>
                    <td className={styles.detailsCell}>
                      {formatDetails(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
