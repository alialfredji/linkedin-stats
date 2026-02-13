import hookApp from 'hook-app';
import featureExample from './features/feature-example/index.js';

hookApp({
  settings: {
    app: {
      name: 'Simple Hook App',
      version: '1.0.0',
    },
  },
  features: [featureExample],
  trace: 'compact',
})
  .then(() => {
    console.log('App started: Successfully!');
  })
  .catch((error) => {
    console.error('Error starting app:', error);
    process.exit(1);
  });
