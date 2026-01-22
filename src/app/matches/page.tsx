'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, onSnapshot, or } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import GroupSidebar from '@/components/GroupSidebar';
import Navbar from '@/components/Navbar';
import InlineChat from '@/components/InlineChat';
import { getUserGroups, getGroupsByMember, getGroup } from '@/lib/firebase/groups';
import { getChatRoomByMatchId, getChatRoom } from '@/lib/firebase/chat';
import { Group } from '@/types/group';
import { GroupMatch } from '@/types/match';
import { ChatRoom } from '@/types/chat';
import { Heart, Users, MessageCircle, User } from 'lucide-react';

export default function MatchesPage() {
  return (
    <ProtectedRoute>
      <MatchesContent />
    </ProtectedRoute>
  );
}

function MatchesContent() {
  const { user } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [, setMyGroups] = useState<Group[]>([]);
  const [matches, setMatches] = useState<Array<{ match: GroupMatch; matchedGroup: Group; chatRoomId?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoom | null>(null);

  useEffect(() => {
    loadMyGroups();
  }, [user]);

  // Real-time listener for matches
  useEffect(() => {
    if (!selectedGroupId) return;

    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef,
      or(
        where('groupId1', '==', selectedGroupId),
        where('groupId2', '==', selectedGroupId)
      )
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const matchesWithGroups = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const matchData = { id: doc.id, ...doc.data() } as GroupMatch;
          const otherGroupId =
            matchData.groupId1 === selectedGroupId ? matchData.groupId2 : matchData.groupId1;
          
          const [matchedGroup, chatRoom] = await Promise.all([
            getGroup(otherGroupId),
            getChatRoomByMatchId(matchData.id!),
          ]);

          return {
            match: matchData,
            matchedGroup: matchedGroup!,
            chatRoomId: chatRoom?.id,
          };
        })
      );

      setMatches(matchesWithGroups.filter((m) => m.matchedGroup));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedGroupId]);

  const loadMyGroups = async () => {
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

      const groups = Array.from(allGroupsMap.values());
      setMyGroups(groups);

      // Auto-select first group
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groups[0].id!);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedChatRoom(null); // Close chat when switching groups
  };

  const handleOpenChat = async (chatRoomId: string) => {
    try {
      const chatRoom = await getChatRoom(chatRoomId);
      if (chatRoom) {
        setSelectedChatRoom(chatRoom);
      }
    } catch (error) {
      console.error('Error loading chat room:', error);
    }
  };

  const handleCloseChat = () => {
    setSelectedChatRoom(null);
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <GroupSidebar selectedGroupId={selectedGroupId || undefined} onGroupSelect={handleGroupSelect} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Navbar />

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Matches List */}
          <div className={`${selectedChatRoom ? 'w-full lg:w-1/2 border-r border-[var(--border)]' : 'w-full'} overflow-y-auto`}>
            <div className="p-4 lg:p-8">
              <div className={`${selectedChatRoom ? 'max-w-2xl' : 'max-w-6xl'} mx-auto`}>
                <div className="mb-8">
                  <h1 className="text-4xl uppercase tracking-wider mb-2">Matched Groups</h1>
                  <p className="text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
                    {selectedGroupId
                      ? `Click on a group to open chat`
                      : 'Select a group to view matches'}
                  </p>
                </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-lg uppercase tracking-wider animate-pulse">
                  Loading matches...
                </div>
              </div>
            ) : !selectedGroupId ? (
              <div className="text-center py-12 bg-white/80 backdrop-blur-sm border border-[var(--border)] p-12">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl uppercase tracking-wider mb-4">
                  Select a Group
                </h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Choose one of your groups from the sidebar to see matched groups.
                </p>
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-12 bg-white/80 backdrop-blur-sm border border-[var(--border)] p-12">
                <Heart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl uppercase tracking-wider mb-4">
                  No Matches Yet
                </h2>
                <p className="text-sm text-[var(--muted-foreground)] mb-8">
                  Start exploring and liking other groups to create matches!
                </p>
                <Link
                  href={`/explore?groupId=${selectedGroupId}`}
                  className="inline-block px-8 py-3 bg-[var(--foreground)] text-[var(--background)] text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  Explore Groups
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map(({ match, matchedGroup, chatRoomId }) => (
                  <button
                    key={match.id}
                    onClick={() => chatRoomId && handleOpenChat(chatRoomId)}
                    disabled={!chatRoomId}
                    className={`w-full text-left bg-white/80 backdrop-blur-sm border border-[var(--border)] p-6 hover:border-[var(--foreground)] transition-all ${
                      !chatRoomId ? 'opacity-50 cursor-wait' : 'cursor-pointer'
                    } ${selectedChatRoom?.id === chatRoomId ? 'border-[var(--foreground)] bg-gray-50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Group Photo */}
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {matchedGroup.photoURL ? (
                          <img
                            src={matchedGroup.photoURL}
                            alt={matchedGroup.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-8 h-8 text-gray-400" />
                        )}
                      </div>

                      {/* Group Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl uppercase tracking-wider mb-1 truncate">
                          {matchedGroup.name}
                        </h3>
                        <p className="text-sm text-[var(--muted-foreground)] line-clamp-1 mb-2">
                          {matchedGroup.bio}
                        </p>
                        
                        {/* Member Avatars */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex -space-x-2">
                            {matchedGroup.members && matchedGroup.members.length > 0 ? (
                              <>
                                {matchedGroup.members.slice(0, 3).map((member, idx) => (
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
                                {matchedGroup.members.length > 3 && (
                                  <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-[10px] font-bold">
                                    +{matchedGroup.members.length - 3}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
                                <User className="w-3 h-3 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {matchedGroup.members?.length || 1} {matchedGroup.members?.length === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                          <Heart className="w-3 h-3 text-red-500" />
                          Matched {new Date(match.matchedAt.seconds * 1000).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Chat Indicator */}
                      <div className="flex-shrink-0">
                        {chatRoomId ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <MessageCircle className="w-5 h-5" />
                            <span className="hidden sm:inline text-xs uppercase tracking-wider">
                              Chat
                            </span>
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">
                            Setting up...
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          {selectedChatRoom && (
            <div className="hidden lg:block lg:w-1/2 h-full">
              <InlineChat chatRoom={selectedChatRoom} onClose={handleCloseChat} />
            </div>
          )}
        </div>

        {/* Mobile Chat Overlay */}
        {selectedChatRoom && (
          <div className="lg:hidden fixed inset-0 z-50 bg-white">
            <InlineChat chatRoom={selectedChatRoom} onClose={handleCloseChat} />
          </div>
        )}
      </div>
    </div>
  );
}

