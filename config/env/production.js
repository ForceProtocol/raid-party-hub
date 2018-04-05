

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
        mysqlDbDev: {
            adapter: 'sails-mysql',
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'raidparty_dev'
        }
    },
    models: {
        connection: 'mysqlDbDev',
		migrate: 'safe'
    },

	MANDRILL_KEY: 'EHaaGsImRCQrLW9vrWSedA',		// PRODUCTION KEY

    hookTimeout: 120000,

};
