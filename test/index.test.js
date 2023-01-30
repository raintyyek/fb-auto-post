const AutoPost = require('../src/index');
const expect = require('chai').expect;

describe('Testing the AutoPost Functions', function () {
    it('1. Initialize - throws error when passing nothing', function (done) {
        expect(function () {
            AutoPost.initialize();
        }).to.throw(Error);
        done();
    });
    it('2. Initialize - throws error when passing empty object', function(done) {
        expect(function () {
            AutoPost.initialize({});
        }).to.throw(Error);
        done();
    });
    it('3. Initialize - throws error when passing app id and app secret only', function (done) {
        expect(function () {
            AutoPost.initialize({
                app_id: 'TEST',
                app_secret: 'TEST',
            });
        }).to.throw(Error);
        done();
    });
});