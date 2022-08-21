"use strict";
exports.__esModule = true;
exports.NHentai = void 0;
var CustomRequest_1 = require("../../utils/CustomRequest");
var NHentai = /** @class */ (function () {
    function NHentai() {
        // let's define some variables
        this.title = 'NHentai';
        this.author = 'afmika';
        this.version = '1.0.0';
        this.unique_identifier = 'nhentai';
        this.target_url = 'https://nhentai.net/';
    }
    NHentai.prototype.config = function (option) {
        this.option = option;
    };
    NHentai.prototype.fetchBook = function (hentai_id) {
        var url = this.target_url + 'g/' + hentai_id;
        var request = new CustomRequest_1.CustomRequest({
            proxy_url: 'http:'
        });
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
