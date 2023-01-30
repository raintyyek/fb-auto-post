# FB Auto Post

Post or Schedule Random Posts for Facebook Page.

**Author:** [Rainty Yek](https://github.com/raintyyek)

**License:** Apache v2

# Installing fb-auto-post

```
npm install fb-auto-post
```

```js
// Using import
import AutoPost from 'fb-auto-post';

// Using require()
var AutoPost = require('fb-auto-post');
```

## Library usage

This library can be used to publish post and schedule posts to publish randomly or sequentially to FB pages

```js
AutoPost.initialize({
    app_id: "XXXXXXXXXXX", // (Required) Generate from From Your Facebook Developer App
    app_secret: "XXXXXXXXXXX", // (Required) Generate from From Your Facebook Developer App
    user_access_token: "XXXXXXXXXXX", // (Required) Generate from Facebook Developer Platform Tool, Permissions Needed: public_profile, pages_manage_posts, pages_show_list, pages_read_engagement
    fb_api_url: 'graph.facebook.com', // (Optional) Default: graph.facebook.com
    datasource_src: 'data/autopost-data.json', // (Optional) Default: data/autopost-data.json
}).then((obj) => {
    /**
     * Publish Post Function
     * Template: obj.publishPost(message, type, link, photo, callback)
     * @param {string} message Message Content for the post
     * @param {string} type Post Type (Supported: feed, photo, link)
     * @param {string} link Link to publish (Optional)
     * @param {string} photo Photo URL to publish (Optional)
     * @param {function(?Error, string)} callback A callback function
     * */
    // Post Message
    obj.publishPost('Hi everyone!', 'feed');
    // Post Link
    obj.publishPost('Here\'s my github profile!', 'link', 'https://github.com/raintyyek');
    // Post Photo
    obj.publishPost('This is my github profile picture!', 'photo', null, 'https://avatars.githubusercontent.com/u/93080136?v=4');


    /**
     * Schedule Random Posts
     * Template: obj.randomPosts(json_path, random, loop_times, schedule, timezone)
     * @param {string} json_path File path of JSON Random Posts
     * @param {boolean} random (Optional) (Default: false) Set to True to enable Randomly publish post, else it will publish by ordering in array
     * @param {integer} loop_times (Optional) (Default: 0) Number of times to loop the array, Set to 0 for infinite
     * @param {string} schedule Cron Job Schedule (Optional) (Default: '0 0 * * * *') - Follows format of node-cron (https://www.npmjs.com/package/node-cron)
     * @param {string} timezone Cron Job Timezone (Optional) (Default: Asia/Kuala_Lumpur) - Follows format of node-cron (https://www.npmjs.com/package/node-cron)
     * */
    obj.randomPosts('sample.json', true, 0, '* * * * *'); // Every Minute Publish 1 Post
    obj.randomPosts('sample.json', true, 0, '*/2 * * * *'); // Every 2 Minutes Publish 1 Post
    // ... 
});
```

## JSON format for .randomPosts

```json
[
    {
        "message": "Hi everyone!",
        "type": "feed"
    },
    {
        "message": "Here's my github profile!",
        "type": "link",
        "link": "https://github.com/raintyyek"
    },
    {
        "message": "This is my github profile picture!",
        "type": "photo",
        "photo": "https://avatars.githubusercontent.com/u/93080136?v=4"
    }
]
```
message - Message Content of Post
type - feed / link / photo
link - Link to publish (Required when type is link)
photo - Photo URL to publish (Required when type is photo)

Refer to src/sample.json


## License
This project is licensed under the Apache License, Version 2.0 (the "License"). For more details, see the [LICENSE](LICENSE) file.

&#xa0;

<a href="#top">Back to top</a>