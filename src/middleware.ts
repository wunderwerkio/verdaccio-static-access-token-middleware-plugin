import buildDebug from 'debug';
import type { IPluginMiddleware, Logger } from '@verdaccio/types';
import type { Response, NextFunction } from 'express';
import type { $RequestExtend, AccessToken, EnrichedConfig } from './types';
import { createRemoteUser } from '@verdaccio/config';
import { PLUGIN_NAME } from './constants';

const debug = buildDebug('verdaccio:plugin:static-access-token-middleware');

/**
 * The static access token middleware plugin.
 *
 * This plugin registeres a new middleware in the express app and checks for
 * static access tokens in the Authorization header.
 * The token must be sent as a "Bearer" token and must have a length of at least 16.
 * Note that the user specified in the config does not need to be actually registered.
 */
export default class StaticAccessTokenMiddlewarePlugin implements IPluginMiddleware<EnrichedConfig> {
  private config: EnrichedConfig;
  private logger: Logger;
  private accessTokens: Map<string, AccessToken>;

  /**
   * Construct new instance.
   *
   * @param config - The config object.
   */
  public constructor(config: EnrichedConfig) {
    this.logger = config.logger;
    this.config = config;

    // Saves tokens to map.
    this.accessTokens = new Map(config.staticAccessTokens?.map((token) => [token.key, token]) ?? []);
  }

  /**
   * Register the app middleware.
   *
   * This method is called by the verdaccio plugin system.
   *
   * @param app - The express app.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public register_middlewares(app: any): void {
    // Check if plugin is actually enabled.
    if (!this.isPluginEnabled()) {
      debug('Plugin is not enabled!');
      return;
    }

    // Make sure all tokens are secure.
    this.validateTokenSecurity();

    debug('Registering plugin with following tokens:', this.accessTokens);

    // Register express middleware.
    app.use((req: $RequestExtend, res: Response, next: NextFunction) => {
      const { authorization } = req.headers;
      if (!authorization) {
        debug('Skipping, no authorization header set');
        return next();
      }

      if (!this.isAuthHeaderValid(authorization)) {
        debug('Skipping, bad authorization header');
        return next();
      }

      const tokenValue = this.extractAccessToken(authorization);
      if (!tokenValue) {
        debug('Skipping, bad access token');
        return next();
      }

      // Get access token for passed token value.
      const accessToken = this.accessTokens.get(tokenValue);
      if (!accessToken) {
        debug('Skipping, unknown access token or jwt');
        return next();
      }

      // Add user to request.
      debug(`User ${accessToken.user} authenticated via static access token`);
      req.remote_user = createRemoteUser(accessToken.user, [accessToken.user]);

      // If token is readonly, we only add user for GET requests.
      if (accessToken.readonly && !this.isReadRequest(req)) {
        debug('Readonly token does not allow manipulative actions!');

        // Attach error.
        req.remote_user.error = 'forbidden';

        this.logger.warn(`Write access denied for readonly access token for user ${accessToken.user}`);

        return res.sendStatus(403);
      }

      // Hand over to next middleware.
      next();
    });
  }

  /**
   * Checks if the plugin is enabled in config.
   */
  protected isPluginEnabled(): boolean {
    if (PLUGIN_NAME in this.config.middlewares) {
      return Boolean(this.config.middlewares[PLUGIN_NAME].enabled);
    }

    debug('Middleware not defined! This should never happen!');

    return false;
  }

  /**
   * Validate all tokens.
   *
   * This is to prevent very insecure tokens, such as 123 or abc.
   */
  protected validateTokenSecurity(): void {
    for (const token of this.accessTokens.values()) {
      if (token.key.length < 16) {
        throw new Error(`Insecure static access token: ${token.key} must have a length of at least 16!`);
      }
    }
  }

  /**
   * Validates format of authorization header.
   *
   * The value of the authorization header must be "Bearer my-super-secret-token".
   *
   * @param authorization - The value of the authorization header.
   */
  protected isAuthHeaderValid(authorization: string): boolean {
    return authorization.split(' ').length === 2;
  }

  /**
   * Extract access token from authorization header.
   *
   * @param authorization - The value of the authorization header.
   */
  protected extractAccessToken(authorization: string): string | null {
    return authorization.split(' ')[1];
  }

  /**
   * Checks if current request is a read operation.
   *
   * This is just a very simple check and it relies on the consistent
   * use of http methods to never use HEAD or GET requests for write operation.
   *
   * @param req - The request object.
   */
  protected isReadRequest(req: $RequestExtend): boolean {
    return ['HEAD', 'GET'].includes(req.method);
  }
}
