const config = {
    CLOUDFARE_PROXY_HOST : 'http://localhost:8191/v1',
    LOAD_PLUGINS : [
        'Example',
        'NHentai'
    ],
    PLUGIN_PROXY_ENABLE : [
        'NHentai' 
    ],
    CLOUDFARE_MAX_TIMEOUT : 120000,
    UNIQUE_SESSION : 'd8eaacb0-351f-11ed-8b21-b3cab1c549cf',
    DOWNLOAD_FOLDER : {
        DOWNLOAD : './download/download',
        TEMP : './download/temp'
    }
};

export {config};