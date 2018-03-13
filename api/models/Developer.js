/**
 * Developer.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    tableName: 'developers',
    attributes: {
	
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
		
		forceBalance: {
			type: 'string'
		},
		
        deviceId: {
			type: 'string',
			required: true,
			unique: true
		},
		
		games: {
			collection: 'game',
			via: 'developer'
		}

    },

    customToJSON: function () {
        return _.omit(this, ['password', 'createdAt', 'updatedAt'])
    }

};

