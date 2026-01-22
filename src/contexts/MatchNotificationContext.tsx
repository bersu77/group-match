'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from './AuthContext';
import { getUserGroups, getGroupsByMember, getGroup } from '@/lib/firebase/groups';
import { Group } from '@/types/group';
import { GroupMatch } from '@/types/match';
import { Sparkles, X } from 'lucide-react';
import Link from 'next/link';

interface MatchNotification {
  matchId: string;
  matchedGroup: Group;
  yourGroup: Group;
  matchedAt: Timestamp;
}

interface MatchNotificationContextType {
  notifications: MatchNotification[];
  dismissNotification: (matchId: string) => void;
}

const MatchNotificationContext = createContext<MatchNotificationContextType | undefined>(undefined);

export const MatchNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<MatchNotification[]>([]);
  const [userGroupIds, setUserGroupIds] = useState<string[]>([]);
  const [lastChecked] = useState<Timestamp>(Timestamp.now());

  // Load user's groups
  useEffect(() => {
    const loadUserGroups = async () => {
      if (!user) return;

      const [createdGroups, memberGroups] = await Promise.all([
        getUserGroups(user.uid),
        getGroupsByMember(user.uid),
      ]);

      const allGroupIds = new Set<string>();
      createdGroups.forEach((g) => allGroupIds.add(g.id!));
      memberGroups.forEach((g) => allGroupIds.add(g.id!));

      setUserGroupIds(Array.from(allGroupIds));
    };

    loadUserGroups();
  }, [user]);

  // Listen for new matches in real-time
  useEffect(() => {
    if (userGroupIds.length === 0) return;

    const matchesRef = collection(db, 'matches');
    
    // Listen for matches where user's groups are involved
    const q = query(
      matchesRef,
      where('matchedAt', '>', lastChecked),
      orderBy('matchedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newMatches: MatchNotification[] = [];

      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const matchData = { id: change.doc.id, ...change.doc.data() } as GroupMatch;
          
          // Check if this match involves any of user's groups
          const isUserGroup1 = userGroupIds.includes(matchData.groupId1);
          const isUserGroup2 = userGroupIds.includes(matchData.groupId2);

          if (isUserGroup1 || isUserGroup2) {
            const yourGroupId = isUserGroup1 ? matchData.groupId1 : matchData.groupId2;
            const matchedGroupId = isUserGroup1 ? matchData.groupId2 : matchData.groupId1;

            const [yourGroup, matchedGroup] = await Promise.all([
              getGroup(yourGroupId),
              getGroup(matchedGroupId),
            ]);

            if (yourGroup && matchedGroup) {
              newMatches.push({
                matchId: matchData.id!,
                matchedGroup,
                yourGroup,
                matchedAt: matchData.matchedAt,
              });
            }
          }
        }
      }

      if (newMatches.length > 0) {
        setNotifications((prev) => [...newMatches, ...prev]);
      }
    });

    return () => unsubscribe();
  }, [userGroupIds, lastChecked]);

  const dismissNotification = (matchId: string) => {
    setNotifications((prev) => prev.filter((n) => n.matchId !== matchId));
  };

  return (
    <MatchNotificationContext.Provider value={{ notifications, dismissNotification }}>
      {children}
      
      {/* Notification Popups */}
      <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm">
        {notifications.slice(0, 3).map((notification) => (
          <div
            key={notification.matchId}
            className="bg-white border-2 border-green-500 shadow-lg p-6 animate-slideInRight"
          >
            <button
              onClick={() => dismissNotification(notification.matchId)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg uppercase tracking-wider">It&apos;s a Match!</h3>
            </div>
            
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              <strong>{notification.yourGroup.name}</strong> matched with{' '}
              <strong>{notification.matchedGroup.name}</strong>!
            </p>
            
            <Link
              href="/matches"
              className="block w-full px-4 py-2 bg-[var(--foreground)] text-[var(--background)] text-xs uppercase tracking-wider text-center hover:opacity-90 transition-opacity"
              onClick={() => dismissNotification(notification.matchId)}
            >
              View Match
            </Link>
          </div>
        ))}
      </div>
    </MatchNotificationContext.Provider>
  );
};

export const useMatchNotifications = () => {
  const context = useContext(MatchNotificationContext);
  if (context === undefined) {
    throw new Error('useMatchNotifications must be used within a MatchNotificationProvider');
  }
  return context;
};

