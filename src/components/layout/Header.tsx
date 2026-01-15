import { useAuth, useIsAdmin } from '../../hooks/useAuth';
import styles from './Header.module.css';

export function Header() {
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <img
            src="https://support.initiolearning.org/api/attachment/image?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY1NDQ4N2MwLWQ3NjEtNGE1ZS05ZWQ5LTFjYzQ5YTg2YTQ3ZCJ9.sYcGIY8SEdO2m85nY09vXxGEAZOUI2frNEGOc8pepLU"
            alt="Initio"
            className={styles.logoImg}
          />
          <span className={styles.logoText}>Password Portal</span>
        </div>

        <nav className={styles.nav}>
          <a href="/admin" className={styles.navLink}>
            Dashboard
          </a>
          <a href="/admin/create" className={styles.navLink}>
            Create Link
          </a>
          <a href="/admin/queue" className={styles.navLink}>
            Queue
          </a>
          {isAdmin && (
            <a href="/admin/settings" className={styles.navLink}>
              Settings
            </a>
          )}
        </nav>

        <div className={styles.userSection}>
          {user && (
            <>
              <div className={styles.userInfo}>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    className={styles.avatar}
                  />
                )}
                <div className={styles.userDetails}>
                  <span className={styles.userName}>{user.displayName}</span>
                  <span className={styles.userRole}>
                    {user.role === 'admin' ? 'Admin' : 'Technician'}
                  </span>
                </div>
              </div>
              <button onClick={signOut} className={styles.signOutBtn}>
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
