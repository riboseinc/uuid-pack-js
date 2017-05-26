'use strict'
// a constant = length of each of the archived strings, for UUID is 32, in other cases it can vary
var UNIT_LEN = 32;

// calculate bits in number
function binPow(num) {
	var pow = 0;
	while (num >> pow != 0) pow++;
	return pow;
}
// calculate bits in the string that is hexadecimal number
function strPow(str) {
	return binPow(parseInt(str, 16));
}

// instead Ruby string reverse
function revString(str) {
    var splitString = str.split(""); 
    var reverseArray = splitString.reverse();
    var joinArray = reverseArray.join(""); 
    return joinArray;
}

// instead Ruby assoc
function assoc(arr, value) {
    for (var i = 0; i < arr.length; i++)
        if (arr[i][0] == value) return arr[i][1];
}

// instead Ruby rassoc
function rassoc(arr, value) {
    for (var i = 0; i < arr.length; i++)
        if (arr[i][1] == value) return arr[i][0];
}
function tassoc(arr, value) {
    for (var i = 0; i < arr.length; i++)
        if (arr[i][1] == value) return arr[i][2];
}

// 3 functions instead Ruby actions with big integer (128 bits)
// addition
function addHexStr(fnum, snum) {
	var delta = 0
	var result = ''
	for (var i = fnum.length - 1; i >= 0; i--) {
		var sum = parseInt(fnum.charAt(i), 16) + parseInt(snum.charAt(i), 16) + delta;
		delta = 0;
		if (sum > 15) {
			delta = 1;
			sum -= 16;
		}
		result = (sum).toString(16) + result;
	}
	return result;
}
// subtraction
function subHexStr(fnum, snum) {
	var delta = 0
	var result = ''
	for (var i = fnum.length - 1; i >= 0; i--) {
		var sum = parseInt(fnum.charAt(i), 16) - parseInt(snum.charAt(i), 16) - delta;
		delta = 0;
		if (sum < 0) {
			delta = 1;
			sum += 16;
		}
		result = (sum).toString(16) + result;
	}
	return result;
}
// removing the leading zeros
function cutHexStr(str) {
	for (var i = 0; i < str.length; i++) {
		if (str.charAt(i) != '0') break;
	}
	return str.substr(i, str.length - i);
}

//transform string of valid characters to useful array (del = true if we need delimiter)
function alptoArr(alpStr, del) {
	var alpArr = [];
	var el = alpStr.length;
	// max number of bits coding by one character (some characters will be one bit less)
	var pow = binPow (el - 1);
	// how many characters will be one bit less
	var lowhi = (1 << pow) - el;
	// if delimited we can't use last characters
	if (del) {
		el--;
		pow = binPow (el - 1);
		lowhi = (1 << pow) - el;
		if (lowhi == 0) lowhi--;
		// first element include main data about alphabet and delimiter character
		alpArr[alpArr.length] = [lowhi, alpStr.charAt(el), pow];
		if (lowhi == -1) lowhi++;
	} else {
		// first element include main data about alphabet
		if (lowhi == 0) lowhi--;
		alpArr[alpArr.length] = [lowhi, '', pow];
		if (lowhi == -1) lowhi++;
	}
	// loop by characters and get code and bit number for each one
	for (var charItem = 0; charItem < el; charItem++) {
		if (charItem < lowhi) {
			alpArr[alpArr.length] = [charItem, alpStr.charAt(charItem), pow - 1];
		} else {
			alpArr[alpArr.length] = [lowhi + charItem, alpStr.charAt(charItem), pow];
		}
	}
	return alpArr;
}

// compress UUIDs array
function alpCompress(arr, alpStr, order) {
	
	// compress without delta
	var nresult = '';
	// get alphabet array without delimiter
	var alpArr = alptoArr(alpStr, false);
	var pow = alpArr[0][2];
	var lowhi = alpArr[0][0];
	// first bit equal 0 means we compress without delta
	var achr = 0;
	var rest = 1;
	// loop by UUIDs
	for (var i = 0; i < arr.length; i++) {
		// remove '-' characters from UUID
		var item = arr[i].replace(new RegExp('-','g'), '');
		// loops by UUID characters
		for (var j = item.length -1; j >= 0; j--) {
			// get base binary code (BBC)
			var curr = parseInt(item.charAt(j), 16);
			achr += (curr << rest);
			// get number of bits in BBC
			rest += 4;
			// create symbols to compressed string 
			while (rest >= pow) {
				// try with a short symbol length
				var powC = pow -1;
				var code = parseInt(revString(((achr & ((1 << powC) - 1)) + (1 << powC)).toString(2)), 2) >> 1;
				// if we get code of long length symbols
				if (code >= lowhi) powC++;
				// decrease number of bits in BBC
				rest -= powC;
				// get reverse bits from the end of BBC to create new symbol
				code = parseInt(revString(((achr & ((1 << powC) - 1)) + (1 << powC)).toString(2)), 2) >> 1;
				// add new symbol
				nresult += assoc(alpArr, code);
				// remove used bits from BBC
				achr >>= powC; 
			}
		}
	}
	// check if we have tail of BBC
	if (rest > 0) {
		// get reverse bits of BBC to create new symbol
		code = parseInt(revString(((achr & ((1 << rest) - 1)) + (1 << rest)).toString(2)), 2) >> 1;
		// add zeros to get valid symbol code
		code <<= (pow - rest - 1);
		// if we get code of long length symbols
		if (code >= lowhi) code <<= 1;
		// add tail symbol
		nresult += assoc(alpArr, code);
	}
	
	// compress with delta
	arr.sort();
	// first character is delimiter means we compress with delta : note that delimiter (last character in alphabet) always has code of all ones
	var dresult = alpArr[alpArr.length - 1][1];
	// get alphabet array with delimiter
	alpArr = alptoArr(alpStr, true);
	pow = alpArr[0][2];
	// we can't operate single symbol alphabet and not need to calculate delta if we keep order 
	if ((pow > 1) && (!order)) {
		lowhi = alpArr[0][0];
		// previous value at start is zero
		var prev = ('0').repeat(UNIT_LEN);
		// loop by UUIDs
		for (i = 0; i < arr.length; i++) {
			achr = 0;
			rest = 0;
			// remove '-' characters from UUID
			var next = arr[i].replace(new RegExp('-','g'), '');
			// calculate delta
			item = subHexStr(next, prev);
			prev = next;
			// we use delimiter only if delta is less than UUID length minus one char
			if ((cutHexStr(item).length - 1) * 4 + strPow(cutHexStr(item).charAt(0)) < UNIT_LEN * 4 - pow) item = cutHexStr(item);
			// loop by delta characters
			for (var j = item.length -1; j >= 0; j--) {
				// get BBC
				curr = parseInt(item.charAt(j), 16);
				achr += (curr << rest);
				// get number of bits in BBC (for the first character without leading zeros)
				if (j == 0 && item.length < UNIT_LEN) {
					rest += strPow(item.charAt(0));
				} else {
					rest += 4;
				}
				// create symbols to compressed string 
				while (rest >= pow) {
					// try with a short symbol length
					powC = pow -1;
					code = parseInt(revString(((achr & ((1 << powC) - 1)) + (1 << powC)).toString(2)), 2) >> 1;
					// if we get code of long length symbols
					if (code >= lowhi) powC++;
					// decrease number of bits in BBC
					rest -= powC;
					// get reverse bits from the end of BBC to create new symbol
					code = parseInt(revString(((achr & ((1 << powC) - 1)) + (1 << powC)).toString(2)), 2) >> 1;
					// add new symbol
					dresult += assoc(alpArr, code);
					// remove used bits from BBC
					achr >>= powC; 
				}
			}
			// check if we have tail of BBC for current UUID
			if (rest > 0) {
				// try with a short symbol length
				code = parseInt(revString(((achr & ((1 << rest) - 1)) + (1 << rest)).toString(2)), 2) >> 1;
				// add zeros to get valid symbol code
				code <<= (pow - rest - 1);
				// if we get code of long length symbols
				if (code >= lowhi) code <<= 1;
				// add tail symbol for current UUID
				dresult += assoc(alpArr, code);
			}
			// add delimiter if we use less symbols than for whole UUID
			if (item.length < UNIT_LEN) dresult += alpArr[0][1];
		}
	} else {
		//	for single symbol alphabet we can choose only nresult
		order = true;
	}	
	var result = nresult;
	// get better result or non delta if we need to keep order
	if ((dresult.length < nresult.length) && (!order)) {result = dresult}
	return result;
}

// decompress UUIDs array
function alpDecompress(str, alpStr) {
	var result = [];
	// get alphabet array without delimiter
	var alpArr = alptoArr(alpStr, false);
	// check first bit to choose if delta used when compress
	if ((rassoc(alpArr, str.charAt(0)) & (1 << (tassoc(alpArr, str.charAt(0)) - 1))) == 0) {

	// delta not used
		var pow = alpArr[0][2];
		var lowhi = alpArr[0][0];
		var achr = 0;
		var rest = 0;
		var item = '';
		// for the first bit removing
		var firstBit = true;
		// loop by symbols of compressed string
		for (i = 0; i < str.length; i++) {
			// reverse symbol code to BBC bits
			var code = parseInt(revString((rassoc(alpArr, str.charAt(i)) + (1 << tassoc(alpArr, str.charAt(i)))).toString(2)), 2) >> 1;
			// add bits to BBC
			achr += code << rest;
			// get number of bits in BBC
			rest += tassoc(alpArr, str.charAt(i));
			// first bit processing
			if (firstBit) {
				firstBit = false;
				achr >>= 1;
				rest--;
			}
			// add new UUID caracters to buffer
			while (rest >= 4) {
				// decrease number of bits in BBC
				rest -= 4;
				// add new UUID character
				item = (achr & 15).toString(16) + item;
				// remove used bits from BBC
				achr >>= 4; 
			}					
			// if we get buffer with length equal or more than whole UUID
			if (item.length >= UNIT_LEN) {
				// extract UUID from the end of buffer
				var curr = item.substr(item.length - UNIT_LEN, UNIT_LEN);
				// add '-' characters from UUID
				if (UNIT_LEN == 32) {
					curr = curr.substr(0, 8) + '-' + curr.substr(8, 4) + '-' + curr.substr(12, 4) + '-' + curr.substr(16, 4) + '-' + curr.substr(20, 12);
				}
				// add new UUID to array
				result[result.length] = curr;
				// remove used characters from buffer
				item = item.substr(0, item.length - UNIT_LEN);
			}
		}
	} else {

	// delta used
		alpArr = alptoArr(alpStr, true);
		pow = alpArr[0][2];
		lowhi = alpArr[0][0];
		var prev = ('0').repeat(UNIT_LEN);
		item = ''
		achr = 0;
		rest = 0;
		// loop by symbols of compressed string from second (the first is header) to next after last (for final buffer processing after last)
		for (var i = 1; i <= str.length; i++) {
			// we catch delimiter or we get buffer length equal or more than whole UUID
			if ((str.charAt(i) == alpArr[0][1]) || (item.length >= UNIT_LEN)) {
				// if buffer length than we need to look at the current symbol one more time (this pass we will not process it)
				if (item.length >= UNIT_LEN) {
					i--;
					// extract delta from the end of buffer
					item = item.substr(item.length - UNIT_LEN);
				} else {
					// if delimiter we add first zero characters
					item = ('0').repeat(UNIT_LEN - item.length) + item;
				}
				// calculate UUID from delta
				curr = addHexStr(item, prev);
				prev = curr;
				// add '-' characters from UUID
				if (UNIT_LEN == 32) {
					curr = curr.substr(0, 8) + '-' + curr.substr(8, 4) + '-' + curr.substr(12, 4) + '-' + curr.substr(16, 4) + '-' + curr.substr(20, 12);
				}
				// add new UUID to array
				result[result.length] = curr;
				// clear BBC and buffer
				achr = 0;
				rest = 0;
				item = '';
			} else {
				// if we become last symbol we need no to symbol processing 
				if (i < str.length) {
					// reverse symbol code to BBC bits
					code = parseInt(revString((rassoc(alpArr, str.charAt(i)) + (1 << tassoc(alpArr, str.charAt(i)))).toString(2)), 2) >> 1;
					// add bits to BBC
					achr += code << rest;
					// get number of bits in BBC
					rest += pow;
					if (code < lowhi) rest--;
					// add new UUID caracters to buffer
					while (rest >= 4) {
						// decrease number of bits in BBC
						rest -= 4;
						// add new UUID character
						item = (achr & 15).toString(16) + item;
						// remove used bits from BBC
						achr >>= 4; 
					}					
				}
			}
		}
	}
	return result;
}
