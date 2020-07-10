import { useMemo, useState, useEffect } from 'react';

export const useSocket = (domain: string, onMessage: any) => {
  const [ws, setWs] = useState();
  const [connected, setConnected] = useState();

  useMemo(() => {
    setWs(new WebSocket(domain);
  }, [domain]);
  
  useEffect(() => {
    ws.onopen = () => {
      setConnected(true);
    }

    ws.onclose = () => {
      setConnected(false);
    }
    
    ws.onmessage = onMessage;

    return () => ws.close();
  }, [ws]);
  
  return { connected, ws };
}