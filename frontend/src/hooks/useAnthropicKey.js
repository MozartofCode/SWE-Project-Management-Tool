import { useState, useEffect } from 'react';
import { anthropicKeyApi } from '../services/api';

export default function useAnthropicKey() {
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    anthropicKeyApi.getStatus()
      .then((res) => setHasKey(res.data.data.has_anthropic_key))
      .catch(() => setHasKey(false))
      .finally(() => setLoading(false));
  }, []);

  return { hasKey, loading, setHasKey };
}
