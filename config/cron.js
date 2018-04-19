module.exports.cron = {

	confirmJackpotQualifyingPlayers: {
		schedule: '2 * * * *',  // Run this every 15-20 mins

		onTick: async function() {
		
			try {
			
				// REWARD CAMPAIGN TYPE ID: 1
				// This reward type processes for rewards that have big jackpot at the end of a campaign
				// Obtain list of reward events that are currently live
				let dateNow = new Date();
				
				let liveRewardCampaigns = await RewardCampaign.find({rewardTypeId: 1,rewardProcessed: false, startDate: {'<=':dateNow},endDate: {'>=': dateNow}}).populate('rewardCampaignGameEvents');
				
				
				// First we find the live campaign qualifying events,
				// match any player events and record that they qualified on
				// a particular reward event, for later processing
				for(const rewardCampaign of liveRewardCampaigns){
				
					console.log("reward campaign:",rewardCampaign.id);
					
					for(const qualifyingEvent of rewardCampaign.rewardCampaignGameEvents){
						console.log("qualifying event ID:",qualifyingEvent.id);
						
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
						
						// Find player events that completed this event
						let playerCompletedEvents = await PlayerToGameEvent.find({eventValue:campaignEventQuery,confirmed:false});
						
						// Insert each qualifying event against the reward campaign for processing later
						for(const playerQualifiedEvent of playerCompletedEvents){
							console.log("player qualified event of: ",qualifyingEvent.id);
							
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
					
					// Query to find qualifying players for this reward campaign
					// So they can be sent email about being entered
					PlayerCompletedEvent.query("select a.id, SUM(a.points) AS totalPoints, c.id AS playerId, c.email, c.firstName, c.lastName from playercompletedevent AS a LEFT JOIN rewardcampaigngameevent AS b ON a.rewardCampaignGameEvent = b.id LEFT JOIN players AS c ON a.player = c.id where a.rewardCampaignGameEvent in (" + qualifyingRewardEventsArr.join(",") + ") && a.qualifiedEmailSent = 0 group by a.player having count(distinct a.rewardCampaignGameEvent) = " + qualifyingRewardEventsArr.length, function(err, rawResult){
						if(err){
							sails.log.error("Error retrieving players to send email about being entered into competition");
						}else{
							console.log("raw result data: ",rawResult);
							
							
							// TODO: Send Each Player an email about the reward prize they have been entered into
							// TODO: Send each player a mobile notification through the app about being entered into prize draw
							for(const playerData of rawResult.RowPacketData){
								let subject = "Congrats! You have been entered into a prize draw!";
								let message = `Hi playerData.firstName,
								You have completed all the required events to be entered into the prize draw to win: `;
							}
							
							// TODO: When email has been sent, we need to update the table playercompletedevent that qualifiedEmailSent = true, so we do not send another email to them
						}
					});
					
				}
				
			}catch(err){
				sails.log.error("Failed to process reward campaign game events against player events on cron task: ",err);
			}
		
		}
	},
	
	
	/**
	* This will find winners for the big jackpot prizes that get run at the end of a game campaign
	*/
	confirmJackpotWinners: {
		schedule: '*/15 * * * * *',  // Run this every 15-20 mins

		onTick: async function() {
		
			try {
			
				// This reward type processes for rewards that have big jackpot at the end of a campaign
				// Obtain list of reward events that are currently live
				let dateNow = new Date();
				
				let liveRewardCampaigns = await RewardCampaign.find({rewardTypeId: 1,rewardProcessed: false,endDate: {'<': dateNow}}).populate('rewardCampaignGameEvents');
				
				for(const rewardCampaign of liveRewardCampaigns){
				
					let qualifyingRewardEventsArr = rewardCampaign.rewardCampaignGameEvents.map(a => a.id);
					
					// Find all qualifying players for this reward entry
					PlayerCompletedEvent.query("select a.id, SUM(a.points) AS totalPoints, c.id AS playerId, c.email, c.firstName, c.lastName from playercompletedevent AS a LEFT JOIN rewardcampaigngameevent AS b ON a.rewardCampaignGameEvent = b.id LEFT JOIN players AS c ON a.player = c.id where a.rewardCampaignGameEvent in (" + qualifyingRewardEventsArr.join(",") + ") group by a.player having count(distinct a.rewardCampaignGameEvent) = " + qualifyingRewardEventsArr.length, function(err, rawResult){
						if(err){
							sails.log.error("Error retrieving players to send email about being entered into competition");
						}else{
						
							// Confirm how many winners need to be selected
							let maxWinners = rewardCampaign.maxWinningPlayers;
							let totalEntrants = rawResult.length; // total number of players that qualified
							let prizeValue = rewardCampaign.jackpotValue,
							prizeCurrency = rewardCampaign.jackpotCurrency,
							gameId = rewardCampaign.game,
							rewardReason = rewardCampaign.reason;
							let selectedWinner = 0, winningPlayer, playerPrize;
							
							// No winners to select. possibly an issue
							if(totalEntrants < 1){
								sails.log.error("Failed to pick a winner for the following reward campaign: ",rewardCampaign.id);
								//RewardCampaign.update({id: rewardCampaign.id},{rewardProcessed:true,rewardProcessedDate:new Date()});
								return;
							}
							
							// Only 1 winner to select
							if(maxWinners == 1){
								// TODO: Need to update this so the points earned increase the players chances of winning
								selectedWinner = util.getRandomInt(0, totalEntrants - 1);
								winningPlayer = rawResult[selectedWinner].RawPacketData;
								
								// Update player reward table for this winner, check the reward campaign as completed
								console.log("The winner is: ",winningPlayer);
								
								let awardPrize = await PlayerRewards.create({player:winningPlayer.id,amount:prizeValue,currency:prizeCurrency,game:gameId,reason:rewardReason,rewardCampaign:rewardCampaign.id});
								
								// Failed to award the prize
								if(!awardPrize){
									sails.log.error("Failed to award the prize for the reward campaign: ",rewardCampaign.id);
									return;
								}
							}
							
							// More than 1 winner to select
							else{
							
								// There are too many winners for entrants, award to all players
								if(maxWinners > totalEntrants){
									playerPrize = Math.floor(prizeValue / totalEntrants);
									
									
								}
								
							}
							
							// Mark the reward campaign as completed
							//RewardCampaign.update({id: rewardCampaign.id},{rewardProcessed:true,rewardProcessedDate:new Date()});
							
						}
					});
					
				}
				
				
			}catch(err){
				sails.log.error("Failed to process reward campaign game events against player events on cron task: ",err);
			}
		
		}
	},
	

};
