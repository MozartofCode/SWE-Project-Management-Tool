const { supabaseAdmin } = require('../services/supabase');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { message: 'No token provided', code: 'UNAUTHORIZED' },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: { message: 'Invalid or expired token', code: 'UNAUTHORIZED' },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'member',
    };

    next();
  } catch (err) {
    next(err);
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: { message: 'Admin access required', code: 'FORBIDDEN' },
    });
  }
  next();
};

module.exports = { authenticate, adminOnly };
