import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const handler = require('../../api/log-client-error');
export default handler;
