const moment = require('moment');

module.exports.cron = {

	confirmJackpotQualifyingPlayers: {
		schedule: '1 * * * *',  // Run this every 15-20 mins

		onTick: async function() {
		
			try {
			
				sails.log.debug("Running cron task confirmJackpotQualifyingPlayers");
				
				// REWARD CAMPAIGN TYPE ID: 1
				// This reward type processes for rewards that have big jackpot at the end of a campaign
				// Obtain list of reward events that are currently live
				let dateNow = new Date();
				
				let liveRewardCampaigns = await RewardCampaign.find({rewardTypeId: 1,rewardProcessed: false, startDate: {'<=':dateNow},endDate: {'>=': dateNow}}).populate('rewardCampaignGameEvents');
				
				
				// First we find the live campaign qualifying events,
				// match any player events and record that they qualified on
				// a particular reward event, for later processing
				for(const rewardCampaign of liveRewardCampaigns){
				
					sails.log.debug("reward campaign:",rewardCampaign.id);
					
					for(const qualifyingEvent of rewardCampaign.rewardCampaignGameEvents){
						sails.log.debug("qualifying event ID:",qualifyingEvent.id);
						
						// Form the search query to find qualifying players
						let campaignEventQuery = {};
						
						// Maximum Value Required
						if(qualifyingEvent.valueMax != 0){
							campaignEventQuery['<='] = qualifyingEvent.valueMax;
						}
						
						// Minimum Value required
						if(qualifyingEvent.valueMin != 0){
							campaignEventQuery['>='] = qualifyingEvent.valueMin;
						}
						
						if(campaignEventQuery.length == 0){
							campaignEventQuery = 0;
						}
						
						// Find player events that completed this event
						let playerCompletedEvents = await PlayerToGameEvent.find({eventValue:campaignEventQuery,gameEvent:qualifyingEvent.gameEvent,createdAt: {'>=': rewardCampaign.startDate},confirmed:false});
						
						// Insert each qualifying event against the reward campaign for processing later
						for(const playerQualifiedEvent of playerCompletedEvents){
							sails.log.debug("player qualified event of: ",qualifyingEvent.id);
							
							let insertedEvent = await PlayerCompletedEvent.create({player:playerQualifiedEvent.player,rewardCampaignGameEvent:qualifyingEvent.id,points:qualifyingEvent.points});
							
							// Mark this event as being confirmed
							if(insertedEvent){
								let confirmedEvent = await PlayerToGameEvent.update({id:playerQualifiedEvent.id},{confirmed:true});
								
								if(!confirmedEvent){
									sails.log.error("Cron Task . Process reward campaign type ID 1, did not confirm a players qualifying event.");
								}
							}
						}
						
					}
				
				
					// Now check if a player has completed all the associated reward events against this particular reward campaign
					// So we can email them telling them they have been entered into the big prize
					// And send a notification to their mobile about it
					let qualifyingRewardEventsArr = rewardCampaign.rewardCampaignGameEvents.map(a => a.id);
					
					if(!qualifyingRewardEventsArr){
						return;
					}
					
					// Query to find qualifying players for this reward campaign
					// So they can be sent email about being entered
					PlayerCompletedEvent.query("select a.id, a.rewardCampaignGameEvent, SUM(a.points) AS totalPoints, c.id AS playerId, c.email, c.firstName, c.lastName from playercompletedevent AS a LEFT JOIN rewardcampaigngameevent AS b ON a.rewardCampaignGameEvent = b.id LEFT JOIN players AS c ON a.player = c.id where a.rewardCampaignGameEvent in (" + qualifyingRewardEventsArr.join(",") + ") && a.qualifiedEvent = 0 group by a.player having count(distinct a.rewardCampaignGameEvent) = " + qualifyingRewardEventsArr.length, function(err, rawResult){
						if(err){
							sails.log.error("Error retrieving qualifying players",err);
						}else if(rawResult){
							sails.log.debug("Qualifying players found to enter into qualifying table:",rawResult);
							// Enter each qualifying player into the qualifiedPlayers table against the reward campaign
							for(const playerData of rawResult){
								QualifiedPlayers.create({players:playerData.playerId,points:playerData.totalPoints,rewardCampaign:rewardCampaign.id,game:rewardCampaign.game}).exec(function(err,created){
									if(err){
										sails.log.error("failed to insert qualified player on cron task:",err);
									}else{
										PlayerCompletedEvent.update({player:playerData.playerId,rewardCampaignGameEvent: playerData.rewardCampaignGameEvent},{qualifiedEvent:true}).exec(function(err,updated){});
									}
								});
							}
						}else{
							sails.log.debug("Did not find any qualifying players to enter qualification table");
						}
					});
					
				}
				
			}catch(err){
				sails.log.error("Failed to process reward campaign game events against player events on cron task: ",err);
			}
			
		
		}
	},
	
	
	/**
	* Notify players who qualified for prize draw
	* Send email to that player and push notification
	* to mobile device
	*/
	notifyQualifiedPlayers: {
		schedule: '1 * * * *',  // Run this every 15-20 mins

		onTick: async function() {
		
			try {
			
				sails.log.debug("Running cron task notifyQualifiedPlayers");
				
				// Find qualified players that have not been notified yet
				let qualifiedPlayersToNotify = await QualifiedPlayers.find({qualifiedEmailSent:false,wonEmailSent:false,isWinner:false}).populate('players').populate('rewardCampaign').populate('game');
				
				// Update straight away we have notified these players for simplicity - need to improve this later
				await QualifiedPlayers.update({qualifiedEmailSent:false,wonEmailSent:false},{qualifiedEmailSent:true});
				
				// Cycle through list of qualified players to send email and mobile push notification
				let message = "";
				for(const qualifiedPlayers of qualifiedPlayersToNotify){
				
					message = "Well done! You have entered into the reward prize draw for " + qualifiedPlayers.rewardCampaign.value + " " + qualifiedPlayers.rewardCampaign.currency + " for playing " + qualifiedPlayers.game.title;
					await PlayerNotifications.create({title: "Entered into prize draw",message:message,players:qualifiedPlayers.players.id});
					
					// TODO: Send Email to player they have been entered into the prize draw
					// TODO: Send push notification through service https://onesignal.com/
				}
				
			
			}catch(err){
				sails.log.error("Failed to notify qualified players cron task: ",err);
			}
			
		}
	},
	
	
	/**
	* This will find winners for the big jackpot prizes that get run at the end of a game campaign
	* This must select big jackpot type reward campaigns
	* Find qualified players
	* Select winner(s)
	* Add their reward and reduce from winnings / close the reward campaign
	* Send email and push notification to winners
	*/
	selectJackpotWinners: {
		schedule: '1 * * * *',  // Run this every 15-20 mins

		onTick: async function() {
		
			try {
			
				sails.log.debug("Running cron task selectJackpotWinners");
				
				// This reward type processes for rewards that have big jackpot at the end of a campaign
				// Obtain list of reward events that are currently live
				let dateNow = new Date();
				
				let liveRewardCampaigns = await RewardCampaign.find({rewardTypeId: 1,rewardProcessed: false,endDate: {'<': dateNow}}).populate('rewardCampaignGameEvents');
				
				for(const rewardCampaign of liveRewardCampaigns){
				
					sails.log.debug("rewardCampaign for selecting Jackpot winners is: ",rewardCampaign);
					
					let qualifyingPlayers = await QualifiedPlayers.find({rewardCampaign:rewardCampaign.id,isWinner:false}).populate('players');

					// Confirm how many winners need to be selected
					let maxWinners = rewardCampaign.maxWinningPlayers,
					totalEntrants = qualifyingPlayers.length,
					prizeValue = rewardCampaign.value,
					prizeCurrency = rewardCampaign.currency,
					gameId = rewardCampaign.game,
					rewardReason = rewardCampaign.reason,
					selectedWinner = 0, winningPlayer, playerPrize;
					
					// No winners to select. possibly an issue
					if(totalEntrants < 1){
						sails.log.error("Failed to pick a winner for the following reward campaign: ",rewardCampaign.id);
						await RewardCampaign.update({id: rewardCampaign.id},{rewardProcessed:true,rewardProcessedDate:new Date()});
						return;
					}
					
					// Update the prize has been issued
					await RewardCampaign.update({id:rewardCampaign.id},{rewardProcessed:true,rewardProcessedDate:new Date()});
					
					// Only 1 winner to select
					if(maxWinners == 1){
						// TODO: Need to update this so the points earned increase the players chances of winning
						selectedWinner = util.getRandomInt(0, totalEntrants - 1);
						winningPlayer = qualifyingPlayers[selectedWinner];
						
						// Update player reward table for this winner, check the reward campaign as completed
						sails.log.debug("The winner is: ",winningPlayer);
						
						let awardPrize = await PlayerRewards.create({player:winningPlayer.players.id,amount:prizeValue,currency:prizeCurrency,game:gameId,reason:rewardReason,rewardCampaign:rewardCampaign.id});
						
						// Failed to award the prize
						if(!awardPrize){
							sails.log.error("Failed to award the prize for the reward campaign: ",rewardCampaign.id);
							return;
						}
						
						await QualifiedPlayers.update({players: winningPlayer.players.id,rewardCampaign:rewardCampaign.id},{isWinner:true,wonEmailSent:true});
						
						// TODO: Send won email to this player
						// TODO: notify all other players they didn't win this time, but x player won
					}
					
					// More than 1 winner to select
					else{
					
						// There are too many winners for entrants, award to all players
						if(maxWinners > totalEntrants){
							sails.log.debug("There are less players than potential winners, everyone wins!");
							playerPrize = parseFloat(prizeValue / totalEntrants).toFixed(4) - 0.0001;
							
							for(const qualifyingPlayer of qualifyingPlayers){
								await PlayerRewards.create({player:qualifyingPlayer.players.id,amount:playerPrize,currency:prizeCurrency,game:gameId,reason:rewardReason,rewardCampaign:rewardCampaign.id});
								await QualifiedPlayers.update({players: qualifyingPlayer.players.id,rewardCampaign:rewardCampaign.id},{isWinner:true,wonEmailSent:true});
								
								// TODO: Send email to players that they won
								// TODO: Send push notification to players they won
							}
						}
						// Need to select multiple winners from potential winners
						else{
							sails.log.debug("Selecting multiple winners from qualified players");
							playerPrize = parseFloat(prizeValue / maxWinners).toFixed(4) - 0.0001;
							let qualifiedPlayersArr = qualifyingPlayers;
							
							// Go through and select winners
							for(var i = 0;i < maxWinners;i++){
							
								selectedWinner = util.getRandomInt(0, qualifiedPlayersArr.length - 1);
								winningPlayer = qualifiedPlayersArr[selectedWinner];
								await PlayerRewards.create({player:winningPlayer.players.id,amount:playerPrize,currency:prizeCurrency,game:gameId,reason:rewardReason,rewardCampaign:rewardCampaign.id});
								await QualifiedPlayers.update({players:winningPlayer.players.id,rewardCampaign:rewardCampaign.id},{isWinner:true,wonEmailSent:true});
								
								// TODO: Send email to player that they won
								// TODO: Send push notification to player they won
								
								// Remove this winner from the qualifying Players array
								qualifiedPlayersArr.splice(selectedWinner,1);
							}
						
						}
						
					}
					
				}
				
				
			}catch(err){
				sails.log.error("Failed to process reward campaign game events against player events on cron task: ",err);
			}
		
		}
	},
	
	
	
	
	confirmType4RewardQualifyingPlayers: {
		schedule: '1 * * * *',  // Run this every 15-20 mins

		onTick: async function() {
		
			try {
			
				sails.log.debug("Running cron task confirmType4RewardQualifyingPlayers");
				
				// REWARD CAMPAIGN TYPE ID: 4
				// Big jackpot prize at end of campaign
				// But includes a reward event lockout period
				// and the reward event needs to be repeated x times to qualify
				// Usefull for creating a campaign where players have to complete an event
				// multiple times during the reward campaign
				let dateNow = new Date();
				
				let liveRewardCampaigns = await RewardCampaign.find({rewardTypeId: 4,rewardProcessed: false, startDate: {'<=':dateNow},endDate: {'>=': dateNow}}).populate('rewardCampaignGameEvents');
				
				
				// First we find the live campaign qualifying events,
				// match any player events and record that they qualified on
				// a particular reward event, for later processing
				for(const rewardCampaign of liveRewardCampaigns){
				
					sails.log.debug("reward campaign:",rewardCampaign.id);
					
					for(const qualifyingEvent of rewardCampaign.rewardCampaignGameEvents){
						sails.log.debug("qualifying event ID:",qualifyingEvent.id);
						
						// Form the search query to find qualifying players
						let campaignEventQuery = {},
						totalQualifyingEventsRequired = qualifyingEvent.repeated;
						
						// Maximum Value Required
						if(qualifyingEvent.valueMax != 0){
							campaignEventQuery['<='] = qualifyingEvent.valueMax;
						}
						
						// Minimum Value required
						if(qualifyingEvent.valueMin != 0){
							campaignEventQuery['>='] = qualifyingEvent.valueMin;
						}
						
						if(campaignEventQuery.length == 0){
							campaignEventQuery = 0;
						}
						
						// Find player events that completed this event
						let playerCompletedEvents = await PlayerToGameEvent.find({eventValue:campaignEventQuery,gameEvent:qualifyingEvent.gameEvent,createdAt: {'>=': rewardCampaign.startDate},confirmed:false});
						
						
						// NEED TO GROUP COUNT BY PLAYERS TO DETERMINE WHICH PLAYERS HAVE COMPLETED THIS
						let playerGroupedEvents = await _.groupBy(playerCompletedEvents,'player');
						
						for(let playerGroup of Object.values(playerGroupedEvents)){
							sails.log.debug("Individual Player -> grouped qualifying events -> ",playerGroup[0],playerGroup.length);
							
							// Check the player has not already qualified for this reward
							let playerQualified = await QualifiedPlayers.findOne({players:playerGroup[0].player,rewardCampaign:rewardCampaign.id});
							
							if(playerQualified){
								// Record this player game event has been confirmed as qualified
								sails.log.debug("This player has already qualified for this reward campaign",playerQualified);
								for(let event of playerGroup){
									await PlayerToGameEvent.update({id:event.id},{confirmed:true});
								}
							}
							
							// The player has not completed enough events to qualify yet
							if(playerGroup.length < totalQualifyingEventsRequired){
								sails.log.debug("player did not complete enough of these events to qualify.");
								// TODO: Update a progress stat of the player to how close to completing they are on this reward
								// Send email to players as they get closer to reaching goal
								continue;
							}
							
							
							// There is no lockout period on this qualifying event
							if(rewardCampaign.lockoutPeriod < 1){
								// The player has qualified to be entered to this reward campaign
								// Record the player completed this event
								await PlayerCompletedEvent.create({player:playerGroup[0].player,rewardCampaignGameEvent:qualifyingEvent.id,points:qualifyingEvent.points,qualifiedEvent:true});
								
								// Record this player game event has been confirmed as qualified
								for(let event of playerGroup){
									await PlayerToGameEvent.update({id:event.id},{confirmed:true});
								}
								
								await QualifiedPlayers.create({players:playerGroup[0].player,points:qualifyingEvent.points,rewardCampaign:rewardCampaign.id,game:rewardCampaign.game});
								
								continue;
							}
							
							// There is a lockout period on this
							// Need to exclude any events that occured inside the lockout period compared with
							// the last qualifying event
							else{
								sails.log.debug("This reward event has a lockout period for repeating events.");
								
								playerGroup = _.sortBy(playerGroup, function(o) { return new moment(o.createdAt); });
								
								let lastEventCreatedAt = '',
								lastEventCreatedAtUnix,
								currentCreatedAtUnix,
								qualifiedEvents = [];
								
								// Work out what events qualify for this player
								for(let event of playerGroup){
									if(lastEventCreatedAt.length == 0){
										lastEventCreatedAt = event.createdAt;
										qualifiedEvents.push(event);
									}else{
										lastEventCreatedAtUnix = moment(lastEventCreatedAt).unix();
										currentCreatedAtUnix = moment(event.createdAt).unix();
										eventDifference = currentCreatedAtUnix - lastEventCreatedAtUnix;
										
										// This event qualifies, add to list
										if(eventDifference >= rewardCampaign.lockoutPeriod){
											qualifiedEvents.push(event);
										}
									}
								}
								
								// Check if the player has now completed enough qualifying events
								// Add them to qualified table
								sails.log.debug("qualified events length: ", qualifiedEvents.length);
								
								if(qualifiedEvents.length >= totalQualifyingEventsRequired){
									sails.log.debug("Player has qualified for this reward campaign: ",playerGroup);
									await PlayerCompletedEvent.create({player:playerGroup[0].player,rewardCampaignGameEvent:qualifyingEvent.id,points:qualifyingEvent.points,qualifiedEvent:true});
								
									// Record this player game event has been confirmed as qualified
									for(let event of playerGroup){
										await PlayerToGameEvent.update({id:event.id},{confirmed:true});
									}
									
									await QualifiedPlayers.create({players:playerGroup[0].player,points:qualifyingEvent.points,rewardCampaign:rewardCampaign.id,game:rewardCampaign.game});
								}
							}
							
							
						}
					}
				}
				
			}catch(err){
				sails.log.error("Failed to process reward campaign game events against player events on cron task: ",err);
			}
			
		
		}
	},
	

};
