# Tuya Integration Service

Este módulo é responsável por integrar o sistema com a plataforma Tuya,
controlando tomadas inteligentes conectadas às máquinas de lavar e secar.

Ele apenas executa comandos e retorna dados normalizados.
Ele possui jobs para monitorar sessões de energia e detectar no-shows e overtimes.

A API principal consome este serviço.

---

## Responsabilidades

- Autenticar na plataforma Tuya
- Ligar dispositivo
- Desligar dispositivo
- Obter status
- Obter consumo de energia
- Normalizar erros

---

## Tecnologias

- Node.js
- TypeScript
- HTTP client (axios)
- Retry com backoff
- Logger estruturado

---

## Funções Principais

- getAccessToken()
- turnOn(deviceId)
- turnOff(deviceId)
- getStatus(deviceId)
- getConsumption(deviceId)

---

## Regras Importantes

- Sempre usar retry para falhas transitórias
- Nunca expor credenciais no front
- Sempre retornar erros padronizados

---

## Modo Mock

O serviço deve permitir modo MOCK para desenvolvimento,
sem necessidade de conexão real com Tuya.

Exemplo:

TUYA_MOCK_MODE=true

---

## Configurações via .env

- TUYA_CLIENT_ID
- TUYA_CLIENT_SECRET
- TUYA_BASE_URL
- TUYA_MOCK_MODE

---

## Objetivo

Ser um módulo previsível, testável e isolado,
responsável apenas pela comunicação com a Tuya.
---

## Windows (PowerShell) e UTF-8

Para evitar problemas de encoding (mojibake) ao rodar scripts/comandos no Windows, configure o terminal para UTF-8 antes de trabalhar:

```powershell
chcp 65001
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

Recomendado usar PowerShell 7 (`pwsh`) e manter os arquivos em UTF-8.
