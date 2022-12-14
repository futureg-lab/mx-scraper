const config = {
    CLOUDFARE_PROXY_HOST : 'http://localhost:8191/v1',
    CLOUDFARE_MAX_TIMEOUT : 120000,
    LOAD_PLUGINS : [
        'Example',
        'NHentai',
        'EHentai',
        'GPrincess',
        'Eyval'
    ],
    HEADLESS : {
        ENGINE : 'JSDOM',
        ENABLE : true,
        EXEC_PATH : './browser/chrome'
    },
    PLUGIN_PROXY_ENABLE : [
        'NHentai' 
    ],
    UNIQUE_SESSION : 'ae790d20-377a-11ed-afce-cbaaa8f182c5',
    DOWNLOAD_FOLDER : {
        DOWNLOAD : './download/download',
        TEMP : './download/temp'
    },
    CACHE : {
        ENABLE : true,
        FOLDER : './query_cache'
    },
    MAX_SIZE_BATCH : 10,
    LOGGER : {
        ENABLE : true
    },
    SHOW_CLI_ERROR_STACK : false
};

export {config};