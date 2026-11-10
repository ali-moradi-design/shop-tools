'use client';

import { useState } from 'react';
import { clientApi } from '@/shared/api/client';

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  if (state === 'done') return <p role="status" className="mt-6 text-[15px]">You are unsubscribed. We will not email you again.</p>;
  return (
    <div className="mt-6">
      <p className="text-[15px] text-mute">Stop getting our newsletter?</p>
      <button
        type="button"
        disabled={state === 'busy'}
        className="btn mt-5"
        onClick={async () => {
          setState('busy');
          try {
            await clientApi('/newsletter/unsubscribe', { method: 'POST', body: JSON.stringify({ token }) });
            setState('done');
          } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Something went wrong');
            setState('error');
          }
        }}
      >
        Unsubscribe
      </button>
      {state === 'error' && <p role="alert" className="mt-3 text-danger">{message}</p>}
    </div>
  );
}
