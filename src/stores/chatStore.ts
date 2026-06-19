import { create } from 'zustand';

export interface ChatToastData {
    senderName: string;
    senderPhoto: string | null;
    text: string;
    friendId: string;
    friendName: string;
}

interface ChatState {
    totalUnread: number;
    toast: ChatToastData | null;
    setTotalUnread: (count: number) => void;
    showToast: (toast: ChatToastData) => void;
    dismissToast: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    totalUnread: 0,
    toast: null,
    setTotalUnread: (count) => set({ totalUnread: count }),
    showToast: (toast) => set({ toast }),
    dismissToast: () => set({ toast: null }),
}));
