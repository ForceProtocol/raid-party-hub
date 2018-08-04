/**
 * PagesController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const moment = require('moment');

module.exports = {


	
	async getActiveGames(req,res){
		
		try{
			let dateNow = new Date();
			let games = await Game.find({active:true}).populate('rewardCampaign').populate('gamePlatforms').sort('createdAt ASC');
			let gameList = [],
			rules,
			ruleLocale,
			description,
			descriptionLocale,
			gameIndex = 0,
			locale = req.param("locale");
			
			if(!locale){
				locale = 'en';
			}
			
			moment.locale(locale);
			
			for(const game of games){
			
				game.isLive = false;
				
				// Ensure we set the correct language for the rules
				rules = util.stringToJson(game.rules);
				
				if(rules){
					ruleLocale = rules.find(function (obj) { return obj.hasOwnProperty(locale); });
					
					if(!ruleLocale){
						game.rules = rules.find(function (obj) { return obj.hasOwnProperty('en'); });
						game.rules = game.rules['en'];
					}else{
						game.rules = ruleLocale[locale];
					}
				}
				
				if(!game.rules){
					game.rules = rules;
				}
				
				// Ensure we set the correct language for the rules
				description = util.stringToJson(game.description);
				
				if(description){
					descriptionLocale = description.find(function (obj) { return obj.hasOwnProperty(locale); });
					
					if(!descriptionLocale){
						game.description = description.find(function (obj) { return obj.hasOwnProperty('en'); });
						game.description = game.description['en'];
					}else{
						game.description = descriptionLocale[locale];
					}
				}
				
				if(!game.description){
					game.description = description;
				}
				
				
				// Display campaign ending date
				// This campaign is now LIVE
				
				if(moment().isSameOrAfter(game.startDate) && !moment().isSameOrAfter(game.endDate)){
					game.isLive = true;
					game.timeRemaining = moment(game.endDate).fromNow();
				}else if(moment().isSameOrAfter(game.startDate)){
					game.isLive = false;
					game.timeRemaining = sails.__("Rewards Ended");
				}else{
					game.isLive = false;
					game.timeRemaining = sails.__("Starts ") + moment(game.startDate).fromNow() + "!";
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
	},
	
	
	
	async getGame(req,res){
		
		try{
			let dateNow = new Date(),
			gameId = req.param("gameId"),
			gameList = [],
			rules,
			ruleLocale,
			description,
			descriptionLocale,
			gameIndex = 0,
			locale = req.param("locale");
			
			if(!locale){
				locale = 'en';
			}
			
			moment.locale(locale);
			
			let game = await Game.findOne({id:gameId}).populate('rewardCampaign').populate('gamePlatforms');
			
			game.isLive = false;
				
			// Ensure we set the correct language for the rules
			rules = util.stringToJson(game.rules);
			
			if(rules){
				ruleLocale = rules.find(function (obj) { return obj.hasOwnProperty(locale); });
				
				if(!ruleLocale){
					game.rules = rules.find(function (obj) { return obj.hasOwnProperty('en'); });
					game.rules = game.rules['en'];
				}else{
					game.rules = ruleLocale[locale];
				}
			}
				
			if(!game.rules){
				game.rules = rules;
			}
				
			// Ensure we set the correct language for the rules
			description = util.stringToJson(game.description);
			
			if(description){
				descriptionLocale = description.find(function (obj) { return obj.hasOwnProperty(locale); });
				
				if(!descriptionLocale){
					game.description = description.find(function (obj) { return obj.hasOwnProperty('en'); });
					game.description = game.description['en'];
				}else{
					game.description = descriptionLocale[locale];
				}
			}
				
			if(!game.description){
				game.description = description;
			}
				
				
			// Display campaign ending date
			// This campaign is now LIVE
			
			if(moment().isSameOrAfter(game.startDate) && !moment().isSameOrAfter(game.endDate)){
				game.isLive = true;
				game.timeRemaining = moment(game.endDate).fromNow();
			}else if(moment().isSameOrAfter(game.startDate)){
				game.isLive = false;
				game.timeRemaining = sails.__("Rewards Ended");
			}else{
				game.isLive = false;
				game.timeRemaining = sails.__("Starts ") + moment(game.startDate).fromNow() + "!";
			}

			game.avatar = '/assets/images/' + game.avatar;
			
			return res.ok(game);
		}catch(err){
			return res.serverError(err);
		}
	},



	async getGameAssets(req,res){
		try{
			let gameId = req.param("gameId"),
			gameAssetList = [];
			
			let gameAssets = await GameAsset.find({game:gameId});

			if(!gameAssets){
				throw new CustomError("There are no game assets available for this game yet.", { status: 400 });
			}

			for(const gameAsset of gameAssets){
				gameAsset.screenshot = "/assets/images/game-assets/screenshots/" + gameAsset.screenshot;
				gameAsset.avgExposure = 231;
				gameAsset.avgSession = 600;

				// Insert refactored object to array
				gameAssetList.push(gameAsset);
			}

			return res.ok(gameAssetList);
		}catch(err){
			return res.serverError(err);
		}
	}


};
