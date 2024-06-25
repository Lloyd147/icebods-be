const jwt = require('jsonwebtoken');

function authorize(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).send('Access denied. No token provided.');

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(401).send('Invalid token');
  }
}

module.exports = authorize;
