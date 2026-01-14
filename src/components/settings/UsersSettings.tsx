import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { UserDoc } from '../../types';
import styles from './Settings.module.css';

export function UsersSettings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('email'));
      const snapshot = await getDocs(q);

      const userList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserDoc[];

      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'technician') => {
    if (userId === currentUser?.id) {
      alert('You cannot change your own role');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
      });
      await loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle subtitle="Manage user roles and permissions">
          Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Role info */}
        <div className={styles.infoBox}>
          <p>
            <strong>Admin:</strong> Full access to all features including settings.
          </p>
          <p>
            <strong>Technician:</strong> Can create and manage password links.
          </p>
        </div>

        {/* Users list */}
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className={styles.userCell}>
                      {user.photoURL && (
                        <img
                          src={user.photoURL}
                          alt=""
                          className={styles.avatar}
                        />
                      )}
                      <span>{user.displayName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span
                      className={`${styles.roleBadge} ${
                        user.role === 'admin' ? styles.roleAdmin : styles.roleTechnician
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td>{formatDate(user.lastLogin)}</td>
                  <td>
                    {user.id !== currentUser?.id && (
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleChangeRole(
                            user.id,
                            e.target.value as 'admin' | 'technician'
                          )
                        }
                        className={styles.roleSelect}
                      >
                        <option value="technician">Technician</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    {user.id === currentUser?.id && (
                      <span className={styles.youBadge}>You</span>
                    )}
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
