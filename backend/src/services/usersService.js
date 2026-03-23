const { supabaseAdmin } = require('./supabase');

const listUsers = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
};

const getUserById = async (id) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        const err = new Error('User not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
};

const updateUser = async (id, requesterId, { full_name, avatar_url }) => {
  try {
    if (id !== requesterId) {
      const err = new Error('You can only update your own profile');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const updates = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
};

const saveAnthropicKey = async (userId, key) => {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ anthropic_api_key: key || null, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
  } catch (err) {
    throw err;
  }
};

const getAnthropicKeyStatus = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('anthropic_api_key')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return { has_anthropic_key: !!data.anthropic_api_key };
  } catch (err) {
    throw err;
  }
};

module.exports = { listUsers, getUserById, updateUser, saveAnthropicKey, getAnthropicKeyStatus };
