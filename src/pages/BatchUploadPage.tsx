import { useState, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import { Layout } from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { generatePassword } from '../utils/passwordGenerator';
import styles from './BatchUploadPage.module.css';

interface BatchRow {
  email: string;
  name: string;
  password: string;
  notes: string;
  valid: boolean;
  error?: string;
}

interface UploadResult {
  email: string;
  success: boolean;
  link?: string;
  error?: string;
}

export function BatchUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim());
    const parsedRows: BatchRow[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const [email, name, password, notes] = values;

      const row: BatchRow = {
        email: email || '',
        name: name || '',
        password: password || generatePassword(),
        notes: notes || '',
        valid: true,
      };

      // Validate email
      if (!row.email || !row.email.includes('@')) {
        row.valid = false;
        row.error = 'Invalid email';
      }

      parsedRows.push(row);
    }

    setRows(parsedRows);
    setStep('preview');
  };

  const handleGeneratePassword = (index: number) => {
    const newRows = [...rows];
    newRows[index].password = generatePassword();
    setRows(newRows);
  };

  const handleGenerateAllPasswords = () => {
    const newRows = rows.map((row) => ({
      ...row,
      password: row.password || generatePassword(),
    }));
    setRows(newRows);
  };

  const handleRemoveRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setUploading(true);
    const uploadResults: UploadResult[] = [];

    try {
      const createPasswordLink = httpsCallable(functions, 'createPasswordLink');

      for (const row of validRows) {
        try {
          const response = await createPasswordLink({
            recipientEmail: row.email,
            recipientName: row.name,
            password: row.password,
            notes: row.notes,
            sendNotification: false,
          });

          const data = response.data as { link: string };
          uploadResults.push({
            email: row.email,
            success: true,
            link: data.link,
          });
        } catch (error) {
          uploadResults.push({
            email: row.email,
            success: false,
            error: 'Failed to create link',
          });
        }
      }

      setResults(uploadResults);
      setStep('results');
    } catch (error) {
      console.error('Batch upload error:', error);
      alert('Batch upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = 'email,name,password,notes\nuser@example.com,John Smith,,Optional notes\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'password-batch-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadResults = () => {
    const csv = [
      'email,success,link,error',
      ...results.map(
        (r) => `${r.email},${r.success},${r.link || ''},${r.error || ''}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'password-batch-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setRows([]);
    setResults([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Batch Upload</h1>
        </div>

        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle subtitle="Upload a CSV file to create multiple password links">
                Upload CSV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.uploadArea}>
                <div className={styles.uploadIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17,8 12,3 7,8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p>Drag and drop a CSV file here, or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                />
                <div className={styles.uploadActions}>
                  <Button
                    variant="primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                  </Button>
                  <Button variant="ghost" onClick={handleDownloadTemplate}>
                    Download Template
                  </Button>
                </div>
              </div>

              <div className={styles.formatInfo}>
                <h4>CSV Format</h4>
                <p>Your CSV should have these columns:</p>
                <ul>
                  <li><strong>email</strong> (required) - Recipient email address</li>
                  <li><strong>name</strong> - Recipient name</li>
                  <li><strong>password</strong> - Leave blank to auto-generate</li>
                  <li><strong>notes</strong> - Internal notes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'preview' && (
          <>
            <Card className={styles.summaryCard}>
              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryValue}>{rows.length}</span>
                  <span className={styles.summaryLabel}>Total Rows</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={`${styles.summaryValue} ${styles.success}`}>
                    {validCount}
                  </span>
                  <span className={styles.summaryLabel}>Valid</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={`${styles.summaryValue} ${styles.error}`}>
                    {invalidCount}
                  </span>
                  <span className={styles.summaryLabel}>Invalid</span>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle subtitle="Review and edit before uploading">
                  Preview
                </CardTitle>
                <div className={styles.previewActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateAllPasswords}
                  >
                    Generate All Passwords
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Password</th>
                        <th>Notes</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={index} className={!row.valid ? styles.invalidRow : ''}>
                          <td>{row.email}</td>
                          <td>{row.name || '-'}</td>
                          <td>
                            <code className={styles.password}>{row.password}</code>
                          </td>
                          <td>{row.notes || '-'}</td>
                          <td>
                            {row.valid ? (
                              <span className={styles.validBadge}>Valid</span>
                            ) : (
                              <span className={styles.invalidBadge}>{row.error}</span>
                            )}
                          </td>
                          <td>
                            <div className={styles.rowActions}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGeneratePassword(index)}
                              >
                                ↻
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRow(index)}
                              >
                                ×
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.formActions}>
                  <Button variant="ghost" onClick={handleReset}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleUpload}
                    loading={uploading}
                    disabled={validCount === 0}
                  >
                    Create {validCount} Password Links
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {step === 'results' && (
          <>
            <Card className={styles.summaryCard}>
              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <span className={`${styles.summaryValue} ${styles.success}`}>
                    {successCount}
                  </span>
                  <span className={styles.summaryLabel}>Successful</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={`${styles.summaryValue} ${styles.error}`}>
                    {failCount}
                  </span>
                  <span className={styles.summaryLabel}>Failed</span>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle subtitle="Download results to share links with recipients">
                  Results
                </CardTitle>
                <Button variant="secondary" onClick={handleDownloadResults}>
                  Download Results CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <tr key={index}>
                          <td>{result.email}</td>
                          <td>
                            {result.success ? (
                              <span className={styles.validBadge}>Success</span>
                            ) : (
                              <span className={styles.invalidBadge}>{result.error}</span>
                            )}
                          </td>
                          <td>
                            {result.link ? (
                              <code className={styles.linkCode}>{result.link}</code>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.formActions}>
                  <Button variant="primary" onClick={handleReset}>
                    Upload Another Batch
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
