import { createApp } from './src/app.js';
import { config, isConfigured } from './src/config.js';

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`BolBiz listening on :${config.port}`);
  console.log(`  Claude: ${isConfigured.claude() ? 'on' : 'MISSING ANTHROPIC_API_KEY'} | GoDaddy API: ${isConfigured.godaddy() ? 'on' : 'RDAP fallback'} | Email: ${isConfigured.smtp() ? 'on' : 'off'}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
