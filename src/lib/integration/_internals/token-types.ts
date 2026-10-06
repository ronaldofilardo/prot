export interface IProtheusTokenProvider {
  getValidToken(empresaId: string, forceRefresh?: boolean): Promise<string>;
}

export interface ProtheusCredencialData {
  empresaId: string;
  baseUrl: string;
  clientId: string;
  username: string;
  passwordEnc: string;
  accessToken?: string | null;
  expiresAt?: Date | null;
}

export interface ProtheusCredencialDelegate {
  findUnique(args: { where: { empresaId: string } }): Promise<ProtheusCredencialData | null>;
  update(args: {
    where: { empresaId: string };
    data: { accessToken: string; expiresAt: Date };
  }): Promise<unknown>;
}

export interface ProtheusCredencialStore {
  protheusCredencial?: ProtheusCredencialDelegate;
}

export interface MemoryTokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}
