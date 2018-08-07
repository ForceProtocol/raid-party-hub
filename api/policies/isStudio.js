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
        if(!token){
			return res.json(401, {err: 'Invalid Token'});
		}
		
        if(_.isString(token.route)){
            token.route = [token.route];
		}
		
        if(err || !token.route || token.route.indexOf(req.baseUrl + req.route.path) === -1){
            // return res.json(401, {err: 'Invalid Token 1' + req.baseUrl + req.route.path, });
        }

        var moment = require('moment');
		
        if(!token.ignoreExpiration && moment.unix(token.exp).isBefore(new Date())){
            return res.send(401, {err: 'Token Expired'});
		}
		
		// Make sure is a valid and active developer

		Studio.findOne({studioId:token.user.id}).exec(function(err,studio){
			
			// Could not find that account
			if(!studio){
				return res.send(401, {err: 'Could not find an account with those details. Please check your details and try again.'});
			}
			
			// Developer is locked
			if(studio.accountStatus == 0){
				return res.send(401, {err: 'Your account has been blocked.'});
			}
			
			// Player is not active
			if(studio.accountStatus == 1){
				return res.send(401, {err: 'Your account has not been activated yet. Please check your email'});
			}
			
			req.user = studio;
			req.payload = token.data;

			next();
			
		});
		
    }, {
        ignoreExpiration: false
    });
};
