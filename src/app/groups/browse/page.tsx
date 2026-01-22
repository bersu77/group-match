'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { getAllGroups } from '@/lib/firebase/groups';
import { createJoinRequest, hasPendingRequest } from '@/lib/firebase/joinRequests';
import { Group } from '@/types/group';
import { UsersIcon, CheckCircle, User } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function BrowseGroupsPage() {
  return (
    <ProtectedRoute>
      <BrowseGroupsContent />
    </ProtectedRoute>
  );
}

function BrowseGroupsContent() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingGroupId, setRequestingGroupId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    loadGroups();
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    try {
      const allGroups = await getAllGroups();
      
      // Filter out groups where user is creator or already a member
      const availableGroups = allGroups.filter((group) => {
        const isCreator = group.createdBy === user.uid;
        const isMember = group.members.some((m) => m.userId === user.uid);
        return !isCreator && !isMember;
      });

      setGroups(availableGroups);

      // Check for pending requests
      const pending = new Set<string>();
      await Promise.all(
        availableGroups.map(async (group) => {
          const hasPending = await hasPendingRequest(group.id!, user.uid);
          if (hasPending) {
            pending.add(group.id!);
          }
        })
      );
      setPendingRequests(pending);
    } catch (err: unknown) {
      console.error('Error loading groups:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load groups';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestToJoin = async (groupId: string) => {
    if (!user) return;

    setRequestingGroupId(groupId);
    setError('');

    try {
      await createJoinRequest(
        groupId,
        user.uid,
        user.displayName || user.email?.split('@')[0] || 'User',
        user.email || undefined,
        user.photoURL || undefined
      );

      // Add to pending requests
      setPendingRequests((prev) => new Set(prev).add(groupId));
    } catch (err: unknown) {
      console.error('Error requesting to join:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send join request';
      setError(errorMessage);
    } finally {
      setRequestingGroupId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
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
                <BreadcrumbPage>Find Groups to Join</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="mb-4 text-4xl md:text-5xl">Browse Groups</h1>
          <p className="text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
            Discover and request to join groups
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-sm uppercase tracking-wider animate-pulse">
              Loading groups...
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/80 backdrop-blur-sm border border-[var(--border)] p-12 max-w-2xl mx-auto">
              <h2 className="text-2xl uppercase tracking-wider mb-4">
                No Groups Available
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-8">
                There are no groups available to join at the moment. Why not create your own?
              </p>
              <Link
                href="/groups/create"
                className="inline-block px-8 py-4 bg-[var(--foreground)] text-[var(--background)] text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Create a Group
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
                {groups.length} {groups.length === 1 ? 'Group' : 'Groups'} Available
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => {
                const isPending = pendingRequests.has(group.id!);
                const isRequesting = requestingGroupId === group.id;

                return (
                  <div
                    key={group.id}
                    className="bg-white/80 backdrop-blur-sm border border-[var(--border)] overflow-hidden hover:border-[var(--foreground)] transition-colors"
                  >
                    {/* Group Photo */}
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {group.photoURL ? (
                        <img
                          src={group.photoURL}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UsersIcon className="w-16 h-16 text-gray-400" />
                      )}
                    </div>

                    {/* Group Info */}
                    <div className="p-6">
                      <div className="mb-3">
                        <h3 className="text-lg uppercase tracking-wider mb-3">
                          {group.name}
                        </h3>

                        {/* Member Avatars */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex -space-x-2">
                            {group.members && group.members.length > 0 ? (
                              <>
                                {group.members.slice(0, 4).map((member, idx) => (
                                  <div
                                    key={idx}
                                    className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden"
                                    title={member.name}
                                  >
                                    {member.photoURL ? (
                                      <img
                                        src={member.photoURL}
                                        alt={member.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <User className="w-4 h-4 text-gray-500" />
                                    )}
                                  </div>
                                ))}
                                {group.members.length > 4 && (
                                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-xs font-bold">
                                    +{group.members.length - 4}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <span className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                            {group.members?.length || 1} {group.members?.length === 1 ? 'Member' : 'Members'}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-[var(--muted-foreground)] mb-6 line-clamp-3">
                        {group.bio}
                      </p>

                      {isPending ? (
                        <div className="w-full px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Request Pending
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRequestToJoin(group.id!)}
                          disabled={isRequesting}
                          className="w-full px-4 py-3 bg-[var(--foreground)] text-[var(--background)] text-xs uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {isRequesting ? 'Sending Request...' : 'Request to Join'}
                        </button>
                      )}

                      {/* Created Date */}
                      {group.createdAt && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)]">
                          <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
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
