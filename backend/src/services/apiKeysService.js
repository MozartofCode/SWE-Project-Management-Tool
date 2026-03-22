const crypto = require('crypto');
const { supabaseAdmin } = require('./supabase');

const KEY_PREFIX = 'pfk_';
const KEY_BYTES = 32; // 256-bit random key

function generateRawKey() {
  return KEY_PREFIX + crypto.randomBytes(KEY_BYTES).toString('hex');
}

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function getDisplayPrefix(rawKey) {
  // Show first 12 chars: "pfk_a1b2c3d4"
  return rawKey.slice(0, 12);
}

const listApiKeys = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, key_prefix, last_used_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
};

const createApiKey = async (userId, name) => {
  try {
    const rawKey = generateRawKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = getDisplayPrefix(rawKey);

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({ user_id: userId, name, key_hash: keyHash, key_prefix: keyPrefix })
      .select('id, name, key_prefix, created_at')
      .single();

    if (error) throw error;

    // Return the full raw key ONCE — it is never stored
    return { ...data, key: rawKey };
  } catch (err) {
    throw err;
  }
};

const revokeApiKey = async (userId, keyId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId) // ownership check
      .select('id')
      .single();

    if (error || !data) {
      const notFound = new Error('API key not found');
      notFound.statusCode = 404;
      notFound.code = 'NOT_FOUND';
      throw notFound;
    }
  } catch (err) {
    throw err;
  }
};

// Called by auth middleware — looks up a pfk_ token and returns the user profile
const verifyApiKey = async (rawKey) => {
  try {
    const keyHash = hashKey(rawKey);

    const { data: apiKey, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, user_id, profiles(id, email, role, full_name)')
      .eq('key_hash', keyHash)
      .single();

    if (error || !apiKey) return null;

    // Fire-and-forget last_used_at update
    supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id)
      .then(() => {});

    return {
      id: apiKey.user_id,
      email: apiKey.profiles.email,
      role: apiKey.profiles.role,
      full_name: apiKey.profiles.full_name,
    };
  } catch (err) {
    return null;
  }
};

module.exports = { listApiKeys, createApiKey, revokeApiKey, verifyApiKey };
