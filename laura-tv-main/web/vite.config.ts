import {
  defineConfig,
  loadEnv,
} from 'vite';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/*
 * Every VITE_* variable becomes public browser code.
 *
 * Reject names that clearly imply SECRET material.
 *
 * Do NOT reject "SUPABASE" itself:
 *
 * Supabase project URLs and anon/publishable keys
 * are intentionally safe for frontend clients.
 *
 * Actual Supabase secrets such as service-role keys
 * remain forbidden below.
 */
const sensitivePublicName =
  /(SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|ACCESS_TOKEN|REFRESH_TOKEN|ADMIN_KEY|SIGNING_KEY|TMDB_API_KEY|TMDB_API_TOKEN)/i;

const validateAbsoluteUrl = (
  name: string,
  value: string,
) => {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `${name} must be a valid absolute URL.`,
    );
  }

  if (
    parsed.protocol !== 'http:' &&
    parsed.protocol !== 'https:'
  ) {
    throw new Error(
      `${name} must use http:// or https://.`,
    );
  }

  if (
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      `${name} must not contain embedded credentials.`,
    );
  }

  return parsed;
};

const validateFrontendEnv = (
  mode: string,
) => {
  const env =
    loadEnv(
      mode,
      process.cwd(),
      '',
    );

  /*
   * Every VITE_* variable becomes public.
   *
   * Reject variables whose NAMES indicate they
   * contain private credentials.
   */
  const forbiddenPublicVariables =
    Object.keys(env).filter(
      name =>
        name.startsWith(
          'VITE_',
        ) &&
        sensitivePublicName.test(
          name,
        ),
    );

  if (
    forbiddenPublicVariables.length >
    0
  ) {
    throw new Error(
      `Sensitive values must never use VITE_* variables: ${forbiddenPublicVariables.join(', ')}`,
    );
  }

  /*
   * Explicitly reject known dangerous Supabase
   * variable names even if someone later changes
   * the generic regex above.
   */
  const forbiddenSupabaseNames = [
    'VITE_SUPABASE_SERVICE_ROLE_KEY',
    'VITE_LAURATV_SUPABASE_SERVICE_ROLE_KEY',
    'VITE_SUPABASE_SECRET_KEY',
    'VITE_LAURATV_SUPABASE_SECRET_KEY',
  ];

  const exposedSupabaseSecrets =
    forbiddenSupabaseNames.filter(
      name =>
        Boolean(
          env[name]?.trim(),
        ),
    );

  if (
    exposedSupabaseSecrets.length >
    0
  ) {
    throw new Error(
      `Supabase server credentials must never be exposed through VITE_* variables: ${exposedSupabaseSecrets.join(', ')}`,
    );
  }

  /*
   * Validate configured URLs syntactically during
   * every build.
   */
  for (const name of [
    'VITE_API_BASE_URL',
    'VITE_COWATCH_URL',
    'VITE_COWATCH_PUBLIC_URL',
    'VITE_LAURATV_SUPABASE_URL',
  ]) {
    const value =
      env[name]?.trim();

    if (!value) {
      continue;
    }

    validateAbsoluteUrl(
      name,
      value,
    );
  }

  /*
   * LauraTV release download configuration.
   *
   * The Supabase URL and anon/publishable key are
   * intentionally PUBLIC browser configuration.
   */
  const releaseSupabaseUrl =
    env
      .VITE_LAURATV_SUPABASE_URL
      ?.trim();

  const releaseSupabaseAnonKey =
    env
      .VITE_LAURATV_SUPABASE_ANON_KEY
      ?.trim();

  if (
    Boolean(
      releaseSupabaseUrl,
    ) !==
    Boolean(
      releaseSupabaseAnonKey,
    )
  ) {
    throw new Error(
      'VITE_LAURATV_SUPABASE_URL and VITE_LAURATV_SUPABASE_ANON_KEY must either both be configured or both be omitted.',
    );
  }

  if (
    releaseSupabaseUrl
  ) {
    const parsed =
      validateAbsoluteUrl(
        'VITE_LAURATV_SUPABASE_URL',
        releaseSupabaseUrl,
      );

    if (
      parsed.protocol !==
      'https:'
    ) {
      throw new Error(
        'VITE_LAURATV_SUPABASE_URL must use https://.',
      );
    }
  }

  /*
   * Reject modern Supabase SECRET keys if someone
   * accidentally pastes one into the public anon-key
   * variable.
   */
  if (
    releaseSupabaseAnonKey &&
    /^sb_secret_/i.test(
      releaseSupabaseAnonKey,
    )
  ) {
    throw new Error(
      'VITE_LAURATV_SUPABASE_ANON_KEY contains a Supabase secret key. Use only the public anon/publishable key.',
    );
  }

  /*
   * IMPORTANT:
   *
   * `vite build` always runs in production mode,
   * including when YOU run it locally.
   *
   * Therefore HTTPS-only deployment requirements
   * must not trigger merely because mode === production.
   *
   * Vercel provides VERCEL=1 during its build.
   */
  const isVercelBuild =
    process.env.VERCEL ===
    '1';

  if (!isVercelBuild) {
    return;
  }

  const cowatchUrl =
    env
      .VITE_COWATCH_URL
      ?.trim();

  if (!cowatchUrl) {
    throw new Error(
      'VITE_COWATCH_URL is required on Vercel and must point to the deployed Railway Cowatch backend.',
    );
  }

  const cowatchParsed =
    validateAbsoluteUrl(
      'VITE_COWATCH_URL',
      cowatchUrl,
    );

  if (
    cowatchParsed.protocol !==
    'https:'
  ) {
    throw new Error(
      'VITE_COWATCH_URL must use https:// on Vercel.',
    );
  }

  const publicUrl =
    env
      .VITE_COWATCH_PUBLIC_URL
      ?.trim();

  if (!publicUrl) {
    throw new Error(
      'VITE_COWATCH_PUBLIC_URL is required on Vercel.',
    );
  }

  const publicParsed =
    validateAbsoluteUrl(
      'VITE_COWATCH_PUBLIC_URL',
      publicUrl,
    );

  if (
    publicParsed.protocol !==
    'https:'
  ) {
    throw new Error(
      'VITE_COWATCH_PUBLIC_URL must use https:// on Vercel.',
    );
  }

  const apiUrl =
    env
      .VITE_API_BASE_URL
      ?.trim();

  if (apiUrl) {
    const apiParsed =
      validateAbsoluteUrl(
        'VITE_API_BASE_URL',
        apiUrl,
      );

    if (
      apiParsed.protocol !==
      'https:'
    ) {
      throw new Error(
        'VITE_API_BASE_URL must use https:// on Vercel.',
      );
    }
  }

  /*
   * Release downloads are part of the production
   * LauraTV homepage, so require them on Vercel.
   */
  if (
    !releaseSupabaseUrl
  ) {
    throw new Error(
      'VITE_LAURATV_SUPABASE_URL is required on Vercel.',
    );
  }

  if (
    !releaseSupabaseAnonKey
  ) {
    throw new Error(
      'VITE_LAURATV_SUPABASE_ANON_KEY is required on Vercel.',
    );
  }
};

export default defineConfig(
  ({ mode }) => {
    validateFrontendEnv(
      mode,
    );

    return {
      plugins: [
        react(),
        tailwindcss(),
      ],

      server: {
        port: 3173,
      },

      build: {
        /*
         * Prevent production JavaScript source maps
         * from being shipped publicly.
         */
        sourcemap: false,
      },
    };
  },
);