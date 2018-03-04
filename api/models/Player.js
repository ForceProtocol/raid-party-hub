/**
 * Player.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
 
const bcrypt = require('bcrypt-nodejs');

module.exports = {

    tableName: 'players',
    attributes: {
	
		playerId: {
            type: 'string',
			unique: true,
			size: 40,
			defaultsTo: function() {
				return uuid.v4();
			}
        },
		
		firstName: {
            type: 'string'
        },
		
        lastName: {
            type: 'string'
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

        deviceId: {
			type: 'string',
			required: true,
			unique: true
		},
		
		accountStatus: {
			type: 'integer',
			defaultsTo: 0
		},
		
		activatePin: {
			type: 'integer',
			defaultsTo: 0
		},
		
		games: {
			collection: 'game',
			via: 'player',
			through: 'playertogame'
		},
		
		toJSON: function () {
			let obj = this.toObject();
			delete obj.password;
			return obj;
		},
		validatePassword: function (attemptedPassword) {
			let self = this;
			return new Promise((resolve, reject)=>{
				bcrypt.compare(attemptedPassword, self.password, (err, result)=>{
				if(err)return reject(err);
					resolve(result);
				});
			})
		},
		
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
		if('password' in user){
			bcrypt.genSalt(10, function (err, salt) {
				bcrypt.hash(user.password, salt, function () {
				}, function (err, hash) {
					user.password = hash;
					cb(null, user);
				});
			});
		}else cb(null, user);
	},
	
	customToJSON: function () {
        return _.omit(this, ['password', 'createdAt', 'updatedAt'])
    }

};

