"use strict";
exports.__esModule = true;
exports.NHentai = void 0;
var NHentai = /** @class */ (function () {
    function NHentai() {
        // let's define some variables
        this.title = 'NHentai';
        this.author = 'afmika';
        this.version = '1.0.0';
        this.target_url = 'https://nhentai.net/';
    }
    NHentai.prototype.fetchBook = function (option) {
        return null;
    };
    NHentai.prototype.search = function (term, option) {
        return [];
    };
    NHentai.prototype.sortChapters = function () {
        return null;
    };
    NHentai.prototype.getMetaDatas = function () {
        return null;
    };
    return NHentai;
}());
exports.NHentai = NHentai;
