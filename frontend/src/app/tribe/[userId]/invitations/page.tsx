'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getInvitations, updateInvitationStatus, type Invitation } from '@/lib/connections';
import { TopBar } from '@/components/TopBar';
import { TabBar } from '@/components/TabBar';

export default function InvitationsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>(() => getInvitations(userId));
  const [tab, setTab] = useState<'sent' | 'received'>('sent');

  function accept(id: string) {
    updateInvitationStatus(userId, id, 'accepted');
    setInvitations(getInvitations(userId));
    router.push(`/tribe/${userId}/chat/${id}`);
  }

  function decline(id: string) {
    updateInvitationStatus(userId, id, 'declined');
    setInvitations(getInvitations(userId));
  }

  const shown = invitations.filter(inv => inv.direction === tab);

  return (
    <div style={{ minHeight: '100svh', background: 'var(--cream)', maxWidth: 480, margin: '0 auto', paddingBottom: 88 }}>
      <TopBar
        title="Connections"
        onBack={() => router.push(`/tribe/${userId}`)}
      />

      <div style={{ display: 'flex', gap: 8, padding: '16px 16px 8px' }}>
        {(['sent', 'received'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '9px 0', borderRadius: 100, border: '1.5px solid', borderColor: tab === t ? 'var(--green)' : 'var(--card-border)', background: tab === t ? 'var(--green)' : 'var(--card)', color: tab === t ? '#fff' : 'var(--text-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'var(--font-geist-sans), sans-serif' }}>
            {t} ({invitations.filter(i => i.direction === t).length})
          </button>
        ))}
      </div>

      <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 15, padding: '40px 0', fontWeight: 300 }}>
            No {tab} invitations yet
          </div>
        )}
        {shown.map(inv => (
          <div key={inv.id} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: '14px 16px', border: '1.5px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: inv.direction === 'received' && inv.status === 'pending' ? 12 : 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--cream)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-instrument-serif), serif', fontSize: 16, color: 'var(--green)', flexShrink: 0 }}>
                {inv.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{inv.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontWeight: 300 }}>{inv.role} · {inv.company}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: inv.status === 'accepted' ? 'var(--green-lt)' : inv.status === 'declined' ? '#FAE8E0' : 'var(--cream)', color: inv.status === 'accepted' ? 'var(--green)' : inv.status === 'declined' ? 'var(--red-soft)' : 'var(--text-3)', border: '1px solid', borderColor: inv.status === 'accepted' ? 'rgba(90,122,92,.2)' : inv.status === 'declined' ? 'rgba(196,122,106,.2)' : 'var(--card-border)' }}>
                {inv.status}
              </div>
            </div>
            {inv.direction === 'received' && inv.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => accept(inv.id)} style={{ flex: 1, padding: '8px 0', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-geist-sans), sans-serif' }}>Accept</button>
                <button onClick={() => decline(inv.id)} style={{ flex: 1, padding: '8px 0', background: 'transparent', color: 'var(--red-soft)', border: '1.5px solid var(--red-soft)', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-geist-sans), sans-serif' }}>Decline</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <TabBar active="invitations" userId={userId} />
    </div>
  );
}
