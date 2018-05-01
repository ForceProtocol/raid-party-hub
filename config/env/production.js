

/**
 * Production environment settings
 *
 * This file can include shared settings for a production environment,
 * such as API keys or remote database passwords.  If you're using
 * a version control solution for your Sails app, this file will
 * be committed to your repository unless you add it to your .gitignore
 * file.  If your repository will be publicly viewable, don't add
 * any private information to this file!
 *
 */

module.exports = {

    connections : {
        mysqlDbProd: {
            adapter: 'sails-mysql',
            host: '178.62.109.184',
            user: 'triforcer236',
            password: 'ji4Zr56Bu72FY',
            database: 'raidparty_live'
        },
		mysqlDbStage: {
            adapter: 'sails-mysql',
            host: '178.62.109.184',
            user: 'triforcer236',
            password: 'ji4Zr56Bu72FY',
            database: 'raidparty_stage'
        },
    },
    models: {
        connection: 'mysqlDbStage',
		migrate: 'safe'
    },
	log: {
		level: 'error'
	},

	MANDRILL_KEY: 'EHaaGsImRCQrLW9vrWSedA',		// PRODUCTION KEY

    hookTimeout: 120000,
    API_HOST: 'https://staging.hub.raidparty.io',
    APP_HOST: 'https://appstaging.raidparty.io',

    oneSignal: {
        userAuthKey: 'YzBhY2IwNGYtNGVhZS00YjZjLWFiNTctYzViODZkZDQ0OGRh',
        appAuthKey: 'YzU0NzFlMGMtNGI5Zi00ZTZkLWFlN2QtODYxZDI4MGIyOWZm',
        appId: '28142d5f-8d0d-463e-aa33-26de871f9591'
    },

};
