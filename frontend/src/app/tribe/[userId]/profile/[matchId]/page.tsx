'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addInvitation } from '@/lib/connections';

function getInitials(name: string) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MatchProfilePage({ params }: { params: Promise<{ userId: string; matchId: string }> }) {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [matchId, setMatchId] = useState('');
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ userId, matchId }) => {
      setUserId(userId);
      setMatchId(matchId);
    });
  }, [params]);

  useEffect(() => {
    if (!userId || !matchId) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/match/${userId}`, { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        const list = data.tribe_list ?? [];
        const found = list.find((m: any) => m.id === matchId);
        setMatch(found ?? null);
      })
      .catch(() => setMatch(null))
      .finally(() => setLoading(false));
  }, [userId, matchId]);

  if (loading) return (
    <div style={{ minHeight: '100svh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      Loading...
    </div>
  );

  if (!match) return (
    <div style={{ minHeight: '100svh', background: '#F5F0E8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={() => router.back()} style={{ position: 'absolute', top: 18, left: 16, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#5A7A5C' }}>←</button>
      <p style={{ color: '#5A7A5C', fontSize: 18 }}>Match not found</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: '#F5F0E8', fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 32 }}>
      <button onClick={() => router.push(`/tribe/${userId}`)} style={{ position: 'fixed', top: 18, left: 16, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#5A7A5C', zIndex: 50 }}>←</button>

      <div style={{ paddingTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 20px 0' }}>
        <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#F0EBE0', border: '2px solid #E6DDCA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 600, color: '#5A7A5C', marginBottom: 16 }}>
          {getInitials(match.name)}
        </div>
        <h1 style={{ fontSize: 28, fontFamily: 'serif', fontWeight: 700, color: '#1C1A17', margin: '0 0 6px', textAlign: 'center' }}>{match.name}</h1>
        <p style={{ color: '#A09890', fontSize: 16, margin: '0 0 16px', textAlign: 'center' }}>{match.role}{match.company ? ` · ${match.company}` : ''}</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ background: '#5A7A5C', color: '#fff', borderRadius: 100, padding: '4px 14px', fontSize: 14, fontWeight: 500 }}>{match.match_score}% match</span>
          {match.match_type && <span style={{ background: '#F0EBE0', color: '#5A7A5C', borderRadius: 100, padding: '4px 14px', fontSize: 14, border: '1px solid #E6DDCA' }}>{match.match_type}</span>}
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <h2 style={{ fontFamily: 'serif', fontSize: 20, color: '#1C1A17', marginBottom: 10 }}>About them</h2>
        <div style={{ background: '#F0EBE0', borderRadius: 14, padding: '14px 16px', color: '#6B6459', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
          {match.bio}
        </div>
        <div style={{ background: '#F0EBE0', borderRadius: 14, padding: '14px 16px', color: '#6B6459', fontSize: 15, lineHeight: 1.6, marginBottom: 24, fontStyle: 'italic' }}>
          {match.match_reason}
        </div>

        <h2 style={{ fontFamily: 'serif', fontSize: 20, color: '#1C1A17', marginBottom: 10 }}>What to say</h2>
        <div style={{ background: '#F0EBE0', borderRadius: 14, padding: '14px 16px', marginBottom: 32 }}>
          {(match.talking_points ?? []).slice(0, 3).map((tp: string, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#5A7A5C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <span style={{ color: '#6B6459', fontSize: 15, lineHeight: 1.5 }}>{tp}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            addInvitation(userId, {
              id: matchId,
              name: match.name,
              role: match.role,
              company: match.company,
              initials: getInitials(match.name),
              status: 'pending',
              direction: 'sent',
              timestamp: Date.now(),
            });
            router.push(`/tribe/${userId}/invitations`);
          }}
          style={{ width: '100%', background: '#5A7A5C', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 0', fontSize: 17, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}
        >
          Connect
        </button>
        <button onClick={() => router.push(`/tribe/${userId}`)} style={{ width: '100%', background: 'transparent', color: '#5A7A5C', border: '1.5px solid #5A7A5C', borderRadius: 14, padding: '13px 0', fontSize: 17, fontWeight: 600, cursor: 'pointer' }}>
          Find on map
        </button>
      </div>
    </div>
  );
}
// Already handled elsewhere in the code. In this `page.tsx` file, the detailed match profile page is rendered, not the tribe match card list.
// (The card list — where navigation via `onClick` is needed — should be in the parent `/tribe/[userId]/page.tsx` file.)
// No changes needed here.