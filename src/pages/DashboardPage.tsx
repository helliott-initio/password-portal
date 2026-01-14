import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Layout } from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import type { DashboardStats, PasswordDoc } from '../types';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayCount: 0,
    pendingCount: 0,
    viewedToday: 0,
    weekCount: 0,
  });
  const [recentLinks, setRecentLinks] = useState<PasswordDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      const passwordsRef = collection(db, 'passwords');

      // Get today's links
      const todayQuery = query(
        passwordsRef,
        where('createdAt', '>=', Timestamp.fromDate(todayStart))
      );
      const todaySnap = await getDocs(todayQuery);

      // Get pending links
      const pendingQuery = query(
        passwordsRef,
        where('status', 'in', ['pending', 'sent'])
      );
      const pendingSnap = await getDocs(pendingQuery);

      // Get this week's links
      const weekQuery = query(
        passwordsRef,
        where('createdAt', '>=', Timestamp.fromDate(weekStart))
      );
      const weekSnap = await getDocs(weekQuery);

      // Count viewed today
      let viewedToday = 0;
      todaySnap.docs.forEach((doc) => {
        if (doc.data().status === 'viewed') {
          viewedToday++;
        }
      });

      setStats({
        todayCount: todaySnap.size,
        pendingCount: pendingSnap.size,
        viewedToday,
        weekCount: weekSnap.size,
      });

      // Get recent links for the table
      const recent = pendingSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as PasswordDoc))
        .slice(0, 10);
      setRecentLinks(recent);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | { toDate: () => Date }) => {
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
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

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          <Link to="/admin/create">
            <Button variant="primary">Create Password Link</Button>
          </Link>
        </div>

        {/* Stats cards */}
        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <div className={styles.statValue}>{stats.todayCount}</div>
            <div className={styles.statLabel}>Created Today</div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statValue}>{stats.pendingCount}</div>
            <div className={styles.statLabel}>Pending / Sent</div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statValue}>{stats.viewedToday}</div>
            <div className={styles.statLabel}>Viewed Today</div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statValue}>{stats.weekCount}</div>
            <div className={styles.statLabel}>This Week</div>
          </Card>
        </div>

        {/* Recent links */}
        <Card>
          <CardHeader>
            <CardTitle subtitle="Recent password links awaiting view">
              Pending Links
            </CardTitle>
            <Link to="/admin/queue">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : recentLinks.length === 0 ? (
              <div className={styles.empty}>
                <p>No pending password links</p>
                <Link to="/admin/create">
                  <Button variant="secondary" size="sm">
                    Create your first link
                  </Button>
                </Link>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Created</th>
                      <th>Source</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLinks.map((link) => (
                      <tr key={link.id}>
                        <td>
                          <div className={styles.recipient}>
                            <span className={styles.recipientName}>
                              {link.recipientName || 'Unknown'}
                            </span>
                            <span className={styles.recipientEmail}>
                              {link.recipientEmail}
                            </span>
                          </div>
                        </td>
                        <td>{formatDate(link.createdAt)}</td>
                        <td>
                          <span className={styles.sourceBadge}>
                            {link.source}
                          </span>
                        </td>
                        <td>{getStatusBadge(link.status)}</td>
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
