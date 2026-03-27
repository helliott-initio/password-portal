import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from './Button';
import type { GeneratedPassword } from '../../types';
import styles from './PasswordList.module.css';

interface PasswordListProps {
  passwords: GeneratedPassword[];
  onCopy: (id: string) => void;
  onCopyAll: () => void;
  onRegenerate: (id: string) => void;
}

export function PasswordList({ passwords, onCopy, onCopyAll, onRegenerate }: PasswordListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: passwords.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.count}>
          {passwords.length} password{passwords.length !== 1 ? 's' : ''} generated
        </span>
        <Button variant="secondary" size="sm" onClick={onCopyAll}>
          Copy All
        </Button>
      </div>

      <div ref={parentRef} className={styles.listContainer}>
        <div
          className={styles.listInner}
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const pw = passwords[virtualRow.index];
            return (
              <div
                key={pw.id}
                className={styles.row}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <span className={styles.index}>{virtualRow.index + 1}</span>
                <code className={styles.password}>{pw.value}</code>
                <div className={styles.actions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopy(pw.id)}
                  >
                    {pw.copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRegenerate(pw.id)}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
