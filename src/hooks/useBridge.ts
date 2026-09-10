
import { useState, useEffect, useCallback } from 'react';
import { BridgeStatus } from '../types';
import { bridgeClient } from '../services/bridgeClient';

export const useBridge = () => {
  const [status, setStatus] = useState<BridgeStatus>(BridgeStatus.Disconnected);
  const [lastPushResult, setLastPushResult] = useState<{ success: boolean; time: number } | null>(null);

  useEffect(() => {
    bridgeClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  const connect = useCallback((url?: string) => {
    bridgeClient.connect(url);
  }, []);

  const pushToEditor = useCallback(async (script: string) => {
    const success = await bridgeClient.pushScript(script);
    setLastPushResult({ success, time: Date.now() });
    return success;
  }, []);

  return {
    status,
    connect,
    pushToEditor,
    lastPushResult
  };
};
