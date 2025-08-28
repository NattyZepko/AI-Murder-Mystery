import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const handler = require('../../api/health');
export default handler;
