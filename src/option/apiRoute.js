export const settingsStorageKey = 'apiSettings';


export const serviceConfigurations = {

    // ============================================================
    // LOCAL SERVICES
    // ============================================================

    local: {

        ollama: {
            serviceName: 'Ollama',

            requiredFields: [
                'localMultimodalModel'
            ],

            labels: {
                localMultimodalModel: 'Ollama Model Name',
            },

            messageTemplate:
                '[FIELD_LABEL] is missing. Please configure in Options page.',

            speechTemplate:
                'Local API settings missing.'
        },


        lmstudio: {
            serviceName: 'LM Studio',

            requiredFields: [
                'lmstudioModelName'
            ],

            labels: {
                lmstudioModelName: 'LM Studio Model Name',
            },

            messageTemplate:
                '[FIELD_LABEL] is missing. Please configure in Options page.',

            speechTemplate:
                'Local API settings missing.'
        },


        vllm: {
            serviceName: 'VLLM',

            requiredFields: [
                'localApiUrl',
                'vllmModelName'
            ],

            labels: {
                localApiUrl: 'VLLM Server URL',
                vllmModelName: 'vLLM Model Name',
            },

            messageTemplate:
                '[FIELD_LABEL] is missing. Please configure in Options page.',

            speechTemplate:
                'Local API settings missing.'
        },


        'gemini-nano': {
            serviceName: 'Gemini Nano',

            requiredFields: [],

            labels: {},

            messageTemplate:
                'Gemini Nano is selected and requires no further configuration.',

            speechTemplate:
                'Gemini Nano selected.'
        }
    },


    // ============================================================
    // CLOUD SERVICES
    // ============================================================

    cloud: {

        'gemini-direct': {
            serviceName: 'Gemini',

            requiredFields: [
                'cloudApiKey',
                'cloudModelName'
            ],

            labels: {
                cloudApiKey: 'Gemini API Key',
                cloudModelName: 'Gemini Model Name',
            },

            messageTemplate:
                '[FIELD_LABEL] is missing. Please configure in Options page.',

            speechTemplate:
                '[SERVICE_NAME] settings missing: [FIELD_LABEL].'
        },


        'gemini-proxy': {
            serviceName: 'Vertex AI (GCP)',

            requiredFields: [
                'cloudProxyUrl',
                'gcpApiKey',
                'cloudModelName'
            ],

            labels: {
                cloudProxyUrl: 'API Gateway Endpoint',
                gcpApiKey: 'GCP API Key',
                cloudModelName: 'Gemini Model Name',
            },

            messageTemplate:
                '[FIELD_LABEL] is missing. Please configure in Options page.',

            speechTemplate:
                '[SERVICE_NAME] settings missing: [FIELD_LABEL].'
        },


        mistral: {
            serviceName: 'Mistral',

            requiredFields: [
                'mistralApiKey',
                'mistralModelName'
            ],

            labels: {
                mistralApiKey: 'Mistral API Key',
                mistralModelName: 'Mistral Model Name',
            },

            messageTemplate:
                '[FIELD_LABEL] is missing. Please configure in Options page.',

            speechTemplate:
                '[SERVICE_NAME] settings missing: [FIELD_LABEL].'
        },


        'azure-foundry': {
            serviceName: 'AI Foundry (Azure)',

            requiredFields: [
                'apimEndpoint',
                'apimSubscriptionKey',
                'azureFoundryModelName'
            ],

            labels: {
                apimEndpoint: 'APIM Endpoint',
                apimSubscriptionKey: 'APIM Subscription Key',
                azureFoundryModelName: 'AI Foundry Model Name',
            },

            messageTemplate:
                '[FIELD_LABEL] is missing. Please configure in Options page.',

            speechTemplate:
                '[SERVICE_NAME] settings missing: [FIELD_LABEL].'
        }
    }
};


// ============================================================
// DEFAULT API SETTINGS
// ============================================================

export const defaultApiSettings = {

    // ----------------------------------------------------------
    // ACTIVE MODE
    // ----------------------------------------------------------

    activeApiMode: 'cloud',


    // ----------------------------------------------------------
    // LOCAL SETTINGS
    // ----------------------------------------------------------

    localApiMode: 'ollama',

    localApiUrl:
        'http://localhost:8000',

    localMultimodalModel:
        'gemma3:4b',

    lmstudioModelName:
        'google/gemma-3-4b',

    vllmModelName:
        '',


    // ----------------------------------------------------------
    // GEMINI CLOUD SETTINGS
    // ----------------------------------------------------------

    cloudProvider:
        'gemini',

    cloudApiMethod:
        'direct',

    // Primary Gemini model
    cloudModelName:
        'gemini-3.5-flash-lite',

    cloudApiKey:
        '',


    // ----------------------------------------------------------
    // VERTEX AI / PROXY SETTINGS
    // ----------------------------------------------------------

    cloudProxyUrl:
        '',

    gcpApiKey:
        '',


    // ----------------------------------------------------------
    // MISTRAL SETTINGS
    // ----------------------------------------------------------

    mistralModelName:
        'mistral-medium-latest',

    mistralApiKey:
        '',


    // ----------------------------------------------------------
    // AZURE AI FOUNDRY SETTINGS
    // ----------------------------------------------------------

    apimEndpoint:
        '',

    apimSubscriptionKey:
        '',

    azureFoundryModelName:
        ''

};