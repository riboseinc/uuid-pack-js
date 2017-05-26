'use strict'
// Connect the module with functions
require(["uuids"], function() {

	// Set valid characters (last one will be delimiter with delta compression)
	// this equal Base64 with delimiter '_'
	var alpStrBase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-_';
	
	// this equal binary
	var alpStrBin = ''; 
	for (var code = 0; code < 256; code++) {
		alpStrBin += String.fromCharCode(code); 
	}

	// this demonstrate a possibility of a very small number of valid characters (but you can't use less than two characters)
	var alpStrBit = '01'; 
	
	var alpStr = alpStrBase;
	document.write('Valid characters: ' + alpStr + '<br \/>');
	// Set input array
	var uUIDArray = [
		'3e514775-bfdb-44f9-92b2-c4c53a7dc89d',
		'22347af1-7c60-48e0-8cc5-a30746812267',
		'ea8bed36-a73d-4fff-af36-32162274dfd1'];

	document.write('Input array: ' + uUIDArray.join(',') + '<br \/>');
	document.write('Input length (without quotes and spaces) is: ' + uUIDArray.join(',').length + '<br \/>');
	
	// make a copy to check after decompression
	var uUIDCopy = uUIDArray.slice();

	// Set order (true if we need to keep order)
	var order = false;

	// Make compress
	var compressArr = alpCompress(uUIDArray, alpStr, order);
	document.write('Output: ' + compressArr + '<br \/>');
	document.write('Output length is: ' + compressArr.length + '<br \/>');
	document.write('Efficiency of compression is: ' + 
		((1.0 - compressArr.length / uUIDCopy.join(',').length) * 100).toFixed(2) + '% length decrease' + '<br \/>');

	// Check did delta used or not
	var alpArr = alptoArr(alpStr, false);
	var delta = (rassoc(alpArr, compressArr.charAt(0)) & (1 << (tassoc(alpArr, compressArr.charAt(0)) - 1))) != 0;
	document.write('Delta used: ' + delta + '<br \/>');
	
	// Make decompress
	var nEWuUIDArray = alpDecompress(compressArr, alpStr);
	document.write('Decompressed array:' + nEWuUIDArray.join(',') + '<br \/>');

	// Decompression check
	if (delta) uUIDCopy.sort();
	var equalCheck = false;
	if (uUIDCopy.length == nEWuUIDArray.length) {
		for (var i = 0; i < uUIDCopy.length; i++) {
			if (uUIDCopy[i] != nEWuUIDArray[i]) break;
		}
		// we checked the identity of all elements, so the arrays are equal
		if (i == uUIDCopy.length) equalCheck = true;
	}
	if (equalCheck) {
		document.write('Decompression is successful');
	} else {
		document.write('Decompression error!!!');
	}	
});