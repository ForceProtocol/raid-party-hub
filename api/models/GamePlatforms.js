/**
 * GamePlatforms.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
		
		type: {
			type: 'string',
			required: true
		},
		link: {
			type: 'string',
			defaultsTo: ''
		},
		fontAwesome: {
			type: 'string',
			defaultsTo: 'fas fa-link'
		},
		isCountrySpecific:{
			type: 'boolean'
		},
		countryLinks: {
			type: 'string'
		},
		active: {
			type: 'boolean',
			defaultsTo: false
		},
		
		game: {
			model: 'game'
		},
		
    },
	
};

