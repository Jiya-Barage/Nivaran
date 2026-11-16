const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'hostelcare-secret-change-me');
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Session expired or invalid.' });
  }
}

module.exports = { requireAuth };
