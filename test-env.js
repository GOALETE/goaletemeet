require('dotenv').config();

console.log('Environment variables test:');
console.log('ADMIN_PASSCODE:', process.env.ADMIN_PASSCODE);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('All env keys:', Object.keys(process.env).filter(key => key.includes('ADMIN') || key.includes('DATABASE')));
