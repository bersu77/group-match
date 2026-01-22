'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { getGroup } from '@/lib/firebase/groups';
import {
  getGroupJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from '@/lib/firebase/joinRequests';
import { Group } from '@/types/group';
import { JoinRequest } from '@/types/joinRequest';
import { UserCircle, CheckCircle, XCircle } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function GroupRequestsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  
  return (
    <ProtectedRoute>
      <GroupRequestsContent groupId={groupId} />
    </ProtectedRoute>
  );
}

function GroupRequestsContent({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGroupAndRequests();
  }, [groupId, user]);

  // Real-time listener for join requests
  useEffect(() => {
    if (!groupId || !group) return;

    const requestsRef = collection(db, 'joinRequests');
    const q = query(
      requestsRef,
      where('groupId', '==', groupId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendingRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as JoinRequest[];

      // Sort by createdAt descending in JavaScript
      pendingRequests.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

      setRequests(pendingRequests);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId, group]);

  const loadGroupAndRequests = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const fetchedGroup = await getGroup(groupId);
      
      if (!fetchedGroup) {
        setError('Group not found');
        return;
      }

      // Check if user is the creator
      if (fetchedGroup.createdBy !== user.uid) {
        setError('You do not have permission to view requests for this group');
        return;
      }

      setGroup(fetchedGroup);

      // Load pending requests
      const pendingRequests = await getGroupJoinRequests(groupId, 'pending');
      setRequests(pendingRequests);
    } catch (err: unknown) {
      console.error('Error loading data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load requests';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    setError('');

    try {
      await approveJoinRequest(requestId);
      
      // Remove the request from the list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      
      // Refresh group data to update member count
      const updatedGroup = await getGroup(groupId);
      if (updatedGroup) {
        setGroup(updatedGroup);
      }
    } catch (err: unknown) {
      console.error('Error approving request:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve request';
      setError(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    setError('');

    try {
      await rejectJoinRequest(requestId);
      
      // Remove the request from the list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: unknown) {
      console.error('Error rejecting request:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject request';
      setError(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm uppercase tracking-wider animate-pulse">
          Loading requests...
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm border border-[var(--border)] p-12 text-center max-w-md">
          <p className="text-lg uppercase tracking-wider mb-4 text-red-600">
            {error}
          </p>
          <Link
            href="/groups/my-groups"
            className="inline-block px-8 py-3 border border-[var(--border)] text-xs uppercase tracking-wider hover:border-[var(--foreground)] transition-colors"
          >
            Back to My Groups
          </Link>
        </div>
      </div>
    );
  }

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
                <BreadcrumbLink asChild>
                  <Link href="/groups/my-groups">My Groups</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{group?.name || 'Group'} Requests</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl md:text-4xl">Join Requests</h1>
          <p className="text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
            {group?.name}
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/80 backdrop-blur-sm border border-[var(--border)] p-12">
              <h2 className="text-xl uppercase tracking-wider mb-4">
                No Pending Requests
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-8">
                You don&apos;t have any pending join requests for this group.
              </p>
              <Link
                href="/groups/my-groups"
                className="inline-block px-8 py-3 border border-[var(--border)] text-xs uppercase tracking-wider hover:border-[var(--foreground)] transition-colors"
              >
                Back to My Groups
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
                {requests.length} Pending{' '}
                {requests.length === 1 ? 'Request' : 'Requests'}
              </p>
            </div>

            <div className="space-y-4">
              {requests.map((request) => {
                const isProcessing = processingId === request.id;

                return (
                  <div
                    key={request.id}
                    className="bg-white/80 backdrop-blur-sm border border-[var(--border)] p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* User Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {request.userPhotoURL ? (
                            <img
                              src={request.userPhotoURL}
                              alt={request.userName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserCircle className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg uppercase tracking-wider mb-1">
                            {request.userName}
                          </h3>
                          {request.userEmail && (
                            <p className="text-xs text-[var(--muted-foreground)] mb-2">
                              {request.userEmail}
                            </p>
                          )}
                          <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                            Requested{' '}
                            {new Date(
                              request.createdAt.seconds * 1000
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(request.id!)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-green-600 text-white text-xs uppercase tracking-wider hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.id!)}
                          disabled={isProcessing}
                          className="px-4 py-2 border border-red-600 text-red-600 text-xs uppercase tracking-wider hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
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

