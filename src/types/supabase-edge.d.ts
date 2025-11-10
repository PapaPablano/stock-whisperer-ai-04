declare module 'https://esm.sh/@supabase/supabase-js@2.39.3' {
  export * from '@supabase/supabase-js';
}

declare global {
  interface DenoNamespace {
    env: {
      get(key: string): string | undefined;
    };
    serve: (handler: (request: Request) => Response | Promise<Response>) => void;
  }

  const Deno: DenoNamespace;
}

export {};
