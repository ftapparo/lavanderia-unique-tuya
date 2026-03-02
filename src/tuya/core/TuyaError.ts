export class TuyaError extends Error {
    constructor(message: string, public code?: string | number) {
        super(message);
        this.name = "TuyaError";
    }
}
