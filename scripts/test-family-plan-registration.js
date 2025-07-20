"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var pricing_1 = require("../lib/pricing");
var email_1 = require("../lib/email");
var prisma = new client_1.PrismaClient();
function testFamilyPlanRegistration() {
    return __awaiter(this, void 0, void 0, function () {
        var user1, user2, startDate, endDate, planType, planPrice, halfPrice, commonData, sub1, sub2, adminNotificationResult, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Running Family Plan Registration Test...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, 8, 10]);
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'test-family1@example.com' },
                            update: {},
                            create: {
                                firstName: 'Test',
                                lastName: 'User1',
                                email: 'test-family1@example.com',
                                phone: '9876543210',
                                source: 'Test',
                            }
                        })];
                case 2:
                    user1 = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'test-family2@example.com' },
                            update: {},
                            create: {
                                firstName: 'Test',
                                lastName: 'User2',
                                email: 'test-family2@example.com',
                                phone: '9876543211',
                                source: 'Family Plan',
                            }
                        })];
                case 3:
                    user2 = _a.sent();
                    console.log('✅ Test users created');
                    startDate = new Date();
                    endDate = new Date();
                    endDate.setDate(endDate.getDate() + 30);
                    planType = 'monthlyFamily';
                    planPrice = pricing_1.PLAN_PRICING.monthlyFamily.amount;
                    halfPrice = Math.round(planPrice / 2);
                    commonData = {
                        planType: planType,
                        startDate: startDate,
                        endDate: endDate,
                        orderId: 'test_order_' + Date.now(),
                        paymentRef: 'test_payment_' + Date.now(),
                        paymentStatus: 'completed',
                        status: 'active',
                        duration: 30,
                        price: halfPrice,
                    };
                    return [4 /*yield*/, prisma.subscription.create({
                            data: __assign(__assign({}, commonData), { userId: user1.id })
                        })];
                case 4:
                    sub1 = _a.sent();
                    return [4 /*yield*/, prisma.subscription.create({
                            data: __assign(__assign({}, commonData), { userId: user2.id })
                        })];
                case 5:
                    sub2 = _a.sent();
                    console.log('✅ Test subscriptions created');
                    console.log("Subscription 1 ID: ".concat(sub1.id));
                    console.log("Subscription 2 ID: ".concat(sub2.id));
                    return [4 /*yield*/, (0, email_1.sendFamilyAdminNotificationEmail)({
                            users: [
                                {
                                    id: user1.id,
                                    firstName: user1.firstName,
                                    lastName: user1.lastName,
                                    email: user1.email,
                                    phone: user1.phone,
                                    source: user1.source,
                                    subscriptionId: sub1.id,
                                },
                                {
                                    id: user2.id,
                                    firstName: user2.firstName,
                                    lastName: user2.lastName,
                                    email: user2.email,
                                    phone: user2.phone,
                                    source: user2.source,
                                    subscriptionId: sub2.id,
                                }
                            ],
                            planType: planType,
                            startDate: startDate,
                            endDate: endDate,
                            amount: planPrice,
                            paymentId: commonData.paymentRef,
                        })];
                case 6:
                    adminNotificationResult = _a.sent();
                    console.log("\u2705 Admin notification email ".concat(adminNotificationResult ? 'sent' : 'failed'));
                    // 4. Test welcome emails
                    // Note: In production, we'd typically not send test emails to real users
                    console.log('Welcome emails would be sent to both users');
                    // 5. Clean up test data (uncomment to actually delete)
                    /*
                    await prisma.subscription.deleteMany({
                      where: {
                        id: {
                          in: [sub1.id, sub2.id]
                        }
                      }
                    });
                    
                    await prisma.user.deleteMany({
                      where: {
                        email: {
                          in: ['test-family1@example.com', 'test-family2@example.com']
                        }
                      }
                    });
                    
                    console.log('✅ Test data cleaned up');
                    */
                    console.log('✅ Family plan registration test completed successfully');
                    return [3 /*break*/, 10];
                case 7:
                    error_1 = _a.sent();
                    console.error('❌ Test failed:', error_1);
                    return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, prisma.$disconnect()];
                case 9:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    });
}
testFamilyPlanRegistration();
