import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, Timestamp, limit, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useDelayedLoading } from '../hooks/useDelayedLoading';
import { Layout } from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { SkeletonStats, SkeletonTable } from '../components/common/LoadingSkeleton';
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
  const showSkeleton = useDelayedLoading(loading);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);

        const passwordsRef = collection(db, 'passwords');

        // Bound each query so dashboard stays fast even with a large collection.
        const [todaySnap, pendingSnap, weekSnap] = await Promise.all([
          getDocs(
            query(
              passwordsRef,
              where('createdAt', '>=', Timestamp.fromDate(todayStart)),
              limit(500)
            )
          ),
          getDocs(
            query(
              passwordsRef,
              where('status', 'in', ['pending', 'sent']),
              orderBy('createdAt', 'desc'),
              limit(50)
            )
          ),
          getDocs(
            query(
              passwordsRef,
              where('createdAt', '>=', Timestamp.fromDate(weekStart)),
              limit(1000)
            )
          ),
        ]);

        if (cancelled) return;

        let viewedToday = 0;
        todaySnap.docs.forEach((doc) => {
          if (doc.data().status === 'viewed') viewedToday++;
        });

        setStats({
          todayCount: todaySnap.size,
          pendingCount: pendingSnap.size,
          viewedToday,
          weekCount: weekSnap.size,
        });

        const recent = pendingSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as PasswordDoc))
          .slice(0, 10);
        setRecentLinks(recent);
      } catch (error) {
        if (!cancelled) console.error('Error loading dashboard data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

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
      <ErrorBoundary>
        <div className={styles.page}>
          <div className={styles.header}>
            <h1 className={styles.title}>Dashboard</h1>
            <Link to="/admin/create">
              <Button variant="primary">Create Password Link</Button>
            </Link>
          </div>

          {/* Stats cards */}
          <AnimatePresence mode="wait">
            {showSkeleton ? (
              <motion.div
                key="stats-skel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SkeletonStats count={4} />
              </motion.div>
            ) : loading ? null : (
              <motion.div
                key="stats"
                className={styles.statsGrid}
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
                }}
              >
                {[
                  { value: stats.todayCount, label: 'Created Today' },
                  { value: stats.pendingCount, label: 'Pending / Sent' },
                  { value: stats.viewedToday, label: 'Viewed Today' },
                  { value: stats.weekCount, label: 'This Week' },
                ].map((s) => (
                  <motion.div
                    key={s.label}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
                    }}
                  >
                    <Card className={styles.statCard}>
                      <div className={styles.statValue}>{s.value}</div>
                      <div className={styles.statLabel}>{s.label}</div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent links */}
          <Card>
            <CardHeader
              action={
                <Link to="/admin/queue">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              }
            >
              <CardTitle subtitle="Recent password links awaiting view">
                Pending Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showSkeleton ? (
                <SkeletonTable rows={5} columns={[{ flex: 2 }, { flex: 1 }, { width: '100px' }, { width: '100px' }]} />
              ) : loading ? null : recentLinks.length === 0 ? (
                <div className={styles.empty}>
                  <p>No pending password links</p>
                  <Link to="/admin/create">
                    <Button variant="secondary" size="sm">
                      Create Link
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
      </ErrorBoundary>
    </Layout>
  );
}
