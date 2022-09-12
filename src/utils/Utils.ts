export function levenshtein (a: string, b: string) : number{
    let u = a.length,
    v = b.length;
    let arr = [];

    for (let k = -1; k < u; k++) {
        arr[k] = [];
        arr[k][-1] = k + 1;
    }

    for (let j = -1; j < v; j++, arr[-1][j] = j + 1);
    
    for (let k = 0; k < u; k++) {
        for (let j = 0; j < v; j++) {
            const cost = a.charAt(k) === b.charAt(j) ? 0 : 1;
            arr[k][j] = Math.min(
                1    + arr[k][j - 1], 
                1    + arr[k - 1][j],
                cost + arr[k - 1][j - 1]
            );
        }
    }

    return arr[u - 1][v - 1];
}