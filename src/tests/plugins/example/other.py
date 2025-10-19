def some_utils(v):
    return v

def read_book_from_file() -> str:
    f = open("src/tests/old_book.json", "r")
    return f.read()