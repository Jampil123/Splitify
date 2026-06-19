import { AppState, AppStateStatus } from 'react-native';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './config';

export function initPresence(userId: string): () => void {
    const userRef = doc(db, 'users', userId);

    const markOnline = () => {
        updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() }).catch(() => {});
    };

    const markOffline = () => {
        updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
    };

    markOnline();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
        if (state === 'active') markOnline();
        else markOffline();
    });

    return () => {
        markOffline();
        subscription.remove();
    };
}
