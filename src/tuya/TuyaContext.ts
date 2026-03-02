import {
    TuyaOpenApiClient,
    TuyaClientOptions,
} from "./core/TuyaOpenApiClient";

// Exemplo de interface genérica para serviços Tuya
export interface ITuyaService {
    client: TuyaOpenApiClient;
}

/**
 * Contexto principal que agrupa o cliente da API e os serviços Tuya.
 * Equivalente ao tuyaContext.js original, mas fortemente tipado.
 */
export class TuyaContext {
    public client: TuyaOpenApiClient;

    // serviços placeholders — futuramente você pode criar classes específicas
    public user?: ITuyaService;
    public assets?: ITuyaService;
    public device?: ITuyaService;
    public deviceFunction?: ITuyaService;
    public deviceLogs?: ITuyaService;
    public deviceRegistration?: ITuyaService;
    public deviceStatus?: ITuyaService;

    constructor(options: TuyaClientOptions) {
        this.client = new TuyaOpenApiClient(options);

        // Quando forem implementados os serviços, ficaria assim:
        // this.user = new TuyaOpenApiUserService(this.client);
        // this.device = new TuyaOpenApiDeviceService(this.client);
    }

    /**
     * Método genérico de requisição direta (bypass dos serviços)
     * @param opt Parâmetros da requisição
     */
    async request<T = any>(opt: {
        path: string;
        method?: "GET" | "POST" | "PUT" | "DELETE";
        body?: any;
        query?: Record<string, any>;
        headers?: Record<string, string>;
    }): Promise<T> {
        const res = await this.client.request({
            path: opt.path,
            method: opt.method || "GET",
            body: opt.body,
            query: opt.query,
            headers: opt.headers,
        });

        // O cliente atual retorna envelope Tuya com `result`.
        return res.result as T;
    }
}
