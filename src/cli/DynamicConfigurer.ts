import * as fs from 'fs';
import * as path from 'path';
import { config } from '../environment';
import { MXLogger } from './MXLogger';
import { argv } from 'node:process';

/**
 * Provides a way to override the configuration located in `src/environment.ts`
 */
export class DynamicConfigurer {
    /**
     * Filename of the project configuration file
     */
    static CONFIG_FILENAME : string = 'mx-scraper.config.json';

    /**
     * Commplete path of the project configuration file
     */
    static configPath () {
        const [exec_file, ] = argv;
        let conf_dir = path.dirname (exec_file);

        // are we in dev mode ?
        // if yes, we must change it to the caller folder
        if (conf_dir.includes('node_modules')) 
            conf_dir = path.dirname (require.main.filename);
        
        return path.join (conf_dir, DynamicConfigurer.CONFIG_FILENAME);
    }

    /**
     * Create a configuration file if not created yet
     */
    static createConfigIfNotDefined () {
        const file_path = DynamicConfigurer.configPath ();
        if (!fs.existsSync (file_path))
            this.forceCreateConfig ();
    }

    /**
     * Create | Overwrite project configuration file 
     */
    static forceCreateConfig () {
        const content = JSON.stringify (config, null, 2);
        const file_path = DynamicConfigurer.configPath ();
        fs.writeFileSync (file_path, content);
    }

    /**
     * Override the project configuration `environment.ts` at runtime
     */
    static forceOverrideConfig () {
        this.createConfigIfNotDefined ();
        const file_path = DynamicConfigurer.configPath ();
        const json = JSON.parse (fs.readFileSync (file_path).toString());
        MXLogger.info ('[Config] Using ' + file_path);
        for (let key in json)
            config[key] = json[key];
    }

    /**
     * Dynamically overwrite a value of the current configuration
     * @param key target to overwrite
     * @param value value associated to `key`
     */
    static overrideField (key : string, value : any) {
        config[key] = value;
    }
}