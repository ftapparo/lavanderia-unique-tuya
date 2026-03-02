import { TuyaContext } from "../tuya/TuyaContext";

export interface TuyaDeviceStatus {
    deviceId: string;
    status: Array<{ [key: string]: any }>;
}

export interface TuyaDeviceCommand {
    code: string;
    value: any;
}

export class Tuya {
    private tuya: TuyaContext;

    constructor() {

        const ACCESS_ID = process.env.TUYA_ACCESS_ID || '';
        const ACCESS_SECRET = process.env.TUYA_ACCESS_SECRET || '';
        const ENDPOINT = process.env.TUYA_ENDPOINT || '';

        this.tuya = new TuyaContext({
            baseUrl: ENDPOINT,
            accessKey: ACCESS_ID,
            secretKey: ACCESS_SECRET,
            log: false, // opcional — mostra os headers assinados
        });
    }

    /** Inicializa o cliente Tuya */
    async init() {
        const result = await this.tuya.client.init();
        console.log('[Tuya] Inicialização do cliente Tuya:', result);
    }

    /** Renova o token de acesso */
    async refreshToken() {
        const result = await this.tuya.client.refreshToken();
        console.log('[Tuya] Token de acesso renovado:', result);
    }

    /** Obtém o status dos dispositivos */
    async getDeviceStatus(deviceIds: string[]): Promise<any> {
        try {
            const response = await this.tuya.request({
                path: "/v1.0/iot-03/devices/status?device_ids=" + deviceIds.join(','),
                method: "GET"
            });

            console.log("Status dos dispositivos:", JSON.stringify(response, null, 2));

            let devicesArray: any[] = [];

            if (Array.isArray(response)) {
                devicesArray = response;
            } else if (response && Array.isArray(response.result)) {
                devicesArray = response.result;
            } else if (response && response.data && Array.isArray(response.data.result)) {
                devicesArray = response.data.result;
            }

            return devicesArray;

        } catch (error) {
            console.error('[Tuya] Erro ao obter dados do dispositivo:', error);
            throw error;
        }
    }

    async sendCommand(deviceId: string, commands: TuyaDeviceCommand[]): Promise<any> {
        try {
            const response = await this.tuya.request({
                path: `/v1.0/iot-03/devices/${deviceId}/commands`,
                method: "POST",
                body: {
                    commands: commands
                }
            });

            console.log("Comando enviado:", JSON.stringify(response, null, 2));

            return response;

        } catch (error) {
            console.error('[Tuya] Erro ao enviar comando:', error);
            throw error;
        }
    }
}
