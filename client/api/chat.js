import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const handler = require('../../api/chat');
export default handler;
