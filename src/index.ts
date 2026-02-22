import 'dotenv/config';

import hookApp from 'hook-app';
import dashboardGenerator from './features/dashboard-generator/index.js';
import linkedInAnalytics from './features/linkedin-analytics/index.js';
import linkedInAuth from './features/linkedin-auth/index.js';
import browserService from './services/browser/index.js';

hookApp({
  settings: {
    app: {
      name: 'LinkedIn Stats',
      version: '1.0.0',
    },
    linkedin: {
      cookiePath: process.env['LINKEDIN_COOKIE_PATH'] ?? './data/session_cookies.json',
      headless: process.env['LINKEDIN_HEADLESS'] !== 'false',
      username: process.env['LINKEDIN_USERNAME'] ?? '',
      password: process.env['LINKEDIN_PASSWORD'] ?? '',
      loginTimeoutSeconds: Number(process.env['LINKEDIN_LOGIN_TIMEOUT_SECONDS'] ?? 120),
    },
  },
  services: [browserService],
  features: [linkedInAuth, linkedInAnalytics, dashboardGenerator],
  trace: 'compact',
})
  .then(() => {
    console.log('App finished successfully');
  })
  .catch((error) => {
    console.error('Error running app:', error);
    process.exit(1);
  });
