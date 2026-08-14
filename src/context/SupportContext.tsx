import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth, OperationType, handleFirestoreError } from './AuthContext';
import { SupportChat, SupportMessage, AuditLog } from '../types';

interface SupportContextType {
  userChats: SupportChat[];
  activeUserChat: SupportChat | null;
  userMessages: SupportMessage[];
  allChats: SupportChat[];
  adminActiveChat: SupportChat | null;
  adminMessages: SupportMessage[];
  unreadForUserCount: number;
  unreadForAdminCount: number;
  loadingMessages: boolean;
  isSending: boolean;
  sendUserMessage: (messageText: string) => Promise<boolean>;
  startNewConversation: () => Promise<void>;
  markUserChatAsRead: (chatId: string) => Promise<void>;
  selectAdminChat: (chat: SupportChat | null) => void;
  sendAdminReply: (chatId: string, messageText: string, targetUserId: string) => Promise<boolean>;
  updateChatStatus: (chatId: string, status: 'open' | 'closed') => Promise<void>;
  refreshSupportData: () => Promise<void>;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

// Input Sanitizer to prevent HTML injection / dangerous scripts
const sanitizeMessage = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/javascript:/gi, '')
    .trim();
};

export const SupportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();

  // User state
  const [userChats, setUserChats] = useState<SupportChat[]>([]);
  const [activeUserChat, setActiveUserChat] = useState<SupportChat | null>(null);
  const [userMessages, setUserMessages] = useState<SupportMessage[]>([]);
  const [unreadForUserCount, setUnreadForUserCount] = useState<number>(0);

  // Admin state
  const [allChats, setAllChats] = useState<SupportChat[]>([]);
  const [adminActiveChat, setAdminActiveChat] = useState<SupportChat | null>(null);
  const [adminMessages, setAdminMessages] = useState<SupportMessage[]>([]);
  const [unreadForAdminCount, setUnreadForAdminCount] = useState<number>(0);

  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  // 1. Listen to User's Support Chats
  useEffect(() => {
    if (!userProfile?.uid) {
      setUserChats([]);
      setActiveUserChat(null);
      setUserMessages([]);
      setUnreadForUserCount(0);
      return;
    }

    const q = query(
      collection(db, 'supportChats'),
      where('userId', '==', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats: SupportChat[] = [];
      let totalUnread = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SupportChat;
        chats.push({ id: docSnap.id, ...data });
        if (data.unreadForUser && data.unreadForUser > 0) {
          totalUnread += data.unreadForUser;
        }
      });

      // Sort by updatedAt descending
      chats.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      setUserChats(chats);
      setUnreadForUserCount(totalUnread);

      // Default to open chat if available, or most recent
      if (chats.length > 0) {
        const openChat = chats.find(c => c.status === 'open');
        setActiveUserChat(openChat || chats[0]);
      } else {
        setActiveUserChat(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'supportChats');
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  // 2. Listen to User Messages for activeUserChat
  useEffect(() => {
    if (!activeUserChat?.chatId) {
      setUserMessages([]);
      return;
    }

    setLoadingMessages(true);
    const messagesRef = collection(db, 'supportChats', activeUserChat.chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(150));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: SupportMessage[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as SupportMessage);
      });
      setUserMessages(msgs);
      setLoadingMessages(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `supportChats/${activeUserChat.chatId}/messages`);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeUserChat?.chatId]);

  // 3. Listen to Admin All Support Chats
  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      setAllChats([]);
      setAdminActiveChat(null);
      setAdminMessages([]);
      setUnreadForAdminCount(0);
      return;
    }

    const chatsRef = collection(db, 'supportChats');
    const unsubscribe = onSnapshot(chatsRef, (snapshot) => {
      const chats: SupportChat[] = [];
      let totalAdminUnread = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SupportChat;
        chats.push({ id: docSnap.id, ...data });
        if (data.unreadForAdmin && data.unreadForAdmin > 0) {
          totalAdminUnread += data.unreadForAdmin;
        }
      });

      chats.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      setAllChats(chats);
      setUnreadForAdminCount(totalAdminUnread);

      // Keep adminActiveChat updated in real-time if selected
      if (adminActiveChat) {
        const updatedSelected = chats.find(c => c.chatId === adminActiveChat.chatId);
        if (updatedSelected) {
          setAdminActiveChat(updatedSelected);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'supportChats (admin)');
    });

    return () => unsubscribe();
  }, [userProfile?.role, adminActiveChat?.chatId]);

  // 4. Listen to Admin Active Chat Messages
  useEffect(() => {
    if (!adminActiveChat?.chatId || userProfile?.role !== 'admin') {
      setAdminMessages([]);
      return;
    }

    const messagesRef = collection(db, 'supportChats', adminActiveChat.chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(200));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: SupportMessage[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as SupportMessage);
      });
      setAdminMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `supportChats/${adminActiveChat.chatId}/messages (admin)`);
    });

    return () => unsubscribe();
  }, [adminActiveChat?.chatId, userProfile?.role]);

  // Mark chat as read for User
  const markUserChatAsRead = useCallback(async (chatId: string) => {
    if (!chatId || !userProfile?.uid) return;
    try {
      const chatDocRef = doc(db, 'supportChats', chatId);
      await updateDoc(chatDocRef, {
        unreadForUser: 0,
      });

      // Update unread admin messages to read: true
      const msgsSnap = await getDocs(
        query(
          collection(db, 'supportChats', chatId, 'messages'),
          where('senderRole', '==', 'admin'),
          where('read', '==', false)
        )
      );

      if (!msgsSnap.empty) {
        const batch = writeBatch(db);
        msgsSnap.forEach((mDoc) => {
          batch.update(mDoc.ref, { read: true });
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Error marking user chat read:', err);
    }
  }, [userProfile?.uid]);

  // Mark chat as read for Admin
  const markAdminChatAsRead = useCallback(async (chatId: string) => {
    if (!chatId || userProfile?.role !== 'admin') return;
    try {
      const chatDocRef = doc(db, 'supportChats', chatId);
      await updateDoc(chatDocRef, {
        unreadForAdmin: 0,
      });

      // Update unread user messages to read: true
      const msgsSnap = await getDocs(
        query(
          collection(db, 'supportChats', chatId, 'messages'),
          where('senderRole', '==', 'user'),
          where('read', '==', false)
        )
      );

      if (!msgsSnap.empty) {
        const batch = writeBatch(db);
        msgsSnap.forEach((mDoc) => {
          batch.update(mDoc.ref, { read: true });
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('Error marking admin chat read:', err);
    }
  }, [userProfile?.role]);

  // Admin Selects a Chat
  const selectAdminChat = useCallback((chat: SupportChat | null) => {
    setAdminActiveChat(chat);
    if (chat?.chatId) {
      markAdminChatAsRead(chat.chatId);
    }
  }, [markAdminChatAsRead]);

  // User sends a message
  const sendUserMessage = useCallback(async (messageText: string): Promise<boolean> => {
    if (!userProfile?.uid) return false;
    const cleanText = sanitizeMessage(messageText);
    if (!cleanText || cleanText.length > 2000) return false;

    setIsSending(true);
    const nowIso = new Date().toISOString();

    try {
      let currentChat = activeUserChat;

      // If no active chat or current active chat is closed, create a brand new conversation
      if (!currentChat || currentChat.status === 'closed') {
        const newChatId = 'chat_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        const newChat: SupportChat = {
          chatId: newChatId,
          userId: userProfile.uid,
          userName: userProfile.displayName || 'Quest Explorer',
          userEmail: userProfile.email || '',
          userPhotoURL: userProfile.photoURL || '',
          status: 'open',
          createdAt: nowIso,
          updatedAt: nowIso,
          lastMessage: cleanText,
          lastMessageAt: nowIso,
          lastSenderRole: 'user',
          unreadForAdmin: 1,
          unreadForUser: 0,
        };

        await setDoc(doc(db, 'supportChats', newChatId), newChat);
        currentChat = newChat;
        setActiveUserChat(newChat);
      } else {
        // Update existing chat
        await updateDoc(doc(db, 'supportChats', currentChat.chatId), {
          lastMessage: cleanText,
          lastMessageAt: nowIso,
          lastSenderRole: 'user',
          status: 'open',
          updatedAt: nowIso,
          unreadForAdmin: (currentChat.unreadForAdmin || 0) + 1,
          unreadForUser: 0,
        });
      }

      // Add message to subcollection
      const msgId = 'msg_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      const newMessage: SupportMessage = {
        messageId: msgId,
        chatId: currentChat.chatId,
        senderId: userProfile.uid,
        senderRole: 'user',
        senderName: userProfile.displayName || 'User',
        senderPhotoURL: userProfile.photoURL || '',
        message: cleanText,
        createdAt: nowIso,
        read: false,
      };

      await setDoc(doc(db, 'supportChats', currentChat.chatId, 'messages', msgId), newMessage);
      setIsSending(false);
      return true;
    } catch (err) {
      console.error('Error sending user support message:', err);
      handleFirestoreError(err, OperationType.CREATE, 'supportChats/messages');
      setIsSending(false);
      return false;
    }
  }, [userProfile, activeUserChat]);

  // Start brand new conversation for user
  const startNewConversation = useCallback(async () => {
    if (!userProfile?.uid) return;
    const nowIso = new Date().toISOString();
    const newChatId = 'chat_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    
    const newChat: SupportChat = {
      chatId: newChatId,
      userId: userProfile.uid,
      userName: userProfile.displayName || 'Quest Explorer',
      userEmail: userProfile.email || '',
      userPhotoURL: userProfile.photoURL || '',
      status: 'open',
      createdAt: nowIso,
      updatedAt: nowIso,
      lastMessage: 'Conversation started',
      lastMessageAt: nowIso,
      lastSenderRole: 'user',
      unreadForAdmin: 0,
      unreadForUser: 0,
    };

    try {
      await setDoc(doc(db, 'supportChats', newChatId), newChat);
      setActiveUserChat(newChat);
      setUserMessages([]);
    } catch (err) {
      console.error('Error creating new conversation:', err);
      handleFirestoreError(err, OperationType.CREATE, 'supportChats');
    }
  }, [userProfile]);

  // Admin replies to a support chat
  const sendAdminReply = useCallback(async (chatId: string, messageText: string, targetUserId: string): Promise<boolean> => {
    if (userProfile?.role !== 'admin' || !chatId) return false;
    const cleanText = sanitizeMessage(messageText);
    if (!cleanText || cleanText.length > 2000) return false;

    setIsSending(true);
    const nowIso = new Date().toISOString();

    try {
      const msgId = 'msg_adm_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      const newMessage: SupportMessage = {
        messageId: msgId,
        chatId: chatId,
        senderId: userProfile.uid,
        senderRole: 'admin',
        senderName: 'Veloura Support',
        senderPhotoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        message: cleanText,
        createdAt: nowIso,
        read: false,
      };

      // 1. Add message doc
      await setDoc(doc(db, 'supportChats', chatId, 'messages', msgId), newMessage);

      // 2. Update chat metadata
      const currentChat = allChats.find(c => c.chatId === chatId) || adminActiveChat;
      await updateDoc(doc(db, 'supportChats', chatId), {
        lastMessage: cleanText,
        lastMessageAt: nowIso,
        lastSenderRole: 'admin',
        updatedAt: nowIso,
        unreadForUser: ((currentChat?.unreadForUser) || 0) + 1,
        unreadForAdmin: 0,
      });

      // 3. Send Notification to user: "Support replied"
      const snippet = cleanText.length > 60 ? cleanText.substring(0, 57) + '...' : cleanText;
      await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
        title: 'Support replied',
        message: `Our support team has replied: "${snippet}"`,
        type: 'admin',
        read: false,
        createdAt: nowIso,
      });

      // 4. Record Audit Log for support reply
      await addDoc(collection(db, 'auditLogs'), {
        adminUid: userProfile.uid,
        adminEmail: userProfile.email,
        targetUserId: targetUserId,
        targetUserEmail: currentChat?.userEmail || 'unknown',
        action: 'support_reply',
        reason: `Support reply sent in chat ${chatId}: "${snippet}"`,
        createdAt: nowIso,
      });

      setIsSending(false);
      return true;
    } catch (err) {
      console.error('Error sending admin support reply:', err);
      handleFirestoreError(err, OperationType.CREATE, `supportChats/${chatId}/messages`);
      setIsSending(false);
      return false;
    }
  }, [userProfile, allChats, adminActiveChat]);

  // Admin closes or reopens conversation
  const updateChatStatus = useCallback(async (chatId: string, status: 'open' | 'closed') => {
    if (userProfile?.role !== 'admin' || !chatId) return;
    const nowIso = new Date().toISOString();

    try {
      const currentChat = allChats.find(c => c.chatId === chatId) || adminActiveChat;
      await updateDoc(doc(db, 'supportChats', chatId), {
        status,
        updatedAt: nowIso,
        ...(status === 'closed' ? { closedAt: nowIso, closedBy: userProfile.email } : { closedAt: null, closedBy: null })
      });

      // Audit log
      await addDoc(collection(db, 'auditLogs'), {
        adminUid: userProfile.uid,
        adminEmail: userProfile.email,
        targetUserId: currentChat?.userId || 'unknown',
        targetUserEmail: currentChat?.userEmail || 'unknown',
        action: status === 'closed' ? 'account_flag' : 'account_unflag', // compatible type or custom
        reason: `Support chat ${chatId} status changed to ${status}`,
        createdAt: nowIso,
      });

      if (adminActiveChat?.chatId === chatId) {
        setAdminActiveChat(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      console.error('Error updating chat status:', err);
      handleFirestoreError(err, OperationType.UPDATE, `supportChats/${chatId}`);
    }
  }, [userProfile, allChats, adminActiveChat]);

  const refreshSupportData = useCallback(async () => {
    // onSnapshot automatically synchronizes data in real-time
  }, []);

  return (
    <SupportContext.Provider
      value={{
        userChats,
        activeUserChat,
        userMessages,
        allChats,
        adminActiveChat,
        adminMessages,
        unreadForUserCount,
        unreadForAdminCount,
        loadingMessages,
        isSending,
        sendUserMessage,
        startNewConversation,
        markUserChatAsRead,
        selectAdminChat,
        sendAdminReply,
        updateChatStatus,
        refreshSupportData,
      }}
    >
      {children}
    </SupportContext.Provider>
  );
};

export const useSupport = () => {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error('useSupport must be used within a SupportProvider');
  }
  return context;
};
