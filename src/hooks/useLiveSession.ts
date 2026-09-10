
import { useState, useEffect, useCallback, useRef } from 'react';
import { liveClient } from '../services/ai/liveClient';

export const useLiveSession = () => {
    const [isActive, setIsActive] = useState(false);
    const [status, setStatus] = useState<string>('Idle');
    const [volume, setVolume] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

    const connect = useCallback(async (useVision: boolean = false) => {
        setIsActive(true);
        setError(null);
        
        let stream: MediaStream | undefined;
        if (useVision) {
            try {
                // Attempt to get screen share stream
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        displaySurface: 'window',
                        frameRate: 5
                    },
                    audio: false
                });
                setVideoStream(stream);
                
                // Handle user stopping screen share via browser UI
                stream.getVideoTracks()[0].onended = () => {
                    disconnect();
                };
            } catch (e: any) {
                console.error("Screen share failed", e);
                
                // Check specifically for permissions policy errors
                if (e.name === 'SecurityError' || e.message?.includes('permissions policy') || e.message?.includes('disallowed')) {
                    setError("Screen Capture Blocked: The current browser environment restricts screen sharing. Try opening the app in a new tab.");
                } else if (e.name === 'NotAllowedError') {
                    setError("Screen share permission was denied by the user.");
                } else {
                    setError("Failed to initialize Live Eyes. Your browser may not support screen capture in this context.");
                }
                
                setIsActive(false);
                return;
            }
        }

        try {
            await liveClient.connect(
                (newStatus) => setStatus(newStatus),
                (level) => setVolume(Math.min(level * 5, 1)),
                stream
            );
        } catch (e) {
            setError("Could not connect to voice services.");
            setIsActive(false);
            if (stream) stream.getTracks().forEach(t => t.stop());
        }
    }, []);

    const disconnect = useCallback(() => {
        liveClient.disconnect();
        if (videoStream) {
            videoStream.getTracks().forEach(t => t.stop());
            setVideoStream(null);
        }
        setIsActive(false);
        setStatus('Idle');
        setVolume(0);
    }, [videoStream]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            liveClient.disconnect();
            if (videoStream) videoStream.getTracks().forEach(t => t.stop());
        };
    }, []);

    return {
        isActive,
        status,
        volume,
        error,
        videoStream,
        connect,
        disconnect
    };
};
