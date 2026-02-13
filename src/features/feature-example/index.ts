import type { RegisterContext } from 'hook-app';

const FEATURE_NAME = 'feature-example';

const hooks = {
  EXAMPLE_HOOK: 'feature-hook',
};

export default ({ registerAction, registerHook }: RegisterContext) => {
  registerHook(hooks);

  registerAction({
    hook: '$INIT_FEATURE',
    name: FEATURE_NAME,
    handler: () => {
      console.log('[Feature Example] INIT');
    },
  });

  registerAction({
    hook: '$START_FEATURE',
    name: FEATURE_NAME,
    handler: ({ getConfig, knownHooks, createHook }: RegisterContext) => {
      console.log('[Feature Example] START');

      const appName = getConfig<string>('app.name', 'Unknown App');
      const version = getConfig<string>('app.version', '1.0.0');
      console.log(`[Feature Example] Running ${appName} v${version}`);

      createHook.sync(knownHooks['EXAMPLE_HOOK'] as string, {
        message: 'Hello from example hook',
      });
    },
  });

  registerAction({
    hook: '$EXAMPLE_HOOK',
    name: FEATURE_NAME,
    handler: ({ message }: { message: string }) => {
      console.log('[Feature Example] EXAMPLE_HOOK listener received message:', message);
    },
  });
};
