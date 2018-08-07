/**
 * Studio.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const uuidv4 = require('uuid/v4');
const bcrypt = require('bcrypt-nodejs');

module.exports = {
	attributes: {

		studioId: {
			type: 'string',
			primaryKey: true,
			unique: true,
			size: 40,
			defaultsTo: function () {
				return uuidv4();
			}
		},

		firstName: {
			type: 'string',
			defaultsTo: ''
		},

		lastName: {
			type: 'string',
			defaultsTo: ''
		},

		studioName: {
			type: 'string',
			defaultsTo: ''
		},

		password: {
			type: 'string',
			required: true
		},

		email: {
			type: 'string',
			required: true,
			unique: true
		},

		accountStatus: {
			type: 'integer',
			defaultsTo: 0
		},

		pin: {
			type: 'integer',
			defaultsTo: 0
		},

		pinAttempts: {
			type: 'integer',
			defaultsTo: 0
		},

		pinCreatedAt: {
			type: 'datetime',
			defaultsTo: function () {
				return new Date()
			}
		},

		forceBalance: {
			type: 'string',
			defaultsTo: ''

		},

		transactions: {
			collection: 'studiotransactions',
			via: 'studio'
		},

		games: {
			collection: 'game',
			via: 'studio'
		},

		toJSON: function () {
			let obj = this.toObject();
			delete obj.id;
			delete obj.password;
			delete obj.pin;
			delete obj.pinAttempts;
			delete obj.activatePin;
			delete obj.pinCreatedAt;
			return obj;
		},

	},


	validatePassword: function (attemptedPassword, realPassword) {
		return new Promise((resolve, reject) => {
			bcrypt.compare(attemptedPassword, realPassword, (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		});
	},


	beforeCreate: function (user, cb) {
		bcrypt.genSalt(10, function (err, salt) {
			bcrypt.hash(user.password, salt, function () {
			}, function (err, hash) {
				user.password = hash;
				cb(null, user);
			});
		});
	},

	beforeUpdate: function (user, cb) {
		if ('password' in user) {
			bcrypt.genSalt(10, function (err, salt) {
				bcrypt.hash(user.password, salt, function () {
				}, function (err, hash) {
					user.password = hash;
					cb(null, user);
				});
			});
		} else cb(null, user);
	},

	customToJSON: function () {
		return _.omit(this, ['password', 'activatePin', 'pinCreatedAt', 'createdAt', 'updatedAt'])
	}
};

