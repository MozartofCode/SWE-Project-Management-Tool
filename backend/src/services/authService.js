const { supabaseAdmin } = require('./supabase');

const register = async ({ email, password, full_name }) => {
  try {
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      if (
        authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('already exists') ||
        authError.code === 'email_exists'
      ) {
        const err = new Error('Email already registered');
        err.status = 409;
        err.code = 'EMAIL_EXISTS';
        throw err;
      }
      throw authError;
    }

    const userId = authData.user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: userId, email, full_name })
      .select()
      .single();

    if (profileError) {
      // Rollback: remove the auth user so the email is not locked
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    // Sign in immediately to return a session token
    const { data: session, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (signInError) throw signInError;

    return {
      user: profile,
      token: session.session.access_token,
    };
  } catch (err) {
    throw err;
  }
};

const login = async ({ email, password }) => {
  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return {
      user: profile,
      token: data.session.access_token,
    };
  } catch (err) {
    throw err;
  }
};

const logout = async (userId) => {
  try {
    await supabaseAdmin.auth.admin.signOut(userId);
  } catch (err) {
    // Log but don't fail — client-side token removal is sufficient
    console.error('[Auth] Logout error:', err.message);
  }
};

const getMe = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      const err = new Error('Profile not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return data;
  } catch (err) {
    throw err;
  }
};

module.exports = { register, login, logout, getMe };
