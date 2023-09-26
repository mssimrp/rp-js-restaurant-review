const crypto = require('crypto');

const generateJwtSecret = () => {
  const secret = crypto.randomBytes(32).toString('hex');
  console.log(`Generated JWT secret: ${secret}`);
};

generateJwtSecret();