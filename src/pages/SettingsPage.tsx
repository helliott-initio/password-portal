import { useState } from 'react';
import { useIsAdmin } from '../hooks/useAuth';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/common/Card';
import { ApiKeysSettings } from '../components/settings/ApiKeysSettings';
import { IpWhitelistSettings } from '../components/settings/IpWhitelistSettings';
import { WordListsSettings } from '../components/settings/WordListsSettings';
import { UsersSettings } from '../components/settings/UsersSettings';
import { EmailTemplatesSettings } from '../components/settings/EmailTemplatesSettings';
import { AuditLogSettings } from '../components/settings/AuditLogSettings';
import styles from './SettingsPage.module.css';

type SettingsTab = 'api-keys' | 'ip-whitelist' | 'word-lists' | 'users' | 'email-templates' | 'audit-log';

export function SettingsPage() {
  const isAdmin = useIsAdmin();
  const [activeTab, setActiveTab] = useState<SettingsTab>('api-keys');

  if (!isAdmin) {
    return (
      <Layout>
        <div className={styles.page}>
          <Card className={styles.accessDenied}>
            <h2>Access Denied</h2>
            <p>You need admin privileges to access settings.</p>
          </Card>
        </div>
      </Layout>
    );
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'api-keys', label: 'API Keys' },
    { id: 'ip-whitelist', label: 'IP Whitelist' },
    { id: 'word-lists', label: 'Word Lists' },
    { id: 'users', label: 'Users' },
    { id: 'email-templates', label: 'Email Templates' },
    { id: 'audit-log', label: 'Audit Log' },
  ];

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
        </div>

        <div className={styles.container}>
          <nav className={styles.sidebar}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className={styles.content}>
            {activeTab === 'api-keys' && <ApiKeysSettings />}
            {activeTab === 'ip-whitelist' && <IpWhitelistSettings />}
            {activeTab === 'word-lists' && <WordListsSettings />}
            {activeTab === 'users' && <UsersSettings />}
            {activeTab === 'email-templates' && <EmailTemplatesSettings />}
            {activeTab === 'audit-log' && <AuditLogSettings />}
          </div>
        </div>
      </div>
    </Layout>
  );
}
