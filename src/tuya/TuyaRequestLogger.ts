import fs from "fs/promises";
import path from "path";

export class RequestLogger {
    private counts: Record<string, number> = {};
    private filePath: string;
    private ready = false;

    constructor(filePath?: string) {
        const dir = path.join(process.cwd(), "logs");
        const defaultFilename = `${RequestLogger.formatTimestamp(new Date())}.json`;
        const defaultPath = path.join(dir, defaultFilename);
        // permite override via parâmetro ou variável de ambiente; caso contrário usa arquivo com timestamp
        this.filePath = filePath || process.env.TUYA_REQUEST_LOG_FILE || defaultPath;
        this.init().catch(err => {
            if (process.env.DEBUG === "true") console.error("[RequestLogger] init error:", err);
        });
    }

    /** Formata data para AAAAMMDDHHmmss */
    private static formatTimestamp(d: Date): string {
        const pad = (n: number, size = 2) => String(n).padStart(size, "0");
        const YYYY = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const DD = pad(d.getDate());
        const HH = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${YYYY}${MM}${DD}${HH}${mm}${ss}`;
    }

    /** Inicializa carregando arquivo existente (se houver) */
    private async init(): Promise<void> {
        const dir = path.dirname(this.filePath);
        await fs.mkdir(dir, { recursive: true });
        try {
            const content = await fs.readFile(this.filePath, "utf8");
            this.counts = JSON.parse(content) || {};
        } catch (err: any) {
            // se não existe, começa vazio e cria o arquivo
            if (err.code !== "ENOENT") {
                throw err;
            }
            this.counts = {};
            await this.flush();
        }
        this.ready = true;
    }

    /** Persiste imediatamente o mapa de contagens */
    private async flush(): Promise<void> {
        const data = JSON.stringify(this.counts, null, 2);
        await fs.writeFile(this.filePath, data, "utf8");
    }

    /**
     * Registra uma chamada para a rota informada.
     * @param route path utilizado (deve ser a mesma string usada para assinar)
     */
    async log(route: string): Promise<void> {
        if (!route) return;
        // garante init concluído
        if (!this.ready) {
            try {
                await this.init();
            } catch (err) {
                if (process.env.DEBUG === "true") console.error("[RequestLogger] init failed:", err);
            }
        }

        // incrementa contagem
        const key = route;
        this.counts[key] = (this.counts[key] || 0) + 1;

        // grava no disco (simples, síncrono-async)
        try {
            await this.flush();
        } catch (err) {
            if (process.env.DEBUG === "true") console.error("[RequestLogger] flush error:", err);
        }
    }

    /** Retorna cópia do mapa atual (útil para debug/testes) */
    getCounts(): Record<string, number> {
        return { ...this.counts };
    }
}

export const requestLogger = new RequestLogger();