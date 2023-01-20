const request = require('./request');
const fs = require('fs');
const path = require('path');
const QueryString = require('querystring');

/**
 * Facebook AutoPost
 * @constructor
 * @param {Object} props FB API Properties e.g {app_id: xxx, app_secret: xxx}
 */
var AutoPost = function (props) {
	if (!(props && props.app_id && props.app_secret)) throw new Error('Missing App ID or App Secret');

    this.props = props;
    if (!this.props.fb_api_url) this.props.fb_api_url = 'graph.facebook.com';
    if (!this.props.datasource_src) this.props.datasource_src = 'data/autopost-data.json';
    this.datasource = {};
    this.init();
};

/**
 * Performs a GET request
 * @param {string} uri URI for posting API
 * @param {Object=} params Request parameters
 * @param {function(?Error, Object)} callback Callback Function
 */
AutoPost.prototype.get = function (uri, params, callback) {
	if (arguments.length === 2) {
		callback = arguments[1];
		params = null;
	}
	params = params || {};
    uri = this.getURI(uri, params);
	return request('GET', this.props.fb_api_url, uri, null, callback);
};

/**
 * Performs a POST request
 * @param {string} uri URI for posting API
 * @param {Object} data Request Body
 * @param {function(?Error, Object)} callback Callback Function
 */
AutoPost.prototype.post = function (uri, data, callback) {
	return request('POST', this.props.fb_api_url, uri, data, callback);
};

/**
 * Build a complete URI
 * @param {string} uri The pathname to use
 * @param {!Object} params The parameters to use
 * @return {string}
 */
AutoPost.prototype.getURI = function (uri, params) {
	uri = (uri[0] !== '/') ? '/' + uri : uri;

	if (!/^\/dialog\//.test(uri)) {
		params.format = params.format || 'json';
	}
	params.locale = params.locale || 'en_US';

	if (!params.client_id) {
		if (/\/oauth(\/|$)/.test(uri)) {
			params.client_id = this.props.app_id;
		} else if (/^\/dialog\//.test(uri)) {
			params.app_id = this.props.app_id;
		}
	}
	if (!params.client_secret && uri === '/oauth/access_token') {
		params.client_secret = this.props.app_secret;
	}
	if (!params.access_token && this.datasource.access_token) {
		params.access_token = this.datasource.access_token;
	}

	var search = QueryString.stringify(params);
	var relative = uri + (search ? '?' + search : '');

	return relative;
};

/**
 * Requests an application temporary access token to use when managing the application
 * @param {function(?Error, string)} callback A callback function
 */
AutoPost.prototype.getAppAccessToken = function (callback) {
	var params = {
		'grant_type': 'client_credentials'
	};

	this.get('/oauth/access_token', params, function (err, data) {
        callback(err, err ? null : data.access_token);
	});
};

/**
 * Requests a long-lived application access token to use when managing the application
 * @param {function(?Error, string)} callback A callback function
 */
// AutoPost.prototype.getAppAccessToken = function (callback) {
// 	var params = {
// 		'grant_type': 'client_credentials',
//         'fb_exchange_token': this.props.temp_access_token
// 	};

// 	this.get('/oauth/access_token', params, function (err, data) {
//         callback(err, err ? null : data.access_token);
// 	});
// };


/**
 * Initialize Autopost Functions
 */
AutoPost.prototype.init = function () {
    var datasource_p = path.join(__dirname, this.props.datasource_src);
    if (fs.existsSync(datasource_p)) {
        var datasource_raw = fs.readFileSync(datasource_p);
        this.datasource = JSON.parse(datasource_raw);
        console.log('Retrive');
        console.log(this.datasource);
    } else this.ensureDirectoryExistence(datasource_p);

    if (!this.datasource.access_token) {
        var t = this;
        this.getAppAccessToken(function (err, token) {
            if (err || !token) throw Error('Error occurred while generating app access token!');
            t.datasource.access_token = token;
            t.saveDataSource();
        });
    }
};

/**
 * Save App Data Source
 */
AutoPost.prototype.saveDataSource = function () {
    var datasource_p = path.join(__dirname, this.props.datasource_src);
    fs.writeFileSync(datasource_p, JSON.stringify(this.datasource));
};

AutoPost.prototype.ensureDirectoryExistence = function (filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  this.ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

module.exports = AutoPost;