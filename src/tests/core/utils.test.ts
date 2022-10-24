import { batchAListOf, cleanFolderName, decodeUnicodeCharacters, levenshtein } from "../../utils/Utils";

test('Edit distance', () => {
    expect(levenshtein('hello', 'hlmeo')).toBe(3);
});

test('Clean folder name', () => {
    const title = '  folder:*?*.name~/  ';
    const cleaned = cleanFolderName (title);
    expect(cleaned).toBe('folder_name_');
});

test('Decode unicode characters', () => {
    const title = '\\u30d1\\u30f3%tsu';
    expect(decodeUnicodeCharacters (title))
        .toBe('パン%tsu');
});


test('Create batches of size 3 for 10 items', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const size = 3;
    const result = batchAListOf<number>(list, size);
    expect(result).toHaveLength(4);
    expect(result.pop()).toHaveLength(1);
});