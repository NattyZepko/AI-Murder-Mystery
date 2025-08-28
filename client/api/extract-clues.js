import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const handler = require('../../api/extract-clues');
export default handler;
