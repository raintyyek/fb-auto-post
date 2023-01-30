const HTTPS = require('https');
const QueryString = require('querystring');
/**
 * Performs an HTTP request to Facebook API with proper parameters
 * @param {string} method HTTP Method (POST, GET, etc)
 * @param {string} url Facebook API URL
 * @param {string} uri URI for posting API
 * @param {Object=} params Request parameters
 * @param {Object} data Request Body
 * @param {function(?Error, Object)} callback Callback Function
 */
module.exports = function (method, url, uri, data, callback) {
	var req = HTTPS.request({
		'method': method,
		'host': url,
		'port': 443,
		'path': uri
	}, function (res) {
		var data = '';
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			data += chunk;
		});
		res.on('end', function () {
			var result;
			try {
				result = JSON.parse(data);
			} catch (err) {
				return callback(res.statusCode !== 200, data || null);
			}

			if (result['error'] || result['error_code']) {
				callback(result, null);
			} else {
				callback(null, result);
			}
		});
	});
	req.on('error', function (err) {
		callback(err);
	});
	if (data) {
		req.write(QueryString.stringify(data));
	}
	req.end();
};