export interface TokenData {
    access_token: string;
    refresh_token: string;
    expire_time: number; // segundos (fornecido pela Tuya)
    expire_at?: number;  // timestamp calculado (ms)
}

export interface TokenStore {
    setTokens(tokens: TokenData): Promise<void>;
    getAccessToken(): Promise<string | undefined>;
    getRefreshToken(): Promise<string | undefined>;
    isExpired(): Promise<boolean>;
    clear(): Promise<void>;
}

/**
 * Armazena tokens em memória com controle automático de expiração.
 * Ideal para desenvolvimento e uso temporário.
 */
export class MemoryTokenStore implements TokenStore {
    private tokens?: TokenData;

    /** Armazena tokens e calcula horário de expiração (timestamp) */
    async setTokens(tokens: TokenData): Promise<void> {
        const expireAt = Date.now() + tokens.expire_time * 1000 - 10_000; // -10s de margem
        this.tokens = { ...tokens, expire_at: expireAt };
    }

    /** Retorna o access_token se ainda for válido */
    async getAccessToken(): Promise<string | undefined> {
        if (this.tokens && !await this.isExpired()) {
            return this.tokens.access_token;
        }
        return undefined;
    }

    async getRefreshToken(): Promise<string | undefined> {
        return this.tokens?.refresh_token;
    }

    /** Verifica se o token atual está expirado */
    async isExpired(): Promise<boolean> {
        if (!this.tokens?.expire_at) return true;
        return Date.now() >= this.tokens.expire_at;
    }

    async clear(): Promise<void> {
        this.tokens = undefined;
    }
}
