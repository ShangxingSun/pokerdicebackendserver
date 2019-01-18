const Long = require('long')
const charmap = '.12345abcdefghijklmnopqrstuvwxyz';
charidx = (ch)=> {
	  var idx = charmap.indexOf(ch);
	  if (idx === -1) throw new TypeError('Invalid character: \'' + ch + '\'');
	  return idx;
};
exports.CommonDefine = {
	encodeName : function(name){
		var littleEndian = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

		if (typeof name !== 'string') throw new TypeError('name parameter is a required string');

		if (name.length > 12) throw new TypeError('A name can be up to 12 characters long');

		var bitstr = '';
		for (var i = 0; i <= 12; i++) {
			// process all 64 bits (even if name is short)
			var c = i < name.length ? charidx(name[i]) : 0;
			var bitlen = i < 12 ? 5 : 4;
			var bits = Number(c).toString(2);
			if (bits.length > bitlen) {
				throw new TypeError('Invalid name ' + name);
			}
			bits = '0'.repeat(bitlen - bits.length) + bits;
			bitstr += bits;
		}

		var value = Long.fromString(bitstr, true, 2);

		// convert to LITTLE_ENDIAN
		var leHex = '';
		var bytes = littleEndian ? value.toBytesLE() : value.toBytesBE();
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = bytes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var b = _step.value;

				var n = Number(b).toString(16);
				leHex += (n.length === 1 ? '0' : '') + n;
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}
		var ulName = Long.fromString(leHex, true, 16).toString();

		// console.log('encodeName', name, value.toString(), ulName.toString(), JSON.stringify(bitstr.split(/(.....)/).slice(1)))

		return ulName.toString();
	},
};
