/**
 * PagesController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
 
var sha1 = require('sha1');

module.exports = {


	/**
	* Track a player request from a game using their device ID
	* Route: /sdk/player/track
	*/
	async trackPlayer(req, res) {
	
		try {
			let publicKey = req.param('public_key'),
				authKey = req.param('auth_key'),
				playerCode = req.param('user_id'),
				developersPlayerId = req.param('my_id');
				
			// Ensure Auth Key is set and a valid key format
			if(typeof authKey == 'undefined' || authKey.length < 40){
				sails.log.debug("trackerPlayer : Not a valid request");
				// TODO: add a log that a bad request was made
				return res.json('400',{'reason':'You did not provide a valid request'});
			}
				
			// Make sure valid information was sent
			if(typeof playerCode == 'undefined' || playerCode.length < 1){
				sails.log.debug("trackerPlayer : No valid user_id provided");
				return res.json('400',{'reason':'You did not provide a valid user_id of the player'});
			}
			
			// Authenticate the request - is this really from the developers game?
			let game = await Game.findOne({publicKey:publicKey}).populate('developer');
			
			// Game was not found with public key
			if(!game){
				sails.log.debug("trackerPlayer : Could not find that game with the public key: ",publicKey);
				return res.json('403',{'reason':'Could not discover a record with details sent.'});
			}
			
			
			// Authenticate the request
			if(!SdkAuth.validAuthKey(authKey,publicKey,game.privateKey,'/sdk/player/track',playerCode)){
				sails.log.debug("trackerPlayer : Invalid auth_key was sent");
				// TODO: add a log that a bad request was made
				return res.json('400',{'reason':'You did not provide a valid request'});
			}
			
			
			// Attempt to find this player
			let player = await Player.findOne({code:playerCode}).populate('games');
			
			// Player not found - invite them to use RaidParty
			if(!player){
				// TODO: Send email to player inviting to RaidParty
				sails.log.debug("trackerPlayer : Player not found in RaidParty network.");
				return res.json('403',{'reason':'Player is not within RaidParty network. Could not discover a record with details sent.'});
			}
			
			// Check to see if this player is already registered against this game
			/*let playerLinkedToGameState = !!_.find(player.games,function(gameElement){
				return game.id == gameElement.id;
			});*/
			
			let playerLinkedToGameState = await PlayerToGame.findOne({player:player.id,game:game.id});
			
			// Player is not linked to this game
			if(!playerLinkedToGameState){
				let linkPlayerToGame = await PlayerToGame.create({player:player.id,game:game.id,myId:developersPlayerId,lastLogin:new Date()});
				
				playerData = {
					id: player.playerId,
					last_login: linkPlayerToGame.lastLogin,
					created_at: linkPlayerToGame.createdAt,
					my_id: linkPlayerToGame.myId
				}
				
				return res.json('201',{playerData});
			}else{
				// Record this player accessed the game
				let linkPlayerToGame = await PlayerToGame.update({id:playerLinkedToGameState.id},{lastLogin:new Date()});
				
				playerData = {
					id: player.playerId,
					last_login: linkPlayerToGame[0].lastLogin,
					created_at: linkPlayerToGame[0].createdAt,
					my_id: linkPlayerToGame[0].myId
				}
				
				return res.json('201',{playerData});
			}
			
		}catch(err){
			util.errorResponse(err, res);
		}
    },
	
	
	
	
	
	/**
	* Track an in-game event
	* Route: /sdk/game/event
	*/
	async trackEvent(req, res) {
	
		try {
			let publicKey = req.param('public_key'),
				authKey = req.param('auth_key'),
				playerCode = req.param('user_id'),
				eventName = req.param('event_name'),
				eventDescription = req.param('event_description'),
				eventValue = req.param('event_value'),
				developersPlayerId = req.param('my_id');
				
			// Ensure Auth Key is set and a valid key format
			if(typeof authKey == 'undefined' || authKey.length < 40){
				sails.log.debug("PlayerController.trackerEvent: Not a valid request");
				// TODO: add a log that a bad request was made
				return res.json('400',{'reason':'You did not provide a valid request'});
			}
				
			// Make sure valid information was sent
			if(typeof playerCode == 'undefined' || playerCode.length < 1){
				sails.log.debug("PlayerController.trackerEvent: No valid user_id provided");
				return res.json('400',{'reason':'You did not provide a valid user_id of the player'});
			}
			
			// Event Name is required
			if(typeof eventName == 'undefined' || eventName.length < 2){
				sails.log.debug("PlayerController.trackerEvent: Invalid event name");
				return res.json('400',{'reason':'Invalid event name. Event Name is required.'});
			}
			
			// Event Description is required
			if(typeof eventDescription == 'undefined' || eventDescription.length < 2){
				sails.log.debug("PlayerController.trackerEvent: Invalid event Description");
				return res.json('400',{'reason':'Invalid event description. Event Description is required.'});
			}
			
			// Authenticate the request - is this really from the developers game?
			let game = await Game.findOne({publicKey:publicKey}).populate('developer');
			
			// Game was not found with public key
			if(!game){
				sails.log.debug("PlayerController.trackerEvent: Could not find that game with the public key: ",publicKey);
				return res.json('403',{'reason':'Could not discover a record with details sent.'});
			}
			
			
			// Authenticate the request
			if(!SdkAuth.validAuthKey(authKey,publicKey,game.privateKey,'/sdk/game/event',playerCode + ':' + eventName)){
				sails.log.debug("PlayerController.trackerEvent: Invalid auth_key was sent");
				// TODO: add a log that a bad request was made
				return res.json('400',{'reason':'You did not provide a valid request'});
			}
			
			
			// Attempt to find this player
			let player = await Player.findOne({code:playerCode}).populate('games');
			
			// Player not found - invite them to use RaidParty
			if(!player){
				// TODO: Send email to player inviting to RaidParty
				sails.log.debug("PlayerController.trackerEvent: Player not found in RaidParty network. Inviting player to join.");
				return res.json('403',{'reason':'Player is not within RaidParty network. They have been invited.'});
			}
			
			// Record this event against the player and game
			let recordGameEvent = await PlayerToGameEvent.create({game:game.id,player:player.id,eventName:eventName,eventDescription:eventDescription,eventValue:eventValue});
			
			if(!recordGameEvent){
				sails.log.debug("PlayerController.trackerEvent: Could not record that game event");
				return res.json('403',{'reason':'The game event could not be tracked.'});
			}
			
			return res.json('201',recordGameEvent);
			
		}catch(err){
			util.errorResponse(err, res);
		}
    },
	
	


};
