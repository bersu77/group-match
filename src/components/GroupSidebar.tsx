'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGroups, getGroupsByMember } from '@/lib/firebase/groups';
import { Group } from '@/types/group';
import { Crown, Users, Menu, X } from 'lucide-react';

interface GroupSidebarProps {
  selectedGroupId?: string;
  onGroupSelect?: (groupId: string) => void;
}

export default function GroupSidebar({ selectedGroupId, onGroupSelect }: GroupSidebarProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadGroups();
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;

    try {
      const [createdGroups, memberGroups] = await Promise.all([
        getUserGroups(user.uid),
        getGroupsByMember(user.uid),
      ]);

      const allGroupsMap = new Map<string, Group>();
      createdGroups.forEach((group) => allGroupsMap.set(group.id!, group));
      memberGroups.forEach((group) => {
        if (!allGroupsMap.has(group.id!)) {
          allGroupsMap.set(group.id!, group);
        }
      });

      setGroups(Array.from(allGroupsMap.values()));
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupClick = (groupId: string) => {
    if (onGroupSelect) {
      onGroupSelect(groupId);
    }
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-[var(--border)] rounded"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:sticky top-0 left-0 h-screen
          w-80 bg-white border-r border-[var(--border)]
          transform transition-transform duration-300 ease-in-out z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-[var(--border)]">
            <h2 className="text-xl uppercase tracking-wider mb-2">Your Groups</h2>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">
              Select a group to explore
            </p>
          </div>

          {/* Groups List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">
                Loading...
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  No groups yet
                </p>
                <Link
                  href="/groups/create"
                  className="inline-block px-4 py-2 bg-[var(--foreground)] text-[var(--background)] text-xs uppercase tracking-wider hover:opacity-90"
                >
                  Create Group
                </Link>
              </div>
            ) : (
              groups.map((group) => {
                const isOwner = group.createdBy === user?.uid;
                const isSelected = group.id === selectedGroupId;

                return (
                  <button
                    key={group.id}
                    onClick={() => handleGroupClick(group.id!)}
                    className={`
                      w-full text-left p-4 border transition-all
                      ${
                        isSelected
                          ? 'border-[var(--foreground)] bg-gray-50'
                          : 'border-[var(--border)] hover:border-[var(--foreground)]'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Group Photo */}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {group.photoURL ? (
                          <img
                            src={group.photoURL}
                            alt={group.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Group Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm uppercase tracking-wider truncate">
                            {group.name}
                          </h3>
                          {isOwner && (
                            <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {group.members?.length || 1} {group.members?.length === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[var(--border)]">
            <Link
              href="/groups/create"
              className="block w-full px-4 py-3 bg-[var(--foreground)] text-[var(--background)] text-center text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              + Create Group
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

