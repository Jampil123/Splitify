import { db } from '@/services/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

export function usePresence(userIds: string[]): Record<string, boolean> {
    const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});

    // Stable key so the effect doesn't re-run on every render
    const key = useMemo(() => [...userIds].sort().join(','), [userIds]);

    useEffect(() => {
        if (!userIds.length) return;

        const unsubs = userIds.map((userId) =>
            onSnapshot(doc(db, 'users', userId), (snap) => {
                if (snap.exists()) {
                    setOnlineMap((prev) => ({
                        ...prev,
                        [userId]: snap.data().isOnline === true,
                    }));
                }
            })
        );

        return () => unsubs.forEach((u) => u());
    }, [key]);

    return onlineMap;
}
