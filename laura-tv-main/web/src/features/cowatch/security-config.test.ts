import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseOptionalBoolean,
  resolveDevToolsProtection,
} from '../../config/security-values'

test(
  'anti-devtools protection defaults off locally and on in production',
  () => {
    assert.equal(
      resolveDevToolsProtection(
        undefined,
        true,
      ),
      false,
    )

    assert.equal(
      resolveDevToolsProtection(
        undefined,
        false,
      ),
      true,
    )
  },
)

test(
  'anti-devtools protection supports explicit environment overrides',
  () => {
    assert.equal(
      resolveDevToolsProtection(
        'true',
        true,
      ),
      true,
    )

    assert.equal(
      resolveDevToolsProtection(
        '1',
        true,
      ),
      true,
    )

    assert.equal(
      resolveDevToolsProtection(
        'yes',
        true,
      ),
      true,
    )

    assert.equal(
      resolveDevToolsProtection(
        'on',
        true,
      ),
      true,
    )

    assert.equal(
      resolveDevToolsProtection(
        'false',
        false,
      ),
      false,
    )

    assert.equal(
      resolveDevToolsProtection(
        '0',
        false,
      ),
      false,
    )

    assert.equal(
      resolveDevToolsProtection(
        'no',
        false,
      ),
      false,
    )

    assert.equal(
      resolveDevToolsProtection(
        'off',
        false,
      ),
      false,
    )
  },
)

test(
  'invalid anti-devtools environment values fall back to the environment default',
  () => {
    assert.equal(
      parseOptionalBoolean(
        'unexpected',
      ),
      undefined,
    )

    assert.equal(
      resolveDevToolsProtection(
        'unexpected',
        true,
      ),
      false,
    )

    assert.equal(
      resolveDevToolsProtection(
        'unexpected',
        false,
      ),
      true,
    )
  },
)