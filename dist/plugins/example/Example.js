"use strict";
exports.__esModule = true;
exports.Example = void 0;
var Example = /** @class */ (function () {
    function Example() {
        // let's define some variables
        this.title = 'Plugin Example';
        this.unique_identifier = 'example';
        this.author = 'afmika';
        this.version = '1.0.0';
        this.target_url = 'https://example.com';
    }
    Example.prototype.config = function (option) {
        this.option = option;
    };
    Example.prototype.fetchBook = function (identifier) {
        return null;
    };
    Example.prototype.search = function (term, option) {
        return [];
    };
    Example.prototype.sortChapters = function () {
        return null;
    };
    Example.prototype.getMetaDatas = function () {
        return null;
    };
    return Example;
}());
exports.Example = Example;
