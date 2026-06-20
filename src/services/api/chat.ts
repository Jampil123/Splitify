import {
    addDoc,
    collection,
    db,
    doc,
    getDoc,
    increment,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from '../firebase/config';
import { onSnapshot } from 'firebase/firestore';
import { Conversation, Message } from '@/types';

export function getConversationId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
}

export async function getOrCreateConversation(
    currentUser: { id: string; fullName: string; photoURL?: string | null },
    friend: { id: string; fullName: string; photoURL?: string | null }
): Promise<Conversation> {
    const convId = getConversationId(currentUser.id, friend.id);
    const convRef = doc(db, 'conversations', convId);

    const existing = await getDoc(convRef);
    if (!existing.exists()) {
        // Only write initial fields on creation — never overwrite lastMessage or unreadCount
        await setDoc(convRef, {
            participants: [currentUser.id, friend.id],
            participantNames: {
                [currentUser.id]: currentUser.fullName,
                [friend.id]: friend.fullName,
            },
            participantPhotos: {
                [currentUser.id]: currentUser.photoURL ?? null,
                [friend.id]: friend.photoURL ?? null,
            },
            unreadCount: {
                [currentUser.id]: 0,
                [friend.id]: 0,
            },
            lastMessage: null,
            lastMessageAt: null,
            lastMessageBy: null,
            createdAt: serverTimestamp(),
        });
        const newSnap = await getDoc(convRef);
        return { id: newSnap.id, ...newSnap.data() } as Conversation;
    }

    return { id: existing.id, ...existing.data() } as Conversation;
}

export async function sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    text: string,
    participants: string[]
): Promise<void> {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const convRef = doc(db, 'conversations', conversationId);

    await addDoc(messagesRef, {
        text: text.trim(),
        senderId,
        senderName,
        createdAt: serverTimestamp(),
        readBy: [senderId],
        type: 'text',
    });

    const unreadIncrements: Record<string, any> = {};
    participants.forEach(uid => {
        if (uid !== senderId) {
            unreadIncrements[`unreadCount.${uid}`] = increment(1);
        }
    });

    await updateDoc(convRef, {
        lastMessage: text.trim(),
        lastMessageAt: serverTimestamp(),
        lastMessageBy: senderId,
        ...unreadIncrements,
    });
}

export async function markAsRead(conversationId: string, userId: string): Promise<void> {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
        [`unreadCount.${userId}`]: 0,
    }).catch(() => {
        // Conversation may not exist yet — ignore
    });
}

export function subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
): () => void {
    const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(100)
    );
    return onSnapshot(q, snapshot => {
        callback(
            snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Message)
        );
    });
}

export function subscribeToConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
): () => void {
    const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
    );
    return onSnapshot(q, snapshot => {
        callback(
            snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Conversation)
        );
    });
}
