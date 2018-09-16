/**
 * Player.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const bcrypt = require('bcrypt-nodejs'),
	uuidv4 = require('uuid/v4');

module.exports = {

	attributes: {

		advertiserId: {
			type: 'string',
			unique: true,
			size: 40,
			defaultsTo: function () {
				return uuidv4();
			}
		},

		companyName: {
			type: 'string',
			defaultsTo: ''
		},

		firstName: {
			type: 'string',
			defaultsTo: ''
		},

		lastName: {
			type: 'string',
			defaultsTo: ''
		},

		telephone: {
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

		availableBudget: {
			type: 'float',
			defaultsTo: 0
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

		gameAdAsset: {
			collection: 'gameadasset',
			via: 'advertiser',
		},

		
		toJSON: function () {
			let obj = this.toObject();
			delete obj.password;
			delete obj.pin;
			delete obj.pinAttempts;
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
		return _.omit(this, ['password', 'pinCreatedAt', 'createdAt', 'updatedAt'])
	}

};

