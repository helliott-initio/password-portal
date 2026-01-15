import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type { UserDoc } from '../../types';
import styles from './Settings.module.css';

export function UsersSettings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'technician'>('technician');
  const [adding, setAdding] = useState(false);

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

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) return;

    // Basic email validation
    if (!newUserEmail.includes('@') || !newUserEmail.includes('.')) {
      alert('Please enter a valid email address');
      return;
    }

    // Check if user already exists
    const existingUser = users.find(
      (u) => u.email.toLowerCase() === newUserEmail.toLowerCase()
    );
    if (existingUser) {
      alert('This user already exists');
      return;
    }

    setAdding(true);
    try {
      // Create a placeholder user document
      // The ID will be the email address (normalized) until they sign in
      const tempId = newUserEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');

      await setDoc(doc(db, 'users', tempId), {
        email: newUserEmail.toLowerCase(),
        displayName: newUserEmail.split('@')[0],
        role: newUserRole,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email,
        pending: true, // Flag to indicate they haven't signed in yet
      });

      setNewUserEmail('');
      setNewUserRole('technician');
      setShowAddForm(false);
      await loadUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user');
    } finally {
      setAdding(false);
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

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    if (userId === currentUser?.id) {
      alert('You cannot remove yourself');
      return;
    }

    if (!confirm(`Remove ${userEmail} from the system? They will no longer be able to access the portal.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      await loadUsers();
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user');
    }
  };

  return (
    <Card>
      <CardHeader
        action={
          <Button variant="primary" onClick={() => setShowAddForm(true)}>
            Add User
          </Button>
        }
      >
        <CardTitle subtitle="Manage user access and roles">
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

        {/* Add user form */}
        {showAddForm && (
          <div className={styles.formBox}>
            <h4>Add New User</h4>
            <p className={styles.helpText}>
              Add a user's email to grant them access. They must sign in with their Google account.
            </p>
            <div className={styles.formGrid}>
              <Input
                placeholder="user@initiolearning.org"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'technician')}
                className={styles.roleSelect}
              >
                <option value="technician">Technician</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className={styles.formActions}>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddUser}
                loading={adding}
                disabled={!newUserEmail.trim()}
              >
                Add User
              </Button>
            </div>
          </div>
        )}

        {/* Users list */}
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>
            <p>No users yet. Add your first user above.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
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
                      <span>{user.displayName || user.email.split('@')[0]}</span>
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
                  <td>
                    {user.pending ? (
                      <span className={styles.statusBadge}>Pending</span>
                    ) : (
                      <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                        Active
                      </span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionGroup}>
                      {user.id !== currentUser?.id ? (
                        <>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUser(user.id, user.email)}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <span className={styles.youBadge}>You</span>
                      )}
                    </div>
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
