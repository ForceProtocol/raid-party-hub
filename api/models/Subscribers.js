/**
 * Subscribers.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
 

module.exports = {

    attributes: {
			
		firstName: {
            type: 'string',
			defaultsTo: ''
        },
		
        lastName: {
            type: 'string',
			defaultsTo: ''
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
		
		gdprLog: {
			type: 'text',
			defaultsTo: ''
		},
		
		locale: {
            type: 'string',
			defaultsTo: 'en'
        },
		
	},

};

