function add(a, b) {
    return a + b;
}
test('Test integration check : adds 1 + 2 to equal 3', function () {
    expect(1 + 2).toBe(3);
});
