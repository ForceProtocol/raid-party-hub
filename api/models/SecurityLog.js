/**
 * User.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    tableName: 'security_log',
    attributes: {
	
		publicKey: {
            type: 'string',
			size: 40,
        },
		
		reason: {
            type: 'string',
        },
		
		developerId: {
            type: 'string',
        },
		
    },
};

