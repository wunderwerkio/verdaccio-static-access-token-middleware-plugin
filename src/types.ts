import type { Config, Logger, RemoteUser } from '@verdaccio/types';
import type { Request } from 'express';

export type AccessToken = {
  user: string;
  key: string;
  readonly?: boolean;
};

export type EnrichedConfig = Config & Partial<PluginConfig>;

export type PluginConfig = {
  staticAccessTokens: AccessToken[];
};

export type $RequestExtend = Request & {
  remote_user?: RemoteUser;
  log: Logger;
};
