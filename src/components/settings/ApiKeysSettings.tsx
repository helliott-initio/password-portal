import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type { ApiKeyDoc } from '../../types';
import styles from './Settings.module.css';

interface NewApiKey {
  id: string;
  apiKey: string;
  name: string;
  keyPrefix: string;
}

export function ApiKeysSettings() {
  const [apiKeys, setApiKeys] = useState<ApiKeyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<NewApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const keysRef = collection(db, 'api_keys');
      const q = query(keysRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const keys = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ApiKeyDoc[];

      setApiKeys(keys);
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;

    setCreating(true);
    try {
      const createApiKey = httpsCallable(functions, 'createApiKey');
      const response = await createApiKey({ name: newKeyName });
      const data = response.data as NewApiKey;

      setNewlyCreatedKey(data);
      setNewKeyName('');
      setShowCreateForm(false);
      await loadApiKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (keyId: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'api_keys', keyId), {
        active: !currentActive,
      });
      await loadApiKeys();
    } catch (error) {
      console.error('Error toggling API key:', error);
      alert('Failed to update API key');
    }
  };

  const handleCopyKey = async () => {
    if (!newlyCreatedKey) return;
    await navigator.clipboard.writeText(newlyCreatedKey.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (date: Date | { toDate: () => Date } | undefined) => {
    if (!date) return 'Never';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader
        action={
          <Button variant="primary" onClick={() => setShowCreateForm(true)}>
            Create API Key
          </Button>
        }
      >
        <CardTitle subtitle="Manage API keys for external integrations">
          API Keys
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* New key created modal */}
        {newlyCreatedKey && (
          <div className={styles.alertBox}>
            <div className={styles.alertHeader}>
              <strong>API Key Created</strong>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewlyCreatedKey(null)}
              >
                ×
              </Button>
            </div>
            <p className={styles.alertText}>
              Copy this key now. You won't be able to see it again.
            </p>
            <div className={styles.keyDisplay}>
              <code>{newlyCreatedKey.apiKey}</code>
              <Button variant="secondary" size="sm" onClick={handleCopyKey}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <div className={styles.formBox}>
            <h4>Create New API Key</h4>
            <div className={styles.formRow}>
              <Input
                placeholder="Key name (e.g., Salamander Production)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <Button
                variant="primary"
                onClick={handleCreate}
                loading={creating}
                disabled={!newKeyName.trim()}
              >
                Create
              </Button>
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* API Documentation */}
        <div className={styles.apiDocs}>
          <h4>API Documentation</h4>
          <p className={styles.helpText}>
            Use the API to programmatically create password links from external systems.
          </p>

          <div className={styles.apiSection}>
            <h5>Endpoint</h5>
            <code className={styles.codeBlock}>
              POST https://europe-west2-password-portal-a7053.cloudfunctions.net/api
            </code>
          </div>

          <div className={styles.apiSection}>
            <h5>Headers</h5>
            <code className={styles.codeBlock}>
              {`Content-Type: application/json
X-API-Key: your-api-key-here`}
            </code>
          </div>

          <div className={styles.apiSection}>
            <h5>Request Body</h5>
            <code className={styles.codeBlock}>
              {`{
  "recipientEmail": "user@example.com",
  "recipientName": "John Smith",
  "password": "SecurePassword123",
  "notes": "Optional internal notes",
  "sendEmail": false
}`}
            </code>
          </div>

          <div className={styles.apiSection}>
            <h5>Example (cURL)</h5>
            <code className={styles.codeBlock}>
              {`curl -X POST \\
  https://europe-west2-password-portal-a7053.cloudfunctions.net/api \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key-here" \\
  -d '{
    "recipientEmail": "user@example.com",
    "recipientName": "John Smith",
    "password": "SecurePassword123"
  }'`}
            </code>
          </div>

          <div className={styles.apiSection}>
            <h5>Response</h5>
            <code className={styles.codeBlock}>
              {`{
  "success": true,
  "id": "uuid-of-password-link",
  "link": "https://password.initiolearning.org/p/uuid",
  "status": "pending"
}`}
            </code>
          </div>
        </div>

        {/* Keys list */}
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : apiKeys.length === 0 ? (
          <div className={styles.empty}>
            <p>No API keys created yet</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Key Prefix</th>
                <th>Created</th>
                <th>Last Used</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id}>
                  <td className={styles.nameCell}>{key.name}</td>
                  <td>
                    <code>{key.keyPrefix}...</code>
                  </td>
                  <td>{formatDate(key.createdAt)}</td>
                  <td>{formatDate(key.lastUsed)}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        key.active ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      {key.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(key.id, key.active)}
                    >
                      {key.active ? 'Disable' : 'Enable'}
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
