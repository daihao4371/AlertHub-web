import { useEffect } from 'react';

/**
 * Auto-scroll hook - scrolls to bottom when dependencies change
 * @param {React.RefObject} endRef - Scroll anchor ref
 * @param {React.RefObject} containerRef - Container ref (optional)
 * @param {Array} dependencies - useEffect dependency array
 */
export const useAutoScroll = (endRef, containerRef, dependencies) => {
    useEffect(() => {
        if (endRef.current && (containerRef ? containerRef.current : true)) {
            endRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencies);
};