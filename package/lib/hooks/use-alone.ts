import { useState } from 'react';
import { useSocket } from './use-socket';

export const useAlone = (domain: string) => {
  const [tally, setTally] = useState();

  const onMessage = e => {
    const message = JSON.parse(e.data);
    if (message.type === 'people') {
      setTally(message.tally);
    }
  };

  const { connected, ws } = useSocket(domain, onMessage);
  
  const alone = connected ? tally === 1 : tally === 0;
  
  const wave = () => {
    ws.send(JSON.stringify({ action: 'wave' }));
  };

  return {
    connected,
    alone,
    tally,
    wave
  };
};