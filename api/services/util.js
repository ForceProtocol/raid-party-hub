const bcrypt = require('bcryptjs');
const SALT_ROUND = 10;
const BigNumber = require('bignumber.js');

module.exports = {

    async hashPassword(password){

        try {
            var salt = await bcrypt.genSalt(SALT_ROUND);
            return await bcrypt.hash(password, SALT_ROUND);
        }
        catch (err) {
            throw err;
        }
    },

    async comparedPassword(password, hash){
        try {
            return await bcrypt.compare(password, hash);
        }
        catch (err) {
            throw err;
        }
    },

    /**
     * a helper method to process error object and return apporpriate message based on status if err = instance of CustomError
     * @param {CustomError|Error} err - standard error
     * @param res - sails response object
     * @param {string} [responseFormat] - possible values: xml, json
     */
    errorResponse(err, res, responseFormat) {

        let rsp = {}, _status = 500;
        if (err instanceof CustomError) {
            rsp = {err: err.message};
            if (err.errors) {
                rsp.errors = _.clone(err.errors);
            }

            if (typeof err === 'object') {
                for (let prop in err) {
                    if (['message', 'status', 'errors', 'error', 'name', 'stack'].indexOf(prop) !== -1) continue;
                    rsp[prop] = err[prop];
                }
            }

            _status = err.status || 500;


        } else if (err instanceof Error) {
            rsp = {err: err.message};
        } else {
            rsp = err;
        }

        _status === 500 && sails.log.error(err);
        _status !== 500 && sails.log.verbose(err);

        if (responseFormat && responseFormat === 'xml') {
            const xml = require('xml');
            res.setHeader("Content-type", "text/xml");
            return res.status(_status).send(xml(FeedService.objToXmlArray(rsp), {declaration: true}));
        } else {
            res.send(rsp, _status);
        }
    },

    sendBadRequest(msg, status, res) {
        return res.status(status).send(msg);
    },

    /**
     *
     * @param {array<number>} [numbers]
     * @returns {*}
     */
    sumBigNumbers: (numbers)=>{
        if(!_.isArray(numbers))return '0';

        let result = new BigNumber(0);
        numbers.forEach(_num=>{
            try {
                result = result.plus(_num);
            }catch(ex){

            }
        });

        return result.toString();
    },

    /**
     * generate a random number of fixed length
     * @param length
     * @returns {number}
     */
    randomFixedInteger: function (length) {
        return Math.floor(Math.pow(10, length-1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length-1) - 1));
    },
	
	
	getPlayerGameCode: function (length) {
		var text = "";
		var possible = "ABCDEFGHJKLMNPQRSTWXYZ0123456789";

		for (var i = 0; i < length; i++){
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		
		return text;
    },
	
	
	getRandomInt: function (min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},
	
	groupBy: function (list, keyGetter) {
		const map = new Map();
		list.forEach((item) => {
			const key = keyGetter(item);
			const collection = map.get(key);
			if (!collection) {
				map.set(key, [item]);
			} else {
				collection.push(item);
			}
		});
		return map;
	}
};