'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { getGroup, addMemberToGroup } from '@/lib/firebase/groups';
import { Group, GroupMember } from '@/types/group';
import { UsersIcon, User } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function JoinGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  
  return (
    <ProtectedRoute>
      <JoinGroupContent groupId={groupId} />
    </ProtectedRoute>
  );
}

function JoinGroupContent({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);

  useEffect(() => {
    const fetchGroup = async () => {
      setLoading(true);
      setError('');
      try {
        const fetchedGroup = await getGroup(groupId);
        if (!fetchedGroup) {
          setError('Group not found');
        } else {
          setGroup(fetchedGroup);
          
          // Check if user is already a member
          const isMember = fetchedGroup.members.some(
            (m) => m.userId === user?.uid
          );
          setIsAlreadyMember(isMember);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load group';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId, user]);

  const handleJoinGroup = async () => {
    if (!user) return;
    
    setJoining(true);
    setError('');

    try {
      const newMember: GroupMember = {
        userId: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'New Member',
        bio: '',
        photoURL: user.photoURL || undefined,
      };

      await addMemberToGroup(groupId, newMember);
      
      // Redirect to my groups or group details page
      router.push('/groups/my-groups');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join group';
      setError(errorMessage);
    } finally {
      setJoining(false);
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
                <BreadcrumbPage>Join Group</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl w-full">
          {loading ? (
            <div className="bg-white/80 backdrop-blur-sm border border-[var(--border)] p-12 text-center">
              <div className="text-sm uppercase tracking-wider animate-pulse">
                Loading group details...
              </div>
            </div>
          ) : error && !group ? (
            <div className="bg-white/80 backdrop-blur-sm border border-[var(--border)] p-12 text-center">
              <div className="text-xl uppercase tracking-wider mb-4 text-red-600">
                {error}
              </div>
              <Link
                href="/dashboard"
                className="inline-block px-8 py-3 border border-[var(--border)] text-xs uppercase tracking-wider hover:border-[var(--foreground)] transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          ) : group ? (
            <div className="bg-white/80 backdrop-blur-sm border border-[var(--border)] overflow-hidden">
              {/* Group Photo */}
              <div className="w-full h-64 bg-gray-100 flex items-center justify-center overflow-hidden">
                {group.photoURL ? (
                  <img
                    src={group.photoURL}
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UsersIcon className="w-24 h-24 text-gray-400" />
                )}
              </div>

              {/* Group Info */}
              <div className="p-8">
                <h1 className="text-3xl uppercase tracking-wider mb-4">
                  {group.name}
                </h1>
                
                <p className="text-sm text-[var(--muted-foreground)] mb-6">
                  {group.bio}
                </p>

                <div className="mb-8 pb-8 border-b border-[var(--border)]">
                  <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
                    Group Members
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {group.members && group.members.length > 0 ? (
                        <>
                          {group.members.slice(0, 5).map((member, idx) => (
                            <div
                              key={idx}
                              className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden"
                              title={member.name}
                            >
                              {member.photoURL ? (
                                <img
                                  src={member.photoURL}
                                  alt={member.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                          ))}
                          {group.members.length > 5 && (
                            <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-sm font-bold">
                              +{group.members.length - 5}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {group.members.length} {group.members.length === 1 ? 'Member' : 'Members'}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {isAlreadyMember ? (
                  <div className="text-center p-6 bg-green-50 border border-green-200 mb-6">
                    <p className="text-sm uppercase tracking-wider text-green-700">
                      ✓ You are already a member of this group
                    </p>
                  </div>
                ) : null}

                <div className="flex gap-4">
                  {!isAlreadyMember ? (
                    <button
                      onClick={handleJoinGroup}
                      disabled={joining}
                      className="flex-1 bg-[var(--foreground)] text-[var(--background)] py-4 px-6 uppercase tracking-wider text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {joining ? 'Joining...' : 'Join This Group'}
                    </button>
                  ) : null}
                  
                  <Link
                    href="/groups/my-groups"
                    className="flex-1 border border-[var(--border)] py-4 px-6 uppercase tracking-wider text-sm hover:border-[var(--foreground)] transition-colors text-center"
                  >
                    {isAlreadyMember ? 'View My Groups' : 'Cancel'}
                  </Link>
                </div>

                {group.createdAt && (
                  <div className="mt-8 pt-8 border-t border-[var(--border)] text-center">
                    <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                      Created {new Date(group.createdAt.seconds * 1000).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

