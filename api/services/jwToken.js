/**
 * jwToken
 *
 * @description :: JSON Webtoken Service for sails
 * @help        :: See https://github.com/auth0/node-jsonwebtoken & http://sailsjs.org/#!/documentation/concepts/Services
 */

var jwt = require('jsonwebtoken'),
    secret = 'iR3o544eg4h4u7S7G9d';

// Generates a token from supplied payload
module.exports.issue = function (payload, expiresIn) {
    if(!expiresIn)
        expiresIn = 10800; // in seconds
    return jwt.sign(
        payload,
        secret, // Token Secret that we sign it with
        {
            expiresIn: expiresIn // Token Expire time
        }
    );
};

// Verifies token on a request
/**
 *
 * @param {string} token
 * @param {function} callback
 * @param {object} [options] - for more see https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback
 */
module.exports.verify = function (token, callback, options) {
    return jwt.verify(
        token, // The token to be verified
        secret, // Same token we used to sign
        options && _.isObject(options) ? options : {},
        callback //Pass errors or decoded token to callback
    );
};
