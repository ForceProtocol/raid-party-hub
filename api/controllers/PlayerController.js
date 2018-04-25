/**
 * PagesController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
 
var sha1 = require('sha1');

module.exports = {


	async signupPlayer(req,res){
	
		const email = req.param("email"),
				firstName = req.param("firstName"),
				lastName = req.param("lastName"),
				password = req.param("password"),
				deviceType = req.param("device_type"),
				locale = req.param("locale");
				
        try {
					
			// Validate sent params
			if(!deviceType || !email || !password){
				throw new CustomError('You did not provide all signup details required.', {status: 400});
			}
			
			if(!locale){
				locale = 'en';
			}
						
			let existingPlayerDevice = await Player.findOne({email: email});

			// Player already exists
            if(existingPlayerDevice){
				throw new CustomError('This email is already registered with another account. Please login to your account using the following email: ' + existingPlayerDevice.email, {status: 400});
            }
			
			// Create activation PIN
			let pin = util.randomFixedInteger(6);
			
			// Create new player account
			// AccountStatus: 0 = blocked, 1 = pending activation, 2 = activated
			let player = await Player.create({
				email: email,
				password: password,
				deviceType: deviceType,
				pin: pin,
				accountStatus: 1,
				forceBalance: '0',
				firstName: firstName,
				lastName: lastName
			});
			
			// Create the users wallet
			//WalletService.createUserWallet(player.id).catch(err=>{sails.log.error('On signup, failed to create player wallet: ', err)});
			
			/** Add to normal subscriber list **/
			MailchimpService.addSubscriber("bb2455ea6e", email, firstName, lastName, "pending",locale).then(function(addResponse){
			}).catch(function(err) {
				sails.log.debug("new subscriber not added due to error: ", err);
			});
			
			return res.ok({
                success: true,
            });

        } catch(err) {
            return util.errorResponse(err, res);
        }
	},

	
	
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
				eventId = req.param('event_id'),
				eventValue = req.param('event_value'),
				eventTypeId = req.param('event_type_id');
				
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
			
			// Event ID is required
			if(typeof eventId == 'undefined' || eventId.length < 1){
				sails.log.debug("PlayerController.trackerEvent: Invalid event ID");
				return res.json('400',{'reason':'Invalid event ID. Event ID is required.'});
			}
			
			// Authenticate the request - is this really from the developers game?
			let game = await Game.findOne({publicKey:publicKey}).populate('developer');
			
			// Game was not found with public key
			if(!game){
				sails.log.debug("PlayerController.trackerEvent: Could not find that game with the public key: ",publicKey);
				return res.json('403',{'reason':'Could not discover a record with details sent.'});
			}
			
			
			// Authenticate the request
			if(!SdkAuth.validAuthKey(authKey,publicKey,game.privateKey,'/sdk/game/event',playerCode + ':' + eventId)){
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
			let recordGameEvent = await PlayerToGameEvent.create({player:player.id,gameEvent:eventId,eventValue:eventValue});
			
			if(!recordGameEvent){
				sails.log.debug("PlayerController.trackEvent: Could not record that game event");
				return res.json('403',{'reason':'The game event could not be tracked.'});
			}
			
			// Check if this event is attached to a reward campaign event of type 2 (instant win, but one time)
			if(!eventTypeId){
				let dateNow = new Date();
				let activeRewardCampaigns = await RewardCampaign.find({game:game.id,rewardTypeId: 2,rewardProcessed: false,maxWinningPlayers: {'>':0}, startDate: {'<=':dateNow},endDate: {'>=': dateNow}})
				.populate('rewardCampaignGameEvents');
				
				
				if(!activeRewardCampaigns){
					sails.log.debug("PlayerController.trackEvent: No reward campaign game events found for that.");
				}else{
					
					// Cycle through each reward campaign
					let totalEventsToComplete = 0,
					playerCompletedEvents = 0;
					for(const rewardCampaign of activeRewardCampaigns){
					
						if(!rewardCampaign.rewardCampaignGameEvents){
							sails.log.debug("PlayerController.trackEvent: No reward campaign game events found for this reward campaign.",rewardCampaign);
							continue;
						}
						
						totalEventsToComplete = rewardCampaign.rewardCampaignGameEvents.length;
						playerCompletedEvents = 0;
						
						// Make sure the player has not already been rewarded this
						let playerRewardedAlready = await QualifiedPlayers.findOne({players:player.id,rewardCampaign:rewardCampaign.id,isWinner:true});
						
						// Player already claimed this reward
						if(playerRewardedAlready){
							sails.log.debug("PlayerController.trackEvent: the player has already been rewarded for this");
							continue;
						}
						
						// Cycle through each reward campaign required event
						for(const rewardCampaignEvent of rewardCampaign.rewardCampaignGameEvents){
						
							// Check if player has achieved this particular event on this occassion
							if(rewardCampaignEvent.valueMin <= eventValue && rewardCampaignEvent.valueMax >= eventValue){
								sails.log.debug("The player has completed an event for reward: ");
								playerCompletedEvents++;
							
								// Check if we have recorded already this player achieved this event
								let playerCompletedEvent = await PlayerCompletedEvent.findOne({player:player.id,rewardCampaignGameEvent:rewardCampaignEvent.id});
								
								// Player has not been recorded as completing this event
								if(!playerCompletedEvent){
									sails.log.debug("The player has not been checked as completed this game event: ",rewardCampaignEvent);
									PlayerCompletedEvent.create({player:player.id,rewardCampaignGameEvent:rewardCampaignEvent.id,points:rewardCampaignEvent.points}).exec(function(err,created){});
								}
							}
						}
						
						// The player has completed all the neccessary events for this reward, 
						// to be rewarded
						if(playerCompletedEvents >= totalEventsToComplete){
							sails.log.debug("The player has completed all events required for reward");
							let rewardPlayer = await QualifiedPlayers.create({players:player.id,game:game.id,rewardCampaign:rewardCampaign.id,isWinner:true,points:1});
							let issueReward = await PlayerRewards.create({player:player.id,game:game.id,reason:rewardCampaign.reason,currency:rewardCampaign.currency,amount:rewardCampaign.value,rewardCampaign:rewardCampaign.id});
							
							// Reduce total potential winners now
							await RewardCampaign.update({id:rewardCampaign.id},{maxWinningPlayers:rewardCampaign.maxWinningPlayers - 1});
							
							// TODO: Send push notification that player won this reward
							let message = "You got an instant win!";
							await PlayerNotifications.create({title: "Instant Win",message:message,players:player.id});
						}
					}
					
					
				}
			}
			
			// If eventTypeId is 2, it means it is an instant win
			else if(eventTypeId == 2){
			}
			
			return res.json('201',recordGameEvent);
		}catch(err){
			util.errorResponse(err, res);
		}
    },
	
	
	
	async getPlayerCount(req,res){
		try {
			let totalPlayers = await Player.count();
			return res.ok({totalPlayers});
		}catch(err){
			sails.log.debug("Get Player Count fired error: ",err);
			return res.serverError();
		}
	}


};
