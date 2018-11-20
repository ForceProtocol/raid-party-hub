/**
 * Game.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    attributes: {
	
        keyClaimed: {
            type: 'boolean',
            required: true,
			defaultsTo: false
        },

        playerId: {
            type: 'string',
            defaultsTo: ''
        },

        key: {
            type: 'string',
            required: true,
            unique: true
        },

    },
};

