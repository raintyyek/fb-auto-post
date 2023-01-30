const request = require('./request');
const fs = require('fs');
const path = require('path');
const QueryString = require('querystring');
const cron = require('node-cron');

/**
 * Facebook AutoPost
 * @constructor
 * @param {Object} props FB API Properties e.g {app_id: xxx, app_secret: xxx}
 */
var AutoPost = function () {};

/**
 * Performs a GET request
 * @param {string} uri URI for posting API
 * @param {Object=} params Request parameters
 * @param {function(?Error, Object)} callback Callback Function
 */
AutoPost.get = function (uri, params, callback) {
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
AutoPost.post = function (uri, data, callback) {
	return request('POST', this.props.fb_api_url, uri, data, callback);
};

/**
 * Build a complete URI
 * @param {string} uri The pathname to use
 * @param {!Object} params The parameters to use
 * @return {string}
 */
AutoPost.getURI = function (uri, params) {
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

	var search = QueryString.stringify(params);
	var relative = uri + (search ? '?' + search : '');

	return relative;
};

/**
 * Exchange Long-lived User Access Token
 * @param {function(?Error, string)} callback A callback function
 */
AutoPost.getUserLongLivedAccessToken = function (callback) {
	var params = {
		grant_type: 'fb_exchange_token',
		fb_exchange_token: this.props.user_access_token,
	};

	this.get('/oauth/access_token', params, function (err, data) {
        callback(err, err ? null : data.access_token);
	});
};

/**
 * Requests for pages managed by the user
 * @param {string} access_token App/User Access Token
 * @param {function(?Error, string)} callback A callback function
 */
AutoPost.getPages = function (access_token, callback) {
	var params = {
		access_token: access_token
	};

	this.get(`/me/accounts`, params, function (err, data) {
        callback(err, err ? null : data.data);
	});
};

/**
 * Initialize Autopost Functions
 */
AutoPost.initialize = function (props) {
	if (!(props && props.app_id && props.app_secret)) throw new Error('Missing App ID or App Secret');
	if (!(props && props.user_access_token)) throw new Error('Missing User Access Token');

    this.props = props;
    if (!this.props.fb_api_url) this.props.fb_api_url = 'graph.facebook.com';
    if (!this.props.datasource_src) this.props.datasource_src = 'data/autopost-data.json';
    this.datasource = {};

    var datasource_p = path.join('./', this.props.datasource_src);
    if (fs.existsSync(datasource_p)) {
        var datasource_raw = fs.readFileSync(datasource_p);
        this.datasource = JSON.parse(datasource_raw);
    } else this.ensureDirectoryExistence(datasource_p);

	var t = this;
	return new Promise(function (resolve, reject) {
		if (!t.datasource.user_access_token || !(t.datasource.pages && t.datasource.pages.length > 0)) {
			t.getUserLongLivedAccessToken(function (err, token) {
				if (err || !token) throw Error('Error occurred while generating app access token!');
				t.datasource.user_access_token = token;
				t.getPages(token, function (p_err, p) {
					if (p_err || !p) throw Error('Error occurred while generating pages data!');
					t.datasource.pages = p;
					t.saveDataSource();
					resolve(t);
				});
			});
		} else resolve(t);
	});
};

/**
 * Save App Data Source
 */
AutoPost.saveDataSource = function () {
    var datasource_p = path.join('./', this.props.datasource_src);
    fs.writeFileSync(datasource_p, JSON.stringify(this.datasource));
};

/**
 * Make Directory if not exists
 * @param {string} filePath File Path to check directory existence
 */
AutoPost.ensureDirectoryExistence = function (filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  this.ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

/**
 * Publish FB Post
 * @param {string} message Message Content for the post
 * @param {string} type Post Type (Supported: feed, photo, link)
 * @param {string} link Link to publish (Optional)
 * @param {string} photo Photo URL to publish (Optional)
 * @param {function(?Error, string)} callback A callback function
 */
AutoPost.publishPost = function (message, type = 'feed', link = null, photo = null, callback = function (err, r) {}) {
	var params = {
		message: message,
	};

	var api_uri = '';

	switch (type) {
		case 'feed':case 'link':
			api_uri += 'feed';
			if (link) params.link = link;
			else if (type == 'link') throw Error('Link is missing for Post with Link Type!');		
			break;
		case 'photo':
			api_uri += 'photos';
			if (photo) params.url = photo;
			else throw Error('Photo is missing for Post with Photo Type!');		
	}

	var t = this;
	t.datasource.pages.forEach(function (p, i) {
		t.post(`/${p.id}/${api_uri}`, {access_token: p.access_token, ...params}, function (err, data) {
			if (err) throw Error(`Error occurred while publishing post, uri: /${p.id}/${api_uri}, params: ${JSON.stringify(params)}, err: ${JSON.stringify(err)}`);
			if (data && data.id) console.log(`Post #${data.id} published.`);
			callback(err, data);
		});
	});
};

/**
 * Random Posts
 * @param {string} json_path File path of JSON Random Posts
 * @param {boolean} random (Optional) (Default: false) Set to True to enable Randomly publish post, else it will publish by ordering in array
 * @param {integer} loop_times (Optional) (Default: 0) Number of times to loop the array, Set to 0 for infinite
 * @param {string} schedule Cron Job Schedule (Optional) (Default: '0 0 * * * *') - Follows format of node-cron (https://www.npmjs.com/package/node-cron)
 * @param {string} timezone Cron Job Timezone (Optional) (Default: Asia/Kuala_Lumpur) - Follows format of node-cron (https://www.npmjs.com/package/node-cron)
 */
AutoPost.randomPosts = function (json_path, random = false, loop_times = 0, schedule = '0 0 * * * *', timezone = 'Asia/Kuala_Lumpur') {
	var t = this;
	var rp_cron = cron.schedule(schedule, () => {
		try {
			var json_data = null;
			var json_data_r_p = path.join('./', `data/${json_path.replace(/\s|\/|\./g, '_')}_scheduled.json`);
			var json_full_path = path.join('./', json_path);
			const saveJsonData = function (new_json_data) {
				fs.writeFileSync(json_data_r_p, new_json_data);
			}
			if (!fs.existsSync(json_data_r_p)) {
				if (fs.existsSync(json_full_path)) {
					var json_data_raw = fs.readFileSync(json_full_path);
					var temp_json_data = JSON.parse(json_data_raw);
					t.ensureDirectoryExistence(json_data_r_p);
					json_data = {
						looped_times: 0,
						data: temp_json_data,
						random: random,
						json_path: json_path,
						loop_times: loop_times,
						schedule: schedule,
						timezone: timezone
					};
					saveJsonData(JSON.stringify(json_data));
					t.saveDataSource();
				} else throw Error(`JSON File not found (${json_full_path})`);
			} else {
				var json_data_raw = fs.readFileSync(json_data_r_p);
				json_data = JSON.parse(json_data_raw);
			}
	
			if (!json_data || !json_data.data || !Array.isArray(json_data.data) || json_data.data.length < 1) throw Error(`Invalid JSON data given (${json_full_path})`);
	
			var looped_times = json_data.looped_times ?? 0;
			json_data.data.map(function (item, index) {item.order = index; return item;});
			var pending_posts = json_data.data.filter(function (item) {return !item.posted});
			if ((looped_times <= loop_times || loop_times == 0) && pending_posts.length < 1) {
				json_data.data.map(function (item) {item.posted = false; return item;});
				pending_posts = json_data.data;
			}
	
			if (pending_posts.length > 0) {
				var current_post_index = random ? Math.floor((Math.random() * (pending_posts.length - 1)) + 0) : 0;
				if (pending_posts[current_post_index]) {
					var curr_p = pending_posts[current_post_index];
					t.publishPost(curr_p.message, curr_p.type ?? 'feed', curr_p.link ?? null, curr_p.photo ?? null, function (err, r) {
						if (err) console.error(`Index (${current_post_index}) failed to post (${json_full_path}).`);
						else if (!err && r && r.id) {
							console.log(`Index (${current_post_index}) posted on POST #${r.id} (${json_full_path}).`);
							if (json_data.data[curr_p.order]) json_data.data[curr_p.order].posted = true;
							if (json_data.data.filter(function (item) {return !item.posted}).length < 1)
								if (++looped_times >= loop_times && loop_times != 0) (console.log(`Cronjob stopped - looped times: ${looped_times} (${json_full_path}).`)),(rp_cron.stop());
						}
						json_data.looped_times = looped_times;
						saveJsonData(JSON.stringify(json_data));
					});
				} else console.error(`Index (${current_post_index}) not found for Pending Posts (${json_full_path}).`);
			} else console.warn(`No pending posts available but the schedule is still running (${json_full_path}).`);
		} catch (e) {
			console.error(e);
		}
	}, {
	  timezone: timezone
	});
};

module.exports = AutoPost;