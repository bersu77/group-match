'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { getUserGroups, getGroupsByMember } from '@/lib/firebase/groups';
import { getGroupJoinRequests } from '@/lib/firebase/joinRequests';
import { ensureCreatorInAllGroups } from '@/lib/firebase/ensureCreatorInGroup';
import { Group } from '@/types/group';
import { Share2, Users, Crown, User } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function MyGroupsPage() {
  return (
    <ProtectedRoute>
      <MyGroupsContent />
    </ProtectedRoute>
  );
}

function MyGroupsContent() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [pendingRequestCounts, setPendingRequestCounts] = useState<
    Map<string, number>
  >(new Map());

  useEffect(() => {
    loadGroups();
  }, [user]);

  // Real-time listener for join requests
  useEffect(() => {
    if (!user || groups.length === 0) return;

    const requestsRef = collection(db, 'joinRequests');
    const createdGroupIds = groups
      .filter((g) => g.createdBy === user.uid)
      .map((g) => g.id!);

    if (createdGroupIds.length === 0) return;

    const q = query(
      requestsRef,
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts = new Map<string, number>();
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (createdGroupIds.includes(data.groupId)) {
          const currentCount = counts.get(data.groupId) || 0;
          counts.set(data.groupId, currentCount + 1);
        }
      });

      setPendingRequestCounts(counts);
    });

    return () => unsubscribe();
  }, [user, groups]);

  const loadGroups = async () => {
    if (!user) return;

    try {
      // Get groups created by user AND groups where user is a member
      const [createdGroups, memberGroups] = await Promise.all([
        getUserGroups(user.uid),
        getGroupsByMember(user.uid),
      ]);

      // Combine and remove duplicates (user might be creator AND member)
      const allGroupsMap = new Map<string, Group>();
      
      createdGroups.forEach((group) => {
        allGroupsMap.set(group.id!, group);
      });
      
      memberGroups.forEach((group) => {
        if (!allGroupsMap.has(group.id!)) {
          allGroupsMap.set(group.id!, group);
        }
      });

      const allGroups = Array.from(allGroupsMap.values());
      
      // Ensure creator is properly in their groups with current profile
      await ensureCreatorInAllGroups(allGroups, user);

      // Reload groups to get updated member data
      const [updatedCreatedGroups, updatedMemberGroups] = await Promise.all([
        getUserGroups(user.uid),
        getGroupsByMember(user.uid),
      ]);

      // Recombine with updated data
      const updatedGroupsMap = new Map<string, Group>();
      updatedCreatedGroups.forEach((group) => {
        updatedGroupsMap.set(group.id!, group);
      });
      updatedMemberGroups.forEach((group) => {
        if (!updatedGroupsMap.has(group.id!)) {
          updatedGroupsMap.set(group.id!, group);
        }
      });

      const finalGroups = Array.from(updatedGroupsMap.values());
      setGroups(finalGroups);

      // Load pending request counts only for groups user created (they manage requests)
      const counts = new Map<string, number>();
      await Promise.all(
        finalGroups
          .filter((group) => group.createdBy === user.uid)
          .map(async (group) => {
            const requests = await getGroupJoinRequests(group.id!, 'pending');
            if (requests.length > 0) {
              counts.set(group.id!, requests.length);
            }
          })
      );
      setPendingRequestCounts(counts);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareGroup = async (groupId: string) => {
    const shareUrl = `${window.location.origin}/groups/join/${groupId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedGroupId(groupId);
      setTimeout(() => setCopiedGroupId(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-y border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>My Groups</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="mb-4 text-4xl md:text-5xl">My Groups</h1>
            <p className="text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
              Groups you own or belong to
            </p>
          </div>
          <Link
            href="/groups/create"
            className="px-6 py-3 bg-[var(--foreground)] text-[var(--background)] text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            + Create New Group
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-sm uppercase tracking-wider animate-pulse">
              Loading your groups...
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/80 backdrop-blur-sm border border-[var(--border)] p-12 max-w-2xl mx-auto">
              <h2 className="text-2xl uppercase tracking-wider mb-4">
                No Groups Yet
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-8">
                You haven&apos;t created any groups yet. Start by creating your first group!
              </p>
              <Link
                href="/groups/create"
                className="inline-block px-8 py-4 bg-[var(--foreground)] text-[var(--background)] text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Create Your First Group
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
                {groups.length} {groups.length === 1 ? 'Group' : 'Groups'} Found
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {groups.map((group) => {
                const pendingCount = pendingRequestCounts.get(group.id!) || 0;
                const isOwner = group.createdBy === user?.uid;
                
                return (
                  <div
                    key={group.id}
                    className="bg-white/80 backdrop-blur-sm border border-[var(--border)] overflow-hidden hover:border-[var(--foreground)] transition-colors"
                  >
                    {/* Group Photo */}
                    <div className="w-full h-36 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                      {group.photoURL ? (
                        <img
                          src={group.photoURL}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-12 h-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      )}
                      {/* Owner Badge */}
                      {isOwner && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold rounded-full px-2 py-1 flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          <span className="hidden sm:inline">Owner</span>
                        </div>
                      )}
                      {/* Pending Request Badge */}
                      {pendingCount > 0 && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                          {pendingCount}
                        </div>
                      )}
                    </div>

                    {/* Group Info */}
                    <div className="p-4">
                      <div className="mb-2">
                        <h3 className="text-base uppercase tracking-wider mb-2">
                          {group.name}
                        </h3>

                        {/* Member Avatars */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex -space-x-1.5">
                            {group.members && group.members.length > 0 ? (
                              <>
                                {group.members.slice(0, 3).map((member, idx) => (
                                  <div
                                    key={idx}
                                    className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden"
                                    title={member.name}
                                  >
                                    {member.photoURL ? (
                                      <img
                                        src={member.photoURL}
                                        alt={member.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <User className="w-3 h-3 text-gray-500" />
                                    )}
                                  </div>
                                ))}
                                {group.members.length > 3 && (
                                  <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-[10px] font-bold">
                                    +{group.members.length - 3}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
                                <User className="w-3 h-3 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                            {group.members?.length || 1} {group.members?.length === 1 ? 'Member' : 'Members'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--muted-foreground)] mb-3 line-clamp-2">
                        {group.bio}
                      </p>

                      {/* Pending Requests Alert - Only for owners */}
                      {isOwner && pendingCount > 0 && (
                        <Link
                          href={`/groups/${group.id}/requests`}
                          className="mb-3 block px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] uppercase tracking-wider hover:bg-blue-100 transition-colors text-center"
                        >
                          {pendingCount} Pending {pendingCount === 1 ? 'Request' : 'Requests'} →
                        </Link>
                      )}

                      {/* Actions - Different for owners vs members */}
                      {isOwner ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleShareGroup(group.id!)}
                            className="flex-1 px-3 py-1.5 border border-[var(--border)] text-[10px] uppercase tracking-wider hover:border-[var(--foreground)] transition-colors flex items-center justify-center gap-1"
                            title="Share group link"
                          >
                            <Share2 className="w-3 h-3" />
                            {copiedGroupId === group.id ? 'Copied!' : 'Share'}
                          </button>
                          <Link
                            href={`/groups/${group.id}/requests`}
                            className="flex-1 px-3 py-1.5 bg-[var(--foreground)] text-[var(--background)] text-[10px] uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                            title="View join requests"
                          >
                            <Users className="w-3 h-3" />
                            Requests
                          </Link>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-[10px] uppercase tracking-wider text-center">
                          Member
                        </div>
                      )}

                      {/* Created Date */}
                      {group.createdAt && (
                        <div className="mt-3 pt-3 border-t border-[var(--border)]">
                          <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                            Created{' '}
                            {new Date(group.createdAt.seconds * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

