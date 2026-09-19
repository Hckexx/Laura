import {
  readdir,
  readFile,
  stat,
} from 'node:fs/promises';

import {
  fileURLToPath,
} from 'node:url';

import {
  join,
  relative,
} from 'node:path';

const distDir =
  fileURLToPath(
    new URL(
      '../dist/',
      import.meta.url,
    ),
  );

const files = [];

const forbidden = [
  {
    label:
      'Supabase secret key',

    pattern:
      /sb_secret_[A-Za-z0-9_-]+/,
  },

  {
    label:
      'Supabase service-role variable',

    pattern:
      /SUPABASE_SERVICE_ROLE_KEY/,
  },

  {
    label:
      'TMDB server credential variable',

    pattern:
      /TMDB_API_TOKEN/,
  },

  {
    label:
      'private key material',

    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },

  /*
   * Older Supabase service-role credentials and
   * many other bearer credentials can be JWTs.
   *
   * A real JWT appearing in the compiled frontend
   * should always be reviewed rather than silently
   * shipped.
   */
  {
    label:
      'JWT-shaped credential',

    pattern:
      /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}/,
  },
];

async function walk(
  directory,
) {
  for (
    const entry
    of await readdir(directory)
  ) {
    const path =
      join(
        directory,
        entry,
      );

    const info =
      await stat(path);

    if (
      info.isDirectory()
    ) {
      await walk(path);
    } else {
      files.push(path);
    }
  }
}

await walk(
  distDir,
);

const failures = [];

for (
  const file
  of files
) {
  const display =
    relative(
      distDir,
      file,
    );

  if (
    file.endsWith(
      '.map',
    )
  ) {
    failures.push(
      `${display}: source map must not be shipped`,
    );

    continue;
  }

  if (
    !/\.(?:html|js|css|json|svg|txt)$/i.test(
      file,
    )
  ) {
    continue;
  }

  const text =
    await readFile(
      file,
      'utf8',
    );

  for (
    const check
    of forbidden
  ) {
    if (
      check.pattern.test(
        text,
      )
    ) {
      failures.push(
        `${display}: contains ${check.label}`,
      );
    }
  }
}

if (
  failures.length > 0
) {
  console.error(
    'Frontend security check failed:',
  );

  for (
    const failure
    of failures
  ) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  `Frontend security check passed (${files.length} built files scanned).`,
);