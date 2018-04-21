/**
 * PlayerNotifications.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
 

module.exports = {

    attributes: {
		
		title: {
			type: 'string',
			defaultsTo: ''
		},
		
		message: {
            type: 'string',
			defaultsTo: ''
        },
		
		players: {
			model: 'player',
		},
		
	},
	
};

