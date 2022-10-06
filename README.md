# verdaccio-static-access-token-middleware-plugin

Adds support for static access tokens to verdaccio.

## Motivation

Verdaccio supports creating NPM tokens via the `npm token` command already.  
However, verdaccio uses JWT for the tokens which have an expiry date.

When using verdaccio as a registriy in CI/CD setups, having to use tokens with
an expiration date (which is rather short lived when using JWT) is really annoying.

Using JWT with no expiration date or not validating JWTs expiration date is
not an option, because the token contains all necesarry information and
cannot be invalidated from the server side.

This plugins enables you to specify a hard-coded list of access tokens in the
verdaccio config.  
The plugin then registers a custom middleware to check incoming requests for the
registered access tokens and authenticates the request accordingly.

## Features

- Define custom access tokens, used in `.npmrc` as the `_authToken` value.
- Each token is mapped to a verdaccio user. The user does not need to be
created beforehand.
- Ability to make access tokens read-only to prohibit write operations when
authenticating with that access token.

## Usage

Install the plugin as any other verdaccio plugin.

Either install it globally via `npm i -g @wunderwerk/verdaccio-static-access-token-middleware-plugin`
or save it into the verdaccio plugins folder. More information: [Verdaccio Docs](https://verdaccio.org/docs/plugins/)

Then add the plugin configuration to your verdaccio `config.yaml`:

```yaml
middlewares:
  '@wunderwerk/verdaccio-static-access-token-middleware-plugin':
    enabled: true # You can enable/disable the plugin here.
    staticAccessTokens:
      # Key maps to verdaccio user `verdaccio-user` and has read permissions.
      - key: my-super-secret-key
        user: verdaccio-user
        readonly: true
      # Key maps to verdaccio user `verdaccio-user` and has read/write permissions.
      - key: my-super-secret-key-with-write-perms
        user: verdaccio-user
        readonly: false
```

**Important:** For security reasons, the access token value must have a length of
at least 16 characters!
