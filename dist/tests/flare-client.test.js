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
var FlareSolverrClient_1 = require("../utils/FlareSolverrClient");
var local_proxy = 'http://localhost:8191/v1';
test('Create/Destroy FlareSolverr browser session', function () { return __awaiter(void 0, void 0, void 0, function () {
    var solver, session_id;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                solver = new FlareSolverrClient_1.FlareSolverrClient(local_proxy);
                return [4 /*yield*/, solver.createSession()];
            case 1:
                session_id = _a.sent();
                console.info('Session id ', session_id, ' created !');
                return [4 /*yield*/, solver.destroySession(session_id)];
            case 2:
                _a.sent();
                console.info('Session id ', session_id, ' destroyed !');
                expect(session_id).toBeDefined();
                return [2 /*return*/];
        }
    });
}); });
test('Throw an error when destroying non existing session', function () { return __awaiter(void 0, void 0, void 0, function () {
    var solver, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                solver = new FlareSolverrClient_1.FlareSolverrClient(local_proxy);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, solver.destroySession('fake id')];
            case 2:
                _a.sent();
                throw Error('Should not reach this line');
            case 3:
                err_1 = _a.sent();
                expect(err_1).toBeDefined();
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
test('Create/Destroy and list 2 FlareSolverr browser sessions', function () { return __awaiter(void 0, void 0, void 0, function () {
    var solver, sessions, _a, _b, _c, _d, list, result, _i, sessions_1, id, err_2;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                solver = new FlareSolverrClient_1.FlareSolverrClient(local_proxy);
                sessions = [];
                // create
                _b = (_a = sessions).push;
                return [4 /*yield*/, solver.createSession()];
            case 1:
                // create
                _b.apply(_a, [_e.sent()]);
                _d = (_c = sessions).push;
                return [4 /*yield*/, solver.createSession()];
            case 2:
                _d.apply(_c, [_e.sent()]);
                expect(sessions).toHaveLength(2);
                console.info(sessions.length, ' sessions created !');
                return [4 /*yield*/, solver.getSessions()];
            case 3:
                list = _e.sent();
                result = list.filter(function (id) { return sessions.includes(id); });
                expect(result).toHaveLength(sessions.length);
                console.info(result.length, ' found !', result.join(' and '));
                _e.label = 4;
            case 4:
                _e.trys.push([4, 9, , 10]);
                _i = 0, sessions_1 = sessions;
                _e.label = 5;
            case 5:
                if (!(_i < sessions_1.length)) return [3 /*break*/, 8];
                id = sessions_1[_i];
                return [4 /*yield*/, solver.destroySession(id)];
            case 6:
                _e.sent();
                _e.label = 7;
            case 7:
                _i++;
                return [3 /*break*/, 5];
            case 8:
                console.info(sessions.length, ' sessions destroyed !');
                return [3 /*break*/, 10];
            case 9:
                err_2 = _e.sent();
                expect(err_2).toBeUndefined();
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
