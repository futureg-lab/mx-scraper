"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.MXScraper = void 0;
var Example_1 = require("./plugins/example/Example");
var NHentai_1 = require("./plugins/nhentai/NHentai");
var environement_1 = require("./utils/environement");
var MXScraper = /** @class */ (function () {
    function MXScraper() {
        this.plugins = [];
    }
    /**
     * Register avalaible plugins
     */
    MXScraper.prototype.initPlugins = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.register(new Example_1.Example())];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.register(new NHentai_1.NHentai())];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * @param plugin Plugin to register
     */
    MXScraper.prototype.register = function (plugin) {
        return __awaiter(this, void 0, void 0, function () {
            var current_id, list;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        current_id = plugin.unique_identifier;
                        if (!environement_1.config.PLUGIN_PROXY_ENABLE[current_id]) return [3 /*break*/, 2];
                        return [4 /*yield*/, plugin.configure({
                                useFlareSolverr: true,
                                enableUniqueSession: true
                            })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        list = this.plugins.map(function (plugin) { return plugin.unique_identifier; });
                        if (list.includes(current_id))
                            throw Error('Duplicate id : Unable de register plugin id ' + current_id);
                        this.plugins.push(plugin);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Search plugins for a specific url
     * @param url Target url
     * @returns An array of plugins
     */
    MXScraper.prototype.searchPluginFor = function (url, exact_match) {
        if (exact_match === void 0) { exact_match = false; }
        return [];
    };
    /**
     * @param id plugin unique id
     * @returns
     */
    MXScraper.prototype.getPluginByIdentifier = function (id) {
        var res = this.plugins.filter(function (plugin) { return plugin.unique_identifier == id; });
        if (res.length == 0)
            return null;
        return res[0];
    };
    /**
     * Get a list of all plugins available
     */
    MXScraper.prototype.getAllPlugins = function () {
        return this.plugins;
    };
    MXScraper.prototype.destructor = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, plugin;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = this.plugins;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        plugin = _a[_i];
                        return [4 /*yield*/, plugin.destructor()];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return MXScraper;
}());
exports.MXScraper = MXScraper;
