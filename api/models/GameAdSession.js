/**
 * GameAdSession.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    attributes: {

        deviceId: {
            type: 'string',
            defaultsTo: ''
        },

        exposedTime: {
            type: 'integer',
            defaultsTo: 0
        },

        sessionTime: {
            type: 'integer',
            defaultsTo: 0
        },

		gameAdAsset: {
            model: 'gameadasset'
        },
    },
	
};