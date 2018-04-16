/**
 * GameEvent.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
		
		eventName: {
			type: 'string',
			required: true
		},
		
		eventDescription: {
			type: 'string',
			required: true
		},
		
		eventValue: {
			type: 'string',
			defaultsTo: ''
		},
		
		eventValueMin: {
			type: 'string',
			defaultsTo: ''
		},
		
		eventValueMax: {
			type: 'string',
			defaultsTo: ''
		},
		
		playerToGameEvent: {
			collection: 'playertogameevent',
			via: 'gameEvent'
		},
		
		game: {
			model: 'game'
		},
		
    },
	
};

