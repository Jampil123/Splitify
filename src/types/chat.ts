import { Timestamp } from 'firebase/firestore';

export interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: Timestamp;
    readBy: string[];
    type: 'text';
}

export interface Conversation {
    id: string;
    participants: string[];
    participantNames: Record<string, string>;
    participantPhotos: Record<string, string | null>;
    lastMessage: string | null;
    lastMessageAt: Timestamp | null;
    lastMessageBy: string | null;
    unreadCount: Record<string, number>;
    createdAt: Timestamp;
}
