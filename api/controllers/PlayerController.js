/**
 * PagesController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
 
var sha1 = require('sha1');

module.exports = {


	/**
	* Track a player request from a game using their email
	* Route: /player/track/email
	*/
	async trackPlayerEmail(req, res) {
	
		try {
			let publicKey = req.param('public_key'),
				authKey = req.param('auth_key'),
				playerEmail = req.param('email'),
				developersPlayerId = req.param('my_id');
				
			// Make sure valid information was sent
			if(typeof playerEmail == 'undefined' || playerEmail.length > 0){
				sails.log.debug("trackerPlayer : No valid email provided");
				return res.json('400',{'reason':'You did not provide a valid email ID of the player'});
			}
			
			// Authenticate the request - is this really from the developers game?
			let game = await Game.findOne({publicKey:publicKey}).populate('developer');
			
			// Game was not found with public key
			if(!game){
				sails.log.debug("trackerPlayer : Could not find that game with the public key: ",publicKey);
				return res.json('403',{'reason':'Could not discover a record with details sent.'});
			}
			
			
			/** Check if the authKey the developer sent is valid */
			
			// Create the encrypted request hash for comparison of what the developer sent
			let validAuth = sha1('/player/track/email:' + game.privateKey);
			
			// Invalid Key Provided! Log this incase it's abuse/hacking attempt
			if(authKey != validAuth){
				sails.log.debug("trackerPlayer : Invalid authKey provided by developer.",authKey,validAuth);
				SecurityLog.create({developerId:game.developer[0].id,publicKey:publicKey,reason:'Invalid Auth Attempt'}).exec(function(err,created){});
				return res.json('403',{'reason':'Invalid auth sent.'});
			}
			
			
			/** The auth key is valid, proceed */
			
			// Attempt to find this player
			let player = await Player.findOne({email:email}).populate('games');
			
			// Player not found - invite them to use RaidParty
			if(!player){
				// TODO: Send email to player inviting to RaidParty
				sails.log.debug("trackerPlayer : Player not found in RaidParty network. Inviting player to join.");
				return res.json('202',{'reason':'Player is not within RaidParty network. They have been invited.'});
			}
			
			// Check to see if this player is already registered against this game
			let playerLinkedToGameState = !!_.find(player.games,function(gameElement){
				return game.id == gameElement.id;
			});
			
			// Player is not linked to this game
			if(!playerLinkedToGameState){
				let linkPlayerToGame = await PlayerToGame.create({player:player.id,game:game.id,myId:developersPlayerId});
			}else{
				// Record this player accessed the game
				let linkPlayerToGame = await PlayerToGame.update({player:player.id,game:game.id,lastLogin:new Datetime()});
				
				if(_.isArray(linkPlayerToGame) && linkPlayerToGame.length){
					linkPlayerToGame = linkPlayerToGame[0];
				}else{
					sails.log.error("trackerPlayer : Failed to update a players record to associated game");
					throw new CustomError("Could not update the player record to associated game.",{status:500});
				}
			}
			
			playerData = {
				id: playerId,
				email: player.email,
				my_id: linkPlayerToGame.myId,
				auth_key: authKey
			}

			return res.json('201',{player:playerData});
			
		}catch(err){
			util.errorResponse(err, res);
		}
    },
	
	
	
	/**
	* Track a player request from a game using their device ID
	* Route: /player/track/device
	*/
	async trackPlayerDevice(req, res) {
	
		try {
			let publicKey = req.param('public_key'),
				authKey = req.param('auth_key'),
				deviceId = req.param('device_id'),
				developersPlayerId = req.param('my_id');
				
			// Make sure valid information was sent
			if(typeof deviceId == 'undefined' || deviceId.length > 0){
				sails.log.debug("trackerPlayer : No valid deviceId provided");
				return res.json('400',{'reason':'You did not provide a valid device ID of the player'});
			}
			
			// Authenticate the request - is this really from the developers game?
			let game = await Game.findOne({publicKey:publicKey}).populate('developer');
			
			// Game was not found with public key
			if(!game){
				sails.log.debug("trackerPlayer : Could not find that game with the public key: ",publicKey);
				return res.json('403',{'reason':'Could not discover a record with details sent.'});
			}
			
			
			/** Check if the authKey the developer sent is valid */
			
			// Create the encrypted request hash for comparison of what the developer sent
			let validAuth = sha1('/player/track/device:' + game.privateKey);
			
			// Invalid Key Provided! Log this incase it's abuse/hacking attempt
			if(authKey != validAuth){
				sails.log.debug("trackerPlayer : Invalid authKey provided by developer.",authKey,validAuth);
				SecurityLog.create({developerId:game.developer[0].id,publicKey:publicKey,reason:'Invalid Auth Attempt'}).exec(function(err,created){});
				return res.json('403',{'reason':'Invalid auth sent.'});
			}
			
			
			/** The auth key is valid, proceed */
			
			// Attempt to find this player
			let player = await Player.findOne({deviceId:deviceId}).populate('games');
			
			// Player not found - invite them to use RaidParty
			if(!player){
				// TODO: Send email to player inviting to RaidParty
				sails.log.debug("trackerPlayer : Player not found in RaidParty network. Inviting player to join.");
				return res.json('202',{'reason':'Player is not within RaidParty network. They have been invited.'});
			}
			
			// Check to see if this player is already registered against this game
			let playerLinkedToGameState = !!_.find(player.games,function(gameElement){
				return game.id == gameElement.id;
			});
			
			// Player is not linked to this game
			if(!playerLinkedToGameState){
				let linkPlayerToGame = await PlayerToGame.create({player:player.id,game:game.id,myId:developersPlayerId});
			}else{
				// Record this player accessed the game
				let linkPlayerToGame = await PlayerToGame.update({player:player.id,game:game.id,lastLogin:new Datetime()});
				
				if(_.isArray(linkPlayerToGame) && linkPlayerToGame.length){
					linkPlayerToGame = linkPlayerToGame[0];
				}else{
					sails.log.error("trackerPlayer : Failed to update a players record to associated game");
					throw new CustomError("Could not update the player record to associated game.",{status:500});
				}
			}
			
			playerData = {
				id: playerId,
				device_id: player.deviceId,
				my_id: linkPlayerToGame.myId,
				auth_key: authKey
			}

			return res.json('201',{player:playerData});
			
		}catch(err){
			util.errorResponse(err, res);
		}
    },
	
	
	
	
	
	/**
	* Reward a player by email ID
	* Route: /player/reward/email
	*/
	async rewardPlayerEmail(req, res) {
	
		try {
			let publicKey = req.param('public_key'),
				authKey = req.param('auth_key'),
				playerEmail = req.param('email'),
				reward = req.param('reward'),
				reason = req.param('reason');
				
				
			// Make sure valid information was sent
			if(typeof playerEmail == 'undefined' || playerEmail.length > 0){
				sails.log.debug("trackerPlayer : No valid email provided");
				return res.json('400',{'reason':'You did not provide a valid email ID of the player'});
			}
			
			// Make sure valid information was sent
			if(typeof reward == 'undefined' || reward.length > 0){
				sails.log.debug("trackerPlayer : No valid reward given for reward");
				return res.json('400',{'reason':'You did not provide a reward for the player.'});
			}
			
			// Make sure valid information was sent
			if(typeof reward != 'number'){
				sails.log.debug("trackerPlayer : Invalid format for reward - not a number");
				return res.json('400',{'reason':'The reward parameter was sent as a string. It must be of type float or integer, not a string.'});
			}
			
			// Make sure valid information was sent
			if(typeof reason == 'undefined' || reason.length > 0){
				sails.log.debug("trackerPlayer : No valid reason given for reward");
				return res.json('400',{'reason':'You did not provide a reason for why the player was rewarded'});
			}
			
			// Authenticate the request - is this really from the developers game?
			let game = await Game.findOne({publicKey:publicKey}).populate('developer');
			
			// Game was not found with public key
			if(!game){
				sails.log.debug("trackerPlayer : Could not find that game with the public key: ",publicKey);
				return res.json('403',{'reason':'Could not discover a record with details sent.'});
			}
			
			/** Check if the authKey the developer sent is valid */
			
			// Create the encrypted request hash for comparison of what the developer sent
			let validAuth = sha1('/player/reward/email:' + game.privateKey);
			
			// Invalid Key Provided! Log this incase it's abuse/hacking attempt
			if(authKey != validAuth){
				sails.log.debug("trackerPlayer : Invalid authKey provided by developer.",authKey,validAuth);
				SecurityLog.create({developerId:game.developer[0].id,publicKey:publicKey,reason:'Invalid Auth Attempt'}).exec(function(err,created){});
				return res.json('403',{'reason':'Invalid auth sent.'});
			}
			
			
			/** The auth key is valid, proceed */
			// Make sure the developer has enough FORCE currency to reward players
			if(parseFloat(game.developer.forceBalance) < reward){
				sails.log.debug("trackerPlayer : Not enough FORCE reward");
				return res.json('400',{'reason':'Your account does not have enough FORCE currency to reward players with. Please topup your account.'});
			}
			
			
			// Attempt to find this player
			let player = await Player.findOne({email:email}).populate('games');
			
			// Player not found - invite them to use RaidParty
			if(!player){
				// TODO: Send email to player inviting to RaidParty
				sails.log.debug("trackerPlayer : Player not found in RaidParty network. Inviting player to join.");
				return res.json('202',{'reason':'Player is not within RaidParty network. They have been invited.'});
			}
			
			// Check to see if this player is already registered against this game
			let playerLinkedToGameState = !!_.find(player.games,function(gameElement){
				return game.id == gameElement.id;
			});
			
			// Player is not linked to this game
			if(!playerLinkedToGameState){
				let linkPlayerToGame = await PlayerToGame.create({player:player.id,game:game.id,reward:reward});
			}else{
				// Record this player accessed the game
				reward = parseFloat(player.reward) + reward;
				let linkPlayerToGame = await PlayerToGame.update({player:player.id,game:game.id,lastLogin:new Datetime(),reward:newReward});
				
				if(_.isArray(linkPlayerToGame) && linkPlayerToGame.length){
					linkPlayerToGame = linkPlayerToGame[0];
				}else{
					sails.log.error("rewardPlayer : Failed to update a players record to associated game");
					throw new CustomError("Could not update the player record to associated game.",{status:500});
				}
			}
			
			// Add the reward to the player
			let addPlayerReward = await PlayerRewards.create({player:player.id,game:game.id,force:reward,reason:reason});
			
			playerData = {
				id: playerId,
				email: player.email,
				my_id: linkPlayerToGame.myId,
				auth_key: authKey
			}

			return res.json('201',{player:playerData});
			
		}catch(err){
			util.errorResponse(err, res);
		}
    },
	
	
	
	
	
	/**
	* Reward a player by device ID
	* Route: /player/reward/email
	*/
	async rewardPlayerDevice(req, res) {
	
		try {
			let publicKey = req.param('public_key'),
				authKey = req.param('auth_key'),
				deviceId = req.param('device_id'),
				reward = req.param('reward'),
				reason = req.param('reason');
				
				
			// Make sure valid information was sent
			if(typeof deviceId == 'undefined' || deviceId.length > 0){
				sails.log.debug("trackerPlayer : No valid deviceId provided");
				return res.json('400',{'reason':'You did not provide a valid device ID of the player'});
			}
			
			// Make sure valid information was sent
			if(typeof reward == 'undefined' || reward.length > 0){
				sails.log.debug("trackerPlayer : No valid reward given for reward");
				return res.json('400',{'reason':'You did not provide a reward for the player.'});
			}
			
			// Make sure valid information was sent
			if(typeof reward != 'number'){
				sails.log.debug("trackerPlayer : Invalid format for reward - not a number");
				return res.json('400',{'reason':'The reward parameter was sent as a string. It must be of type float or integer, not a string.'});
			}
			
			// Make sure valid information was sent
			if(typeof reason == 'undefined' || reason.length > 0){
				sails.log.debug("trackerPlayer : No valid reason given for reward");
				return res.json('400',{'reason':'You did not provide a reason for why the player was rewarded'});
			}
			
			// Authenticate the request - is this really from the developers game?
			let game = await Game.findOne({publicKey:publicKey}).populate('developer');
			
			// Game was not found with public key
			if(!game){
				sails.log.debug("trackerPlayer : Could not find that game with the public key: ",publicKey);
				return res.json('403',{'reason':'Could not discover a record with details sent.'});
			}
			
			/** Check if the authKey the developer sent is valid */
			
			// Create the encrypted request hash for comparison of what the developer sent
			let validAuth = sha1('/player/reward/device:' + game.privateKey);
			
			// Invalid Key Provided! Log this incase it's abuse/hacking attempt
			if(authKey != validAuth){
				sails.log.debug("trackerPlayer : Invalid authKey provided by developer.",authKey,validAuth);
				SecurityLog.create({developerId:game.developer[0].id,publicKey:publicKey,reason:'Invalid Auth Attempt'}).exec(function(err,created){});
				return res.json('403',{'reason':'Invalid auth sent.'});
			}
			
			
			/** The auth key is valid, proceed */
			// Make sure the developer has enough FORCE currency to reward players
			if(parseFloat(game.developer.forceBalance) < reward){
				sails.log.debug("trackerPlayer : Not enough FORCE reward");
				return res.json('400',{'reason':'Your account does not have enough FORCE currency to reward players with. Please topup your account.'});
			}
			
			
			// Attempt to find this player
			let player = await Player.findOne({deviceId:deviceId}).populate('games');
			
			// Player not found - invite them to use RaidParty
			if(!player){
				// TODO: Send email to player inviting to RaidParty
				sails.log.debug("trackerPlayer : Player not found in RaidParty network. Inviting player to join.");
				return res.json('202',{'reason':'Player is not within RaidParty network. They have been invited.'});
			}
			
			// Check to see if this player is already registered against this game
			let playerLinkedToGameState = !!_.find(player.games,function(gameElement){
				return game.id == gameElement.id;
			});
			
			// Player is not linked to this game
			if(!playerLinkedToGameState){
				let linkPlayerToGame = await PlayerToGame.create({player:player.id,game:game.id,reward:reward});
			}else{
				// Record this player accessed the game
				reward = parseFloat(player.reward) + reward;
				let linkPlayerToGame = await PlayerToGame.update({player:player.id,game:game.id,lastLogin:new Datetime(),reward:newReward});
				
				if(_.isArray(linkPlayerToGame) && linkPlayerToGame.length){
					linkPlayerToGame = linkPlayerToGame[0];
				}else{
					sails.log.error("rewardPlayer : Failed to update a players record to associated game");
					throw new CustomError("Could not update the player record to associated game.",{status:500});
				}
			}
			
			// Add the reward to the player
			let addPlayerReward = await PlayerRewards.create({player:player.id,game:game.id,force:reward,reason:reason});
			
			playerData = {
				id: playerId,
				device_id: player.deviceId,
				auth_key: authKey
			}

			return res.json('201',{player:playerData});
			
		}catch(err){
			util.errorResponse(err, res);
		}
    },
	
	


};
