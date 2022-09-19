import { MXcli } from "../cli/MXcli";

test('Fetch a single item', () => {
    const command = '--plugin plugin_name --fetch 177013';
    const mxcli = new MXcli ();
    const parsed = mxcli.parse (command.split(' '));
    const keys = Array.from (parsed.keys());

    expect(keys).toContain('Plugin');
    expect(keys).toContain('FetchMeta');
    expect(parsed.get('FetchMeta')).toHaveLength(1);
});

test('Fetch an arbitrary number of items', () => {
    const command = '--plugin plugin_name --fetch-all 177013 410410 1234 159013';
    const mxcli = new MXcli ();
    const parsed = mxcli.parse (command.split(' '));
    const keys = Array.from (parsed.keys());

    expect(keys).toContain('Plugin');
    expect(keys).toContain('FetchMeta-List');
    expect(parsed.get('Plugin')).toContain('plugin_name');
    expect(parsed.get('FetchMeta-List')).toHaveLength(4);
    expect(parsed.get('FetchMeta-List')).toContain('159013');
    expect(parsed.get('FetchMeta-List')).toContain('1234');
});

test('Use command aliases', () => {
    const command_a = '--auto --fetch http://some/link/to/a/title';
    const command_b = '-a -f http://some/link/to/a/title';

    const mxcli = new MXcli ();
    const parsed_a = mxcli.parse (command_a.split(' '));
    const parsed_b = mxcli.parse (command_b.split(' '));

    expect(parsed_a.get('Plugin-Auto-Detect'))
        .toHaveLength(0);
    
    expect(parsed_b.get('Plugin-Auto-Detect'))
        .toHaveLength(0);
    
    expect(parsed_a.get('FetchMeta'))
        .toStrictEqual(parsed_b.get('FetchMeta'));
});

