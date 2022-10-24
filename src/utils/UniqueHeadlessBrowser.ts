import { HeadlessBrowser, HeadlessType } from "./HeadlessBrowser";

/**
 * Singleton wrapper for `HeadlessBrowser` 
 */
export class UniqueHeadlessBrowser {
    private static instance : UniqueHeadlessBrowser = null;
    private headless : HeadlessBrowser = null;
    private constructor () { }
    
    /**
     * @param type 
     * @returns global instance of `UniqueHeadlessBrowser` | create a new one if not defined
     */
    static async getInstance (type? : HeadlessType) {
        if (UniqueHeadlessBrowser.instance == null) {
            UniqueHeadlessBrowser.instance = new UniqueHeadlessBrowser ();
            UniqueHeadlessBrowser.instance.headless = await HeadlessBrowser.create (type);
        }
        return UniqueHeadlessBrowser.instance;
    }

    /**
     * @returns `HeadlessBrowser` attached to the current instance
     */
    getHeadlessBrowser () {
        return this.headless;
    }

    /**
     * Free all resources
     */
    destroy () {
        this.headless.destroy();
        UniqueHeadlessBrowser.instance = null;
    }
}