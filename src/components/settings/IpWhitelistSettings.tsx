import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type { IpWhitelistDoc } from '../../types';
import styles from './Settings.module.css';

export function IpWhitelistSettings() {
  const { user } = useAuth();
  const [ips, setIps] = useState<IpWhitelistDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    loadIps();
  }, []);

  const loadIps = async () => {
    try {
      const ipsRef = collection(db, 'ip_whitelist');
      const q = query(ipsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const ipList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as IpWhitelistDoc[];

      setIps(ipList);
    } catch (error) {
      console.error('Error loading IP whitelist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newIp.trim()) return;

    setAdding(true);
    try {
      await addDoc(collection(db, 'ip_whitelist'), {
        ip: newIp.trim(),
        description: newDescription.trim(),
        createdBy: user?.id || '',
        createdByEmail: user?.email || '',
        createdAt: serverTimestamp(),
      });

      setNewIp('');
      setNewDescription('');
      setShowAddForm(false);
      await loadIps();
    } catch (error) {
      console.error('Error adding IP:', error);
      alert('Failed to add IP');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (ipId: string) => {
    if (!confirm('Are you sure you want to remove this IP?')) return;

    try {
      await deleteDoc(doc(db, 'ip_whitelist', ipId));
      await loadIps();
    } catch (error) {
      console.error('Error deleting IP:', error);
      alert('Failed to delete IP');
    }
  };

  const formatDate = (date: Date | { toDate: () => Date } | undefined) => {
    if (!date) return '-';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle subtitle="Control which IPs can access the API">
          IP Whitelist
        </CardTitle>
        <Button variant="primary" onClick={() => setShowAddForm(true)}>
          Add IP
        </Button>
      </CardHeader>
      <CardContent>
        {/* Add form */}
        {showAddForm && (
          <div className={styles.formBox}>
            <h4>Add IP Address</h4>
            <div className={styles.formGrid}>
              <Input
                label="IP Address"
                placeholder="e.g., 192.168.1.100 or 10.0.0.0/24"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
              />
              <Input
                label="Description"
                placeholder="e.g., Office server"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className={styles.formActions}>
              <Button
                variant="primary"
                onClick={handleAdd}
                loading={adding}
                disabled={!newIp.trim()}
              >
                Add
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className={styles.infoBox}>
          <p>
            <strong>Note:</strong> If no IPs are whitelisted, the API will accept
            requests from any IP. Add IPs to restrict access.
          </p>
        </div>

        {/* IPs list */}
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : ips.length === 0 ? (
          <div className={styles.empty}>
            <p>No IPs whitelisted. API is currently open to all IPs.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Description</th>
                <th>Added By</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ips.map((ip) => (
                <tr key={ip.id}>
                  <td>
                    <code>{ip.ip}</code>
                  </td>
                  <td>{ip.description || '-'}</td>
                  <td>{ip.createdByEmail?.split('@')[0] || '-'}</td>
                  <td>{formatDate(ip.createdAt)}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(ip.id)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
