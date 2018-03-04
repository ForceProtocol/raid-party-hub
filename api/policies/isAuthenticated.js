/**
 * isAuthenticated
 *
 * @description :: Policy to check if this url has a valid token and if this token was issued for this url
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Policies
 */

module.exports = function (req, res, next) {
    let token = req.param('token') || req.param('state');   // state required for google auth

    if (!token) {
        return res.json(401, {err: 'Access restricted'});
    }

    jwToken.verify(token, function (err, token) {
        if(!token) return res.json(401, {err: 'Invalid Token 2'});
        if(_.isString(token.route))
            token.route = [token.route];
        if (err || !token.route || token.route.indexOf(req.baseUrl + req.route.path) === -1) {
            // return res.json(401, {err: 'Invalid Token 1' + req.baseUrl + req.route.path, });
        }

        var moment = require('moment');
        if(!token.ignoreExpiration && moment.unix(token.exp).isBefore(new Date()))
            return res.send(401, {err: 'Token Expired'});

        req.payload = token.data;

        next();
    }, {
        ignoreExpiration: false
    });
};
