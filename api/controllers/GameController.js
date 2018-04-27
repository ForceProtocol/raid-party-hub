/**
 * PagesController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */


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
	
	
	
	asycn getActiveGames(req,res){
		
		try{
			let games = await Game.find({active:true}).populate('rewardCampaign').sort('createdAt ASC');
			let gameList = [],
			platforms,
			rules,
			gameIndex = 0,
			locale = res.getLocale();
			
			for(const game of games){
				gameList.push(game);
				
				// Set defaults
				platforms = JSON.parse(game.platform);
				game.platform = platform;
				
				// Ensure we set the correct language for the rules
				rules = JSON.parse(game.rules);
				
				if(game.rules.hasOwnProperty(locale)){
					game.rules = game.rules[locale];
				}else if(game.rules.en){
					game.rules = game.rules.en;
				}else{
					game.rules = game.rules;
				}
				
				// Increment game list
				gameIndex++;
			}
		
			return res.ok(gameList);
		}catch(err){
			return res.serverError(err);
		}
	}


};
