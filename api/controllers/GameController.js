/**
 * PagesController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const moment = require('moment');

module.exports = {


	/**
	* Return the home page
	*/
	getHomePage: function (req, res) {
		return res.view('public/home', {
			layout: 'public/layout',
			title: 'RaidParty',
			metaDescription: '',
		});
    },
	
	
	
	async getActiveGames(req,res){
		
		try{
			let dateNow = new Date();
			let games = await Game.find({active:true}).populate('rewardCampaign').populate('gamePlatforms').sort('createdAt ASC');
			let gameList = [],
			rules,
			ruleLocale,
			gameIndex = 0,
			locale = req.param("locale");
			
			if(!locale){
				locale = 'en';
			}
			
			for(const game of games){
			
				game.isLive = false;
				
				// Ensure we set the correct language for the rules
				rules = util.stringToJson(game.rules);
				
				if(rules){
					ruleLocale = rules.find(function (obj) { return obj.hasOwnProperty(locale); });
					
					if(!ruleLocale){
						locale = 'en';
						game.rules = rules.find(function (obj) { return obj.hasOwnProperty(locale); });
						game.rules = game.rules['en'];
					}else{
						game.rules = ruleLocale[locale];
					}
				}
				
				if(!game.rules){
					game.rules = rules;
				}
				
				// Display campaign ending date
				// This campaign is now LIVE
				
				if(moment().isSameOrAfter(game.startDate) && !moment().isSameOrAfter(game.endDate)){
					game.isLive = true;
					game.timeRemaining = moment(game.endDate).fromNow();
				}else if(moment().isSameOrAfter(game.startDate)){
					game.isLive = false;
					game.timeRemaining = "Rewards Ended";
				}else{
					game.isLive = false;
					game.timeRemaining = "Starts " + moment(game.startDate).fromNow() + "!";
				}
				
				// Insert refactored object to array
				gameList.push(game);
				
				// Increment game list
				gameIndex++;
			}
		
			return res.ok(gameList);
		}catch(err){
			return res.serverError(err);
		}
	}


};
