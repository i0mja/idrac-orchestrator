export interface Credentials {
  username: string;
  password: string;
}

export interface SecretsAdapter {
  getIdracCreds(vaultPath: string): Promise<Credentials>;
  getVcenterCreds(vaultPath: string): Promise<Credentials>;
}

async function fromEnv(vaultPath: string): Promise<Credentials> {
  const prefix = vaultPath.replace(/^env:/, '');
  const username = process.env[`${prefix}_USERNAME`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!username || !password) {
    throw new Error(`Missing credentials for ${prefix}`);
  }
  return { username, password };
}

export const envAdapter: SecretsAdapter = {
  async getIdracCreds(vaultPath: string) {
    if (vaultPath.startsWith('env:')) {
      return fromEnv(vaultPath);
    }
    throw new Error('Vault adapter not implemented');
  },
  async getVcenterCreds(vaultPath: string) {
    if (vaultPath.startsWith('env:')) {
      return fromEnv(vaultPath);
    }
    throw new Error('Vault adapter not implemented');
  },
};

export default envAdapter;
