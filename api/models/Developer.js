/**
 * Developer.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    tableName: 'developers',
    attributes: {
	
		developerId: {
            type: 'string',
			unique: true,
			size: 40,
			defaultsTo: function() {
				return uuidv4();
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
			defaultsTo: function() {
				return new Date()
			}
		},
		
		forceBalance: {
			type: 'string'
		},
		
		transactions: {
			collection: 'developertransactions',
			via: 'developer'
		},
		
		games: {
			collection: 'game',
			via: 'developer'
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
	
	
	validatePassword: function (attemptedPassword,realPassword) {
		return new Promise((resolve, reject)=>{
			bcrypt.compare(attemptedPassword, realPassword, (err, result)=>{
			if(err)return reject(err);
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
        return _.omit(this, ['password', 'activatePin', 'pinCreatedAt', 'createdAt', 'updatedAt'])
    }
};

