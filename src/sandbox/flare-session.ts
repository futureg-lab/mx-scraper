import { config } from "../environment ";
import { FlareSolverrClient } from "../utils/FlareSolverrClient";

const local_proxy = config.CLOUDFARE_PROXY_HOST;
(async () => {
    const solver = new FlareSolverrClient(local_proxy);
    const session = await solver.createSession ();
    console.log(session, 'created');
    await solver.destroySession (session);

    const list_current = await solver.getSessions();
    console.log('is it deleted from ? ', list_current);
}) ();