const config = {
    CLOUDFARE_PROXY_HOST : 'http://localhost:8191/v1',
    CLOUDFARE_MAX_TIMEOUT : 120000,
    LOAD_PLUGINS : [
        'Example',
        'NHentai',
        'EHentai'
    ],
    PLUGIN_PROXY_ENABLE : [
        'NHentai' 
    ],
    UNIQUE_SESSION : 'bf849930-35be-11ed-8061-85fbb987363d',
    DOWNLOAD_FOLDER : {
        DOWNLOAD : './download/download',
        TEMP : './download/temp'
    },
    LOGGER : {
        ENABLE : true
    }
};

export {config};