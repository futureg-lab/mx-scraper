import { FlareSolverrClient } from "../utils/FlareSolverrClient";

const local_proxy = 'http://localhost:8191/v1';


test('Create/Destroy FlareSolverr browser session', async () => {
    const solver = new FlareSolverrClient(local_proxy);
    const session_id = await solver.createSession ();
    console.info ('Session id ', session_id, ' created !');
    await solver.destroySession (session_id);
    console.info ('Session id ', session_id, ' destroyed !');

    expect(session_id).toBeDefined();
});

test('Throw an error when destroying non existing session', async () => {
    const solver = new FlareSolverrClient(local_proxy);
    try {
        await solver.destroySession ('fake id');
        throw Error ('Should not reach this line');
    } catch (err) {
        expect(err).toBeDefined();
    }
});

test('Create/Destroy and list 2 FlareSolverr browser sessions', async () => {
    const solver = new FlareSolverrClient(local_proxy);
    const sessions = [];
    // create
    sessions.push(await solver.createSession ());
    sessions.push(await solver.createSession ());
    expect(sessions).toHaveLength(2);
    console.info (sessions.length, ' sessions created !');

    // list
    const list = await solver.getSessions ();
    const result = list.filter(id => sessions.includes(id));
    expect(result).toHaveLength(sessions.length);
    console.info (result.length, ' found !', result.join(' and '));

    // destroy
    try {
        for (let id of sessions)
        await solver.destroySession (id);
        console.info (sessions.length, ' sessions destroyed !');
    } catch (err) {
        expect(err).toBeUndefined();
    }
});