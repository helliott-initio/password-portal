import { useState, useEffect } from 'react';
import {
  collection,
  query,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Input, Textarea } from '../common/Input';
import type { EmailTemplateDoc } from '../../types';
import styles from './Settings.module.css';

const DEFAULT_TEMPLATE = {
  subject: 'Your New Password - {{recipientName}}',
  htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #283E49; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #283E49; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f5f5f5; }
    .button { display: inline-block; padding: 12px 24px; background: #89CCCA; color: #283E49; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Portal</h1>
    </div>
    <div class="content">
      <p>Hello {{recipientName}},</p>
      <p>A new password has been created for you. Click the button below to view your password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{link}}" class="button">View Your Password</a>
      </p>
      <p><strong>Important:</strong> This link can only be used once. Once you view your password, the link will expire immediately.</p>
      <p>If you did not request this password, please contact the IT team.</p>
    </div>
    <div class="footer">
      <p>Initio Learning Trust - Central IT Team</p>
    </div>
  </div>
</body>
</html>`,
  textBody: `Hello {{recipientName}},

A new password has been created for you.

Click this link to view your password:
{{link}}

Important: This link can only be used once. Once you view your password, the link will expire immediately.

If you did not request this password, please contact the IT team.

---
Initio Learning Trust - Central IT Team`,
};

export function EmailTemplatesSettings() {
  const { user } = useAuth();
  const [_template, setTemplate] = useState<EmailTemplateDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formSubject, setFormSubject] = useState('');
  const [formHtmlBody, setFormHtmlBody] = useState('');
  const [formTextBody, setFormTextBody] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const templatesRef = collection(db, 'email_templates');
      const snapshot = await getDocs(query(templatesRef));

      if (snapshot.empty) {
        // Use defaults
        setFormSubject(DEFAULT_TEMPLATE.subject);
        setFormHtmlBody(DEFAULT_TEMPLATE.htmlBody);
        setFormTextBody(DEFAULT_TEMPLATE.textBody);
      } else {
        const doc = snapshot.docs[0];
        const data = { id: doc.id, ...doc.data() } as EmailTemplateDoc;
        setTemplate(data);
        setFormSubject(data.subject);
        setFormHtmlBody(data.htmlBody);
        setFormTextBody(data.textBody);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const templateData = {
        name: 'default',
        subject: formSubject,
        htmlBody: formHtmlBody,
        textBody: formTextBody,
        updatedBy: user?.id || '',
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'email_templates', 'default'), templateData);
      alert('Template saved successfully');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormSubject(DEFAULT_TEMPLATE.subject);
    setFormHtmlBody(DEFAULT_TEMPLATE.htmlBody);
    setFormTextBody(DEFAULT_TEMPLATE.textBody);
  };

  const previewHtml = formHtmlBody
    .replace(/{{recipientName}}/g, 'John Smith')
    .replace(/{{link}}/g, 'https://passwords.initiolearning.org/p/example-uuid');

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className={styles.loading}>Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle subtitle="Customize email notifications sent to recipients">
          Email Templates
        </CardTitle>
        <div className={styles.headerActions}>
          <Button variant="ghost" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Save Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Variables info */}
        <div className={styles.infoBox}>
          <p><strong>Available variables:</strong></p>
          <ul className={styles.variablesList}>
            <li><code>{'{{recipientName}}'}</code> - Recipient's name</li>
            <li><code>{'{{recipientEmail}}'}</code> - Recipient's email</li>
            <li><code>{'{{link}}'}</code> - Password view link</li>
          </ul>
        </div>

        {/* Subject */}
        <Input
          label="Email Subject"
          value={formSubject}
          onChange={(e) => setFormSubject(e.target.value)}
        />

        {/* Toggle preview */}
        <div className={styles.previewToggle}>
          <Button
            variant={previewMode ? 'ghost' : 'secondary'}
            size="sm"
            onClick={() => setPreviewMode(false)}
          >
            Edit
          </Button>
          <Button
            variant={previewMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode(true)}
          >
            Preview
          </Button>
        </div>

        {previewMode ? (
          <div className={styles.emailPreview}>
            <div
              className={styles.previewFrame}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        ) : (
          <>
            {/* HTML Body */}
            <Textarea
              label="HTML Email Body"
              value={formHtmlBody}
              onChange={(e) => setFormHtmlBody(e.target.value)}
              rows={15}
              className={styles.codeTextarea}
            />

            {/* Text Body */}
            <Textarea
              label="Plain Text Email Body"
              value={formTextBody}
              onChange={(e) => setFormTextBody(e.target.value)}
              rows={10}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
