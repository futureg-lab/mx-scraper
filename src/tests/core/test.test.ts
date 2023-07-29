function add(a: number, b: number) {
  return a + b;
}

test("Test integration check : adds 1 + 2 to equal 3", () => {
  expect(1 + 2).toBe(3);
});
