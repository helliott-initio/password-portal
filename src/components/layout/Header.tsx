import { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth, useIsAdmin } from '../../hooks/useAuth';
import styles from './Header.module.css';

function NavItems({ isAdmin, className, linkClassName, activeLinkClassName }: {
  isAdmin: boolean;
  className?: string;
  linkClassName: string;
  activeLinkClassName: string;
}) {
  const getClassName = ({ isActive }: { isActive: boolean }) =>
    `${linkClassName} ${isActive ? activeLinkClassName : ''}`;

  return (
    <nav className={className}>
      <NavLink to="/admin" end className={getClassName}>Dashboard</NavLink>
      <NavLink to="/admin/create" className={getClassName}>Create Link</NavLink>
      <NavLink to="/admin/generate" className={getClassName}>Generate</NavLink>
      <NavLink to="/admin/batch" className={getClassName}>Batch Upload</NavLink>
      <NavLink to="/admin/queue" className={getClassName}>Queue</NavLink>
      {isAdmin && (
        <NavLink to="/admin/settings" className={getClassName}>Settings</NavLink>
      )}
    </nav>
  );
}

export function Header() {
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/admin" className={styles.logo}>
          <img
            src="https://support.initiolearning.org/api/attachment/image?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY1NDQ4N2MwLWQ3NjEtNGE1ZS05ZWQ5LTFjYzQ5YTg2YTQ3ZCJ9.sYcGIY8SEdO2m85nY09vXxGEAZOUI2frNEGOc8pepLU"
            alt="Initio"
            className={styles.logoImg}
          />
          <span className={styles.logoText}>Password Portal</span>
        </Link>

        {/* Desktop nav */}
        <NavItems
          isAdmin={isAdmin}
          className={styles.desktopNav}
          linkClassName={styles.navLink}
          activeLinkClassName={styles.navLinkActive}
        />

        {/* Desktop user section */}
        <div className={styles.desktopUserSection}>
          {user && (
            <>
              <div className={styles.userInfo}>
                {user.photoURL && (
                  <img src={user.photoURL} alt="" className={styles.avatar} />
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

        {/* Hamburger button (mobile) */}
        <button
          className={styles.hamburger}
          onClick={toggleMenu}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div className={styles.backdrop} onClick={() => setMenuOpen(false)} />
          <div className={styles.drawer}>
            <NavItems
              isAdmin={isAdmin}
              className={styles.drawerNav}
              linkClassName={styles.drawerNavLink}
              activeLinkClassName={styles.drawerNavLinkActive}
            />
            {user && (
              <div className={styles.drawerUserSection}>
                <div className={styles.drawerUserInfo}>
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" className={styles.avatar} />
                  )}
                  <div className={styles.userDetails}>
                    <span className={styles.userName}>{user.displayName}</span>
                    <span className={styles.userRole}>
                      {user.role === 'admin' ? 'Admin' : 'Technician'}
                    </span>
                  </div>
                </div>
                <button onClick={signOut} className={styles.drawerSignOut}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
