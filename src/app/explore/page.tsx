'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import GroupSidebar from '@/components/GroupSidebar';
import Navbar from '@/components/Navbar';
import { getAllGroups, getGroup } from '@/lib/firebase/groups';
import { likeGroup, getLikedGroups, getGroupsWhoLiked } from '@/lib/firebase/likes';
import { areGroupsMatched } from '@/lib/firebase/matches';
import { Group } from '@/types/group';
import { Heart, X, Users, Sparkles, ThumbsUp, User } from 'lucide-react';

export default function ExplorePage() {
  return (
    <ProtectedRoute>
      <ExploreContent />
    </ProtectedRoute>
  );
}

// Component for groups who liked you
function LikedYouCard({
  group,
  selectedGroupId,
  onAction,
  setShowMatchModal,
  setMatchedGroup,
}: {
  group: Group;
  selectedGroupId: string;
  onAction: () => void;
  setShowMatchModal: (show: boolean) => void;
  setMatchedGroup: (group: Group | null) => void;
}) {
  const [actionLoading, setActionLoading] = useState(false);

  const handleLikeBack = async () => {
    setActionLoading(true);
    try {
      const result = await likeGroup(selectedGroupId, group.id!);
      
      if (result.matched) {
        setMatchedGroup(group);
        setShowMatchModal(true);
        setTimeout(() => setShowMatchModal(false), 3000);
      }

      onAction();
    } catch (error) {
      console.error('Error liking back:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePassOnLike = () => {
    // Just remove from view by reloading
    // In production, you might want to store "passed" likes separately
    onAction();
  };

  return (
    <div className="bg-white border border-[var(--border)] overflow-hidden">
      {/* Group Photo */}
      <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
        {group.photoURL ? (
          <img
            src={group.photoURL}
            alt={group.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Users className="w-16 h-16 text-gray-400" />
        )}
      </div>

      {/* Group Info */}
      <div className="p-6">
        <h3 className="text-xl uppercase tracking-wider mb-3">{group.name}</h3>
        <p className="text-sm text-[var(--muted-foreground)] mb-4 line-clamp-2">
          {group.bio}
        </p>
        
        {/* Member Avatars */}
        <div className="flex items-center gap-2 mb-4">
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
          <span className="text-xs text-[var(--muted-foreground)]">
            {group.members?.length || 1}{' '}
            {group.members?.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePassOnLike}
            disabled={actionLoading}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            <X className="w-4 h-4" />
            Pass
          </button>
          <button
            onClick={handleLikeBack}
            disabled={actionLoading}
            className="flex-1 px-4 py-3 bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
          >
            <Heart className="w-4 h-4" />
            {actionLoading ? 'Matching...' : 'Like Back'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExploreContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    searchParams.get('groupId')
  );
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [groupsWhoLikedYou, setGroupsWhoLikedYou] = useState<Group[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedGroup, setMatchedGroup] = useState<Group | null>(null);
  const [showLikesSection, setShowLikesSection] = useState(false);

  // Real-time listener for groups and likes
  useEffect(() => {
    if (!selectedGroupId || !user) return;

    const groupsRef = collection(db, 'groups');
    const groupsQuery = query(groupsRef, where('isActive', '==', true));

    const likesRef = collection(db, 'likes');
    const likesQuery = query(likesRef, where('toGroupId', '==', selectedGroupId));

    const unsubscribeGroups = onSnapshot(groupsQuery, async () => {
      await loadAvailableGroups();
    });

    const unsubscribeLikes = onSnapshot(likesQuery, async () => {
      await loadGroupsWhoLikedYou();
    });

    return () => {
      unsubscribeGroups();
      unsubscribeLikes();
    };
  }, [selectedGroupId, user]);

  const loadGroupsWhoLikedYou = async () => {
    if (!selectedGroupId || !user) return;

    try {
      const likerGroupIds = await getGroupsWhoLiked(selectedGroupId);
      
      // Get full group details and filter out matched groups
      const likerGroups = await Promise.all(
        likerGroupIds.map(async (groupId) => {
          const isMatched = await areGroupsMatched(selectedGroupId, groupId);
          if (isMatched) return null;
          
          const group = await getGroup(groupId);
          return group;
        })
      );

      setGroupsWhoLikedYou(likerGroups.filter((g) => g !== null) as Group[]);
    } catch (error) {
      console.error('Error loading groups who liked you:', error);
    }
  };

  const loadAvailableGroups = async () => {
    if (!selectedGroupId || !user) return;

    setLoading(true);
    try {
      const allGroups = await getAllGroups();
      
      // Get groups already liked by the selected group
      const likedGroupIds = await getLikedGroups(selectedGroupId);

      // Filter out:
      // 1. The selected group itself
      // 2. Groups already liked by the selected group
      // 3. Groups already matched with the selected group
      // 4. Groups created by the current user
      // 5. Groups where the current user is a member
      const filtered = await Promise.all(
        allGroups.map(async (group) => {
          // Filter out the selected group itself
          if (group.id === selectedGroupId) return null;
          
          // Filter out groups already liked
          if (likedGroupIds.includes(group.id!)) return null;
          
          // Filter out already matched groups
          const isMatched = await areGroupsMatched(selectedGroupId, group.id!);
          if (isMatched) return null;
          
          // Filter out groups created by the current user
          if (group.createdBy === user.uid) return null;
          
          // Filter out groups where the current user is a member
          const isUserMember = group.members?.some(
            (member) => member.userId === user.uid
          );
          if (isUserMember) return null;
          
          return group;
        })
      );

      setAvailableGroups(filtered.filter((g) => g !== null) as Group[]);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    router.push(`/explore?groupId=${groupId}`);
  };

  const handleLike = async () => {
    if (!selectedGroupId || currentIndex >= availableGroups.length) return;

    const currentGroup = availableGroups[currentIndex];
    setActionLoading(true);

    try {
      const result = await likeGroup(selectedGroupId, currentGroup.id!);
      
      if (result.matched) {
        setMatchedGroup(currentGroup);
        setShowMatchModal(true);
        setTimeout(() => setShowMatchModal(false), 3000);
      }

      // Move to next group
      setCurrentIndex((prev) => prev + 1);
    } catch (error) {
      console.error('Error liking group:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePass = () => {
    if (currentIndex >= availableGroups.length) return;
    setCurrentIndex((prev) => prev + 1);
  };

  const currentGroup = availableGroups[currentIndex];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <GroupSidebar selectedGroupId={selectedGroupId || undefined} onGroupSelect={handleGroupSelect} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Navbar />

        {/* Tabs */}
        {selectedGroupId && (
          <div className="border-b border-[var(--border)] bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-4">
              <button
                onClick={() => setShowLikesSection(false)}
                className={`px-6 py-4 text-sm uppercase tracking-wider border-b-2 transition-colors ${
                  !showLikesSection
                    ? 'border-[var(--foreground)] text-[var(--foreground)]'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                Discover
              </button>
              <button
                onClick={() => setShowLikesSection(true)}
                className={`px-6 py-4 text-sm uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
                  showLikesSection
                    ? 'border-[var(--foreground)] text-[var(--foreground)]'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                Liked You
                {groupsWhoLikedYou.length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {groupsWhoLikedYou.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
          {!selectedGroupId ? (
            <div className="text-center max-w-md">
              <h2 className="text-2xl uppercase tracking-wider mb-4">
                Select a Group
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-8">
                Choose one of your groups from the sidebar to start exploring and matching with other groups.
              </p>
            </div>
          ) : loading ? (
            <div className="text-center">
              <div className="text-lg uppercase tracking-wider animate-pulse">
                Loading groups...
              </div>
            </div>
          ) : showLikesSection ? (
            // Groups Who Liked You Section
            groupsWhoLikedYou.length === 0 ? (
              <div className="text-center max-w-md">
                <ThumbsUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl uppercase tracking-wider mb-4">
                  No Likes Yet
                </h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  When other groups like you, they&apos;ll appear here!
                </p>
              </div>
            ) : (
              <div className="max-w-6xl w-full">
                <h2 className="text-2xl uppercase tracking-wider mb-6 text-center">
                  Groups Who Liked You
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupsWhoLikedYou.map((group) => (
                    <LikedYouCard
                      key={group.id}
                      group={group}
                      selectedGroupId={selectedGroupId}
                      onAction={loadGroupsWhoLikedYou}
                      setShowMatchModal={setShowMatchModal}
                      setMatchedGroup={setMatchedGroup}
                    />
                  ))}
                </div>
              </div>
            )
          ) : !currentGroup || currentIndex >= availableGroups.length ? (
            <div className="text-center max-w-md">
              <div className="mb-6">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              </div>
              <h2 className="text-2xl uppercase tracking-wider mb-4">
                No More Groups
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-8">
                You&apos;ve seen all available groups. Check back later for new groups to match with!
              </p>
              <Link
                href="/matches"
                className="inline-block px-8 py-3 bg-[var(--foreground)] text-[var(--background)] text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                View Matches
              </Link>
            </div>
          ) : (
            <div className="max-w-2xl w-full">
              {/* Group Card */}
              <div className="bg-white border border-[var(--border)] overflow-hidden">
                {/* Group Photo */}
                <div className="w-full h-96 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {currentGroup.photoURL ? (
                    <img
                      src={currentGroup.photoURL}
                      alt={currentGroup.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-24 h-24 text-gray-400" />
                  )}
                </div>

                {/* Group Info */}
                <div className="p-8">
                  <div className="mb-6">
                    <h2 className="text-3xl uppercase tracking-wider mb-3">
                      {currentGroup.name}
                    </h2>
                    <p className="text-sm text-[var(--muted-foreground)] mb-4">
                      {currentGroup.bio}
                    </p>
                    
                    {/* Member Avatars */}
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {currentGroup.members && currentGroup.members.length > 0 ? (
                          <>
                            {currentGroup.members.slice(0, 4).map((member, idx) => (
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
                            {currentGroup.members.length > 4 && (
                              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-xs font-bold">
                                +{currentGroup.members.length - 4}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {currentGroup.members?.length || 1}{' '}
                        {currentGroup.members?.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={handlePass}
                      disabled={actionLoading}
                      className="flex-1 px-8 py-6 border-2 border-red-500 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <X className="w-6 h-6" />
                      <span className="text-sm uppercase tracking-wider">Pass</span>
                    </button>
                    <button
                      onClick={handleLike}
                      disabled={actionLoading}
                      className="flex-1 px-8 py-6 bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Heart className="w-6 h-6" />
                      <span className="text-sm uppercase tracking-wider">
                        {actionLoading ? 'Liking...' : 'Like'}
                      </span>
                    </button>
                  </div>

                  {/* Counter */}
                  <div className="mt-6 text-center text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                    {currentIndex + 1} / {availableGroups.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Match Modal */}
      {showMatchModal && matchedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[var(--border)] p-12 max-w-md text-center animate-bounce">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-3xl uppercase tracking-wider mb-4">
              It&apos;s a Match!
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              You matched with <strong>{matchedGroup.name}</strong>!
            </p>
            <Link
              href="/matches"
              className="inline-block px-8 py-3 bg-[var(--foreground)] text-[var(--background)] text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              View Match
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

