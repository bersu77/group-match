'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { sendMessage } from '@/lib/firebase/chat';
import { ChatRoom, ChatMessage } from '@/types/chat';
import { Send, X, Users } from 'lucide-react';

interface InlineChatProps {
  chatRoom: ChatRoom;
  onClose: () => void;
}

export default function InlineChat({ chatRoom, onClose }: InlineChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatRoom.id) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatRoomId', '==', chatRoom.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];

      // Sort in JavaScript
      fetchedMessages.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [chatRoom.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatRoom.id || sending) return;

    const messageToSend = newMessage.trim();
    setNewMessage(''); // Clear input immediately
    setSending(true);
    
    try {
      await sendMessage(
        chatRoom.id,
        user.uid,
        user.displayName || user.email?.split('@')[0] || 'Anonymous',
        messageToSend
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-[var(--border)]">
      {/* Chat Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h3 className="text-lg uppercase tracking-wider">
            {chatRoom.group1Name} × {chatRoom.group2Name}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <Users className="w-3 h-3" />
            {chatRoom.memberIds.length} members
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-sm text-[var(--muted-foreground)]">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.senderId === user?.uid
                    ? 'bg-[var(--foreground)] text-[var(--background)] rounded-br-none'
                    : 'bg-gray-100 text-[var(--foreground)] rounded-bl-none'
                }`}
              >
                {msg.senderId !== user?.uid && (
                  <p className="text-xs font-bold mb-1 opacity-70">
                    {msg.senderName}
                  </p>
                )}
                <p className="text-sm break-words">{msg.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.senderId === user?.uid
                      ? 'text-[var(--background)] opacity-70'
                      : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  {new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-[var(--border)]">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2 bg-[var(--input)] border border-[var(--border)] focus:border-[var(--foreground)] outline-none transition-colors text-sm"
            placeholder="Type your message..."
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

