var util = {};

util.each = function(obj, fn, thisArg) {
    for (var k in obj) {
        fn.call(thisArg, obj[k], k);
    }
};

module.exports = util;
