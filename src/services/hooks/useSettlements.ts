import { Settlement } from '@/types';
import { useEffect, useState } from 'react';
import { subscribeToGroupSettlements } from '../api/settlements';

/**
 * Real-time settlements for a group.
 * Automatically updates when settlements are added, paid, or regenerated.
 */
export function useSettlements(groupId: string | undefined) {
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!groupId) {
            setSettlements([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsub = subscribeToGroupSettlements(groupId, data => {
            setSettlements(data);
            setIsLoading(false);
        });

        return unsub;
    }, [groupId]);

    return { settlements, isLoading };
}
