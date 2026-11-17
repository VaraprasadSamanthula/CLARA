"use client";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, LogOut, Settings, User, BarChart3, Users, FileText, MessageSquare, Plus } from 'lucide-react';
import { useState } from 'react';

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('clara_chat_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
    
    document.cookie = 'session_id=; path=/; max-age=0';
    router.push('/login');
  };

  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--background)' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '280px' : '0',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 300ms ease',
        overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border)' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
              <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                C
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>CLARA</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '-2px' }}>Research</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: 'var(--spacing-md) 0', overflow: 'auto' }}>
          {[
            { label: 'Dashboard', href: '/dashboard', tab: 'chat', icon: BarChart3 },
            { label: 'Patient Search', href: '/dashboard?tab=search', tab: 'search', icon: Users },
            { label: 'Chat', href: '/dashboard?tab=chat', tab: 'chat', icon: MessageSquare },
            { label: 'Documents', href: '/dashboard?tab=chat', tab: 'chat', icon: FileText }
          ].map(({ label, href, tab, icon: Icon }) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-md)',
                  padding: 'var(--spacing-md)',
                  marginX: 'var(--spacing-sm)',
                  marginY: 'var(--spacing-xs)',
                  borderRadius: 'var(--radius-lg)',
                  color: isActive(href) ? 'var(--primary)' : 'var(--text-secondary)',
                  background: isActive(href) ? 'var(--primary-50)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  fontWeight: isActive(href) ? 600 : 400
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
              </div>
            </Link>
          ))}

          <div style={{ height: '1px', background: 'var(--border)', margin: 'var(--spacing-lg) 0' }} />

          {[
            { label: 'Add Patient', href: '/patients/register', icon: Plus },
            { label: 'Import Patients', href: '/patients/import', icon: FileText }
          ].map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-md)',
                  padding: 'var(--spacing-md)',
                  marginX: 'var(--spacing-sm)',
                  marginY: 'var(--spacing-xs)',
                  borderRadius: 'var(--radius-lg)',
                  color: isActive(href) ? 'var(--primary)' : 'var(--text-secondary)',
                  background: isActive(href) ? 'var(--primary-50)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  fontWeight: isActive(href) ? 600 : 400
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
              </div>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--spacing-md)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-md)',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--error)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 200ms ease'
            }}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-lg)',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xs)'
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 'var(--spacing-sm)' }}
          >
            <Menu size={24} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 'var(--spacing-sm)' }}>
              <Settings size={20} />
            </button>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
              D
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
