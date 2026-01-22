'use client';

import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { getChatRoom, sendMessage } from '@/lib/firebase/chat';
import { ChatRoom, ChatMessage } from '@/types/chat';
import { Send, Users } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  
  return (
    <ProtectedRoute>
      <ChatContent chatId={chatId} />
    </ProtectedRoute>
  );
}

function ChatContent({ chatId }: { chatId: string }) {
  const { user } = useAuth();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatRoom();
  }, [chatId]);

  // Real-time listener for messages (simple query + JS sorting to avoid composite index)
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('chatRoomId', '==', chatId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];

      // Sort by createdAt in JavaScript to avoid composite index requirement
      newMessages.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);

      setMessages(newMessages);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [chatId]);

  const loadChatRoom = async () => {
    setLoading(true);
    try {
      const room = await getChatRoom(chatId);
      setChatRoom(room);
    } catch (error) {
      console.error('Error loading chat room:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const senderName = user.displayName || user.email?.split('@')[0] || 'Anonymous';
      await sendMessage(chatId, user.uid, senderName, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg uppercase tracking-wider animate-pulse">
          Loading chat...
        </div>
      </div>
    );
  }

  if (!chatRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl uppercase tracking-wider mb-4">Chat Not Found</h2>
          <Link
            href="/matches"
            className="inline-block px-8 py-3 bg-[var(--foreground)] text-[var(--background)] text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Back to Matches
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
                  <Link href="/matches">Matches</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{chatRoom.group1Name} × {chatRoom.group2Name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Chat Info */}
      <div className="border-b border-[var(--border)] bg-white/50 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <Users className="w-3 h-3" />
            {chatRoom.memberIds.length} members
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--muted-foreground)] uppercase tracking-wider">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.senderId === user?.uid;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-lg ${
                      isOwnMessage
                        ? 'bg-[var(--foreground)] text-[var(--background)]'
                        : 'bg-white border border-[var(--border)]'
                    }`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-bold mb-1 uppercase tracking-wider">
                        {message.senderName}
                      </p>
                    )}
                    <p className="text-sm break-words">{message.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage
                          ? 'text-[var(--background)]/70'
                          : 'text-[var(--muted-foreground)]'
                      }`}
                    >
                      {new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-[var(--border)] bg-white sticky bottom-0">
        <div className="max-w-4xl mx-auto p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-[var(--input)] border border-[var(--border)] focus:border-[var(--foreground)] outline-none transition-colors"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-6 py-3 bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-xs uppercase tracking-wider">
                Send
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

