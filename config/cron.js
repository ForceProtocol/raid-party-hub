const moment = require('moment');
const _ = require('lodash');

module.exports.cron = {

	// confirmJackpotQualifyingPlayers: {
	// 	schedule: '* * * * *',  // Run this every 15-20 mins
	// 	onTick: async function () {

	// 		try {

	// 			const playerToEventsMapping = {};
	// 			sails.log.debug("Running cron task confirmJackpotQualifyingPlayers");

	// 			// REWARD CAMPAIGN TYPE ID: 1
	// 			// This reward type processes for rewards that have big jackpot at the end of a campaign
	// 			// Obtain list of reward events that are currently live
	// 			let dateNow = new Date();

	// 			let liveRewardCampaigns = await RewardCampaign.find({ rewardTypeId: 1, rewardProcessed: false, startDate: { '<=': dateNow }, endDate: { '>=': dateNow } }).populate('rewardCampaignGameEvents');


	// 			// First we find the live campaign qualifying events,
	// 			// match any player events and record that they qualified on
	// 			// a particular reward event, for later processing
	// 			for (const rewardCampaign of liveRewardCampaigns) {

	// 				sails.log.debug("reward campaign:", rewardCampaign.id);

	// 				// get the ids of all the players which are already qualified for this reward campaign.
	// 				const alreadyQualifiedPlayerIdsObject = await QualifiedPlayers.find({ select: ['players'], where: { rewardCampaign: rewardCampaign.id } });
	// 				const alreadyQualifiedPlayerIds = [];
	// 				_.each(alreadyQualifiedPlayerIdsObject, (object) => {
	// 					alreadyQualifiedPlayerIds.push(object["players"]);
	// 				})
	// 				sails.log.debug("alreadyQualifiedPlayerIds:", alreadyQualifiedPlayerIds);
	// 				for (const qualifyingEvent of rewardCampaign.rewardCampaignGameEvents) {
	// 					sails.log.debug("qualifying event ID:", qualifyingEvent.id);

	// 					// Form the search query to find qualifying players
	// 					let campaignEventQuery = {};

	// 					// Maximum Value Required
	// 					if (qualifyingEvent.valueMax != 0) {
	// 						campaignEventQuery['<='] = qualifyingEvent.valueMax;
	// 					}

	// 					// Minimum Value required
	// 					if (qualifyingEvent.valueMin != 0) {
	// 						campaignEventQuery['>='] = qualifyingEvent.valueMin;
	// 					}

	// 					if (campaignEventQuery.length == 0) {
	// 						campaignEventQuery = 0;
	// 					}

	// 					sails.log.debug("qualifying event params:", campaignEventQuery);

	// 					// Find player events that completed this event
	// 					let playerCompletedEvents = await PlayerToGameEvent.find({ eventValue: campaignEventQuery, gameEvent: qualifyingEvent.gameEvent, createdAt: { '>=': rewardCampaign.startDate } });
	// 					sails.log.debug("playerCompletedEvents:", playerCompletedEvents);
	// 					// Remove player events who are already quialified for this campaign.
	// 					_.remove(playerCompletedEvents, function (event) {
	// 						return _.indexOf(alreadyQualifiedPlayerIds, event.player) !== -1
	// 					});
	// 					sails.log.debug("filtered playerCompletedEvents:", playerCompletedEvents);

	// 					// Insert each qualifying event against the reward campaign for processing later
	// 					for (const playerQualifiedEvent of playerCompletedEvents) {
	// 						sails.log.debug("player qualified event of: ", qualifyingEvent.id);
	// 						if (playerToEventsMapping[playerQualifiedEvent.player]) {
	// 							playerToEventsMapping[playerQualifiedEvent.player].push(playerQualifiedEvent.gameEvent);
	// 						} else {
	// 							playerToEventsMapping[playerQualifiedEvent.player] = [];
	// 							playerToEventsMapping[playerQualifiedEvent.player].push(playerQualifiedEvent.gameEvent);
	// 						}
	// 						sails.log.debug("playertoEventsMapping:", playerToEventsMapping);
	// 					}
	// 				}
	// 				// Now check if a player has completed all the associated reward events against this particular reward campaign
	// 				// So we can email them telling them they have been entered into the big prize
	// 				// And send a notification to their mobile about it
	// 				let qualifyingRewardEventsArr = rewardCampaign.rewardCampaignGameEvents.map(a => a.gameEvent);

	// 				if (!qualifyingRewardEventsArr) {
	// 					return;
	// 				}

	// 				_.each(Object.keys(playerToEventsMapping), (playerId) => {
	// 					const completedEvents = playerToEventsMapping[playerId];
	// 					if (completedEvents) {
	// 						const eventsNotCompleted = _.difference(qualifyingRewardEventsArr, completedEvents);
	// 						console.log(qualifyingRewardEventsArr);
	// 						if (eventsNotCompleted.length === 0) {
	// 							sails.log.debug("Qualifying player id found to enter into qualifying table:", playerId);
	// 							// Enter each qualifying player into the qualifiedPlayers table against the reward campaign
	// 							QualifiedPlayers.create({ players: playerId, rewardCampaign: rewardCampaign.id, game: rewardCampaign.game }).exec(function (err, created) {
	// 								if (err) {
	// 									sails.log.error("failed to insert qualified player on cron task:", err);
	// 									return;
	// 								}
	// 							});
	// 						}
	// 					}
	// 				})
	// 			}
	// 			delete playerToEventsMapping;
	// 		} catch (err) {
	// 			sails.log.error("Failed to process reward campaign game events against player events on cron task: ", err);
	// 		}
	// 	}
	// },


	/**
	* Notify players who qualified for prize draw
	* Send email to that player and push notification
	* to mobile device
	*/
	notifyQualifiedPlayers: {
		schedule: '* * * * *',  // Run this every 15-20 mins

		onTick: async function () {

			try {

				sails.log.debug("Running cron task notifyQualifiedPlayers");

				// Find qualified players that have not been notified yet
				let qualifiedPlayersToNotify = await QualifiedPlayers.find({ qualifiedEmailSent: false, wonEmailSent: false, isWinner: false }).populate('players').populate('rewardCampaign').populate('game');

				// Update straight away we have notified these players for simplicity - need to improve this later
				// await QualifiedPlayers.update({ qualifiedEmailSent: false, wonEmailSent: false }, { qualifiedEmailSent: true });

				// Cycle through list of qualified players to send email and mobile push notification
				let message = "";
				let deviceIds = [];
				for (const qualifiedPlayers of qualifiedPlayersToNotify) {

					message = "Well done! You have entered into the reward prize draw for " + qualifiedPlayers.rewardCampaign.value + " " + qualifiedPlayers.rewardCampaign.currency + " for playing " + qualifiedPlayers.game.title;
					await PlayerNotifications.create({ title: "Entered into prize draw", message: message, players: qualifiedPlayers.players.id });

					// Send Email to player they have been entered into the prize draw.
					deviceIds.push(qualifiedPlayers.players.deviceId);
					await EmailService.sendEmail({
						fromEmail: 'support@raidparty.io',
						fromName: 'RaidParty Admin',
						toEmail: qualifiedPlayers.players.email,
						toName: qualifiedPlayers.players.email,
						subject: 'Successfull Entry into Jackpot reward contest',
						body: message
					});


					await QualifiedPlayers.update({ players: qualifiedPlayers.players.id }, { qualifiedEmailSent: true });

					// TODO: Send push notification through service https://onesignal.com/
				}

				// Send batch Notification to qualified players.
				await OneSignalService.sendNotificationsToMultipleDevices({ deviceIds: deviceIds, text: "Well done! You have entered into the reward prize draw for playing a game through raidparty. Tap to know more." });

			} catch (err) {
				sails.log.error("Failed to notify qualified players cron task: ", err);
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
	// selectJackpotWinners: {
	// 	schedule: '1 * * * *',  // Run this every 15-20 mins

	// 	onTick: async function () {

	// 		try {

	// 			sails.log.debug("Running cron task selectJackpotWinners");

	// 			// This reward type processes for rewards that have big jackpot at the end of a campaign
	// 			// Obtain list of reward events that are currently live
	// 			let dateNow = new Date();

	// 			let liveRewardCampaigns = await RewardCampaign.find({ rewardTypeId: 1, rewardProcessed: false, endDate: { '<': dateNow } }).populate('rewardCampaignGameEvents');

	// 			for (const rewardCampaign of liveRewardCampaigns) {

	// 				sails.log.debug("rewardCampaign for selecting Jackpot winners is: ", rewardCampaign);

	// 				let qualifyingPlayers = await QualifiedPlayers.find({ rewardCampaign: rewardCampaign.id, isWinner: false }).populate('players');

	// 				// Confirm how many winners need to be selected
	// 				let maxWinners = rewardCampaign.maxWinningPlayers,
	// 					totalEntrants = qualifyingPlayers.length,
	// 					prizeValue = rewardCampaign.value,
	// 					prizeCurrency = rewardCampaign.currency,
	// 					gameId = rewardCampaign.game,
	// 					rewardReason = rewardCampaign.reason,
	// 					selectedWinner = 0, winningPlayer, playerPrize;

	// 				// No winners to select. possibly an issue
	// 				if (totalEntrants < 1) {
	// 					sails.log.error("Failed to pick a winner for the following reward campaign: ", rewardCampaign.id);
	// 					await RewardCampaign.update({ id: rewardCampaign.id }, { rewardProcessed: true, rewardProcessedDate: new Date() });
	// 					return;
	// 				}

	// 				// Update the prize has been issued
	// 				await RewardCampaign.update({ id: rewardCampaign.id }, { rewardProcessed: true, rewardProcessedDate: new Date() });

	// 				// Only 1 winner to select
	// 				if (maxWinners == 1) {
	// 					// TODO: Need to update this so the points earned increase the players chances of winning
	// 					selectedWinner = util.getRandomInt(0, totalEntrants - 1);
	// 					winningPlayer = qualifyingPlayers[selectedWinner];

	// 					// Update player reward table for this winner, check the reward campaign as completed
	// 					sails.log.debug("The winner is: ", winningPlayer);

	// 					let awardPrize = await PlayerRewards.create({ player: winningPlayer.players.id, amount: prizeValue, currency: prizeCurrency, game: gameId, reason: rewardReason, rewardCampaign: rewardCampaign.id });

	// 					// Failed to award the prize
	// 					if (!awardPrize) {
	// 						sails.log.error("Failed to award the prize for the reward campaign: ", rewardCampaign.id);
	// 						return;
	// 					}

	// 					await QualifiedPlayers.update({ players: winningPlayer.players.id, rewardCampaign: rewardCampaign.id }, { isWinner: true, wonEmailSent: true });

	// 					// TODO: Send won email to this player
	// 					// TODO: notify all other players they didn't win this time, but x player won
	// 				}

	// 				// More than 1 winner to select
	// 				else {

	// 					// There are too many winners for entrants, award to all players
	// 					if (maxWinners > totalEntrants) {
	// 						sails.log.debug("There are less players than potential winners, everyone wins!");
	// 						playerPrize = parseFloat(prizeValue / totalEntrants).toFixed(4) - 0.0001;

	// 						for (const qualifyingPlayer of qualifyingPlayers) {
	// 							await PlayerRewards.create({ player: qualifyingPlayer.players.id, amount: playerPrize, currency: prizeCurrency, game: gameId, reason: rewardReason, rewardCampaign: rewardCampaign.id });
	// 							await QualifiedPlayers.update({ players: qualifyingPlayer.players.id, rewardCampaign: rewardCampaign.id }, { isWinner: true, wonEmailSent: true });

	// 							// TODO: Send email to players that they won
	// 							// TODO: Send push notification to players they won
	// 						}
	// 					}
	// 					// Need to select multiple winners from potential winners
	// 					else {
	// 						sails.log.debug("Selecting multiple winners from qualified players");
	// 						playerPrize = parseFloat(prizeValue / maxWinners).toFixed(4) - 0.0001;
	// 						let qualifiedPlayersArr = qualifyingPlayers;

	// 						// Go through and select winners
	// 						for (var i = 0; i < maxWinners; i++) {

	// 							selectedWinner = util.getRandomInt(0, qualifiedPlayersArr.length - 1);
	// 							winningPlayer = qualifiedPlayersArr[selectedWinner];
	// 							await PlayerRewards.create({ player: winningPlayer.players.id, amount: playerPrize, currency: prizeCurrency, game: gameId, reason: rewardReason, rewardCampaign: rewardCampaign.id });
	// 							await QualifiedPlayers.update({ players: winningPlayer.players.id, rewardCampaign: rewardCampaign.id }, { isWinner: true, wonEmailSent: true });

	// 							// TODO: Send email to player that they won
	// 							// TODO: Send push notification to player they won

	// 							// Remove this winner from the qualifying Players array
	// 							qualifiedPlayersArr.splice(selectedWinner, 1);
	// 						}

	// 					}

	// 				}

	// 			}


	// 		} catch (err) {
	// 			sails.log.error("Failed to process reward campaign game events against player events on cron task: ", err);
	// 		}

	// 	}
	// },




	confirmType4RewardQualifyingPlayers: {
		schedule: '* * * * *',  // Run this every 15-20 mins

		onTick: async function () {

			try {

				const playerToEventsMapping = {};
				sails.log.debug("Running cron task confirmType4RewardQualifyingPlayers");

				// REWARD CAMPAIGN TYPE ID: 4
				// Big jackpot prize at end of campaign
				// But includes a reward event lockout period
				// and the reward event needs to be repeated x times to qualify
				// Usefull for creating a campaign where players have to complete an event
				// multiple times during the reward campaign
				let dateNow = new Date();

				let liveRewardCampaigns = await RewardCampaign.find({ rewardTypeId: 4, rewardProcessed: false, startDate: { '<=': dateNow }, endDate: { '>=': dateNow } }).populate('rewardCampaignGameEvents');

				// First we find the live campaign qualifying events,
				// match any player events and record that they qualified on
				// a particular reward event, for later processing
				for (const rewardCampaign of liveRewardCampaigns) {
					sails.log.debug("reward campaign:", rewardCampaign.id);

					// get the ids of all the players which are already qualified for this reward campaign.
					const alreadyQualifiedPlayerIdsObject = await QualifiedPlayers.find({ select: ['players'], where: { rewardCampaign: rewardCampaign.id } });
					const alreadyQualifiedPlayerIds = [];
					_.each(alreadyQualifiedPlayerIdsObject, (object) => {
						alreadyQualifiedPlayerIds.push(object["players"]);
					})


					for (const qualifyingEvent of rewardCampaign.rewardCampaignGameEvents) {
						sails.log.debug("qualifying event ID:", qualifyingEvent.id);

						// Form the search query to find qualifying players
						let campaignEventQuery = {},
							totalQualifyingEventsRequired = qualifyingEvent.repeated;

						// Maximum Value Required
						if (qualifyingEvent.valueMax != 0) {
							campaignEventQuery['<='] = qualifyingEvent.valueMax;
						}

						// Minimum Value required
						if (qualifyingEvent.valueMin != 0) {
							campaignEventQuery['>='] = qualifyingEvent.valueMin;
						}

						if (campaignEventQuery.length == 0) {
							campaignEventQuery = 0;
						}

						// Find player events that completed this event
						let playerCompletedEvents = await PlayerToGameEvent.find({ eventValue: campaignEventQuery, gameEvent: qualifyingEvent.gameEvent, createdAt: { '>=': rewardCampaign.startDate } });
						_.remove(playerCompletedEvents, function (event) {
							return _.indexOf(alreadyQualifiedPlayerIds, event.player) !== -1
						});

						// NEED TO GROUP COUNT BY PLAYERS TO DETERMINE WHICH PLAYERS HAVE COMPLETED THIS
						let playerGroupedEvents = await _.groupBy(playerCompletedEvents, 'player');

						for (let playerGroup of Object.values(playerGroupedEvents)) {
							sails.log.debug("Individual Player -> grouped qualifying events -> ", playerGroup[0], playerGroup.length);

							// The player has not completed enough events to qualify yet
							if (playerGroup.length < totalQualifyingEventsRequired) {
								sails.log.debug("player did not complete enough of these events to qualify.");
								// TODO: Update a progress stat of the player to how close to completing they are on this reward
								// Send email to players as they get closer to reaching goal
								continue;
							}


							// There is no lockout period on this qualifying event
							if (rewardCampaign.lockoutPeriod < 1) {

								if (playerToEventsMapping[playerGroup[0].player]) {
									playerToEventsMapping[playerGroup[0].player].push(playerGroup[0].gameEvent);
								} else {
									playerToEventsMapping[playerGroup[0].player] = [];
									playerToEventsMapping[playerGroup[0].player].push(playerGroup[0].gameEvent);
								}
								sails.log.debug("playertoEventsMapping:", playerToEventsMapping);

								// await QualifiedPlayers.create({ players: playerGroup[0].player, points: qualifyingEvent.points, rewardCampaign: rewardCampaign.id, game: rewardCampaign.game });

								continue;
							}

							// There is a lockout period on this
							// Need to exclude any events that occured inside the lockout period compared with
							// the last qualifying event
							else {
								sails.log.debug("This reward event has a lockout period for repeating events.");

								playerGroup = _.sortBy(playerGroup, function (o) { return new moment(o.createdAt); });

								let lastEventCreatedAt = '',
									lastEventCreatedAtUnix,
									currentCreatedAtUnix,
									qualifiedEvents = [];

								// Work out what events qualify for this player
								for (let event of playerGroup) {
									if (lastEventCreatedAt.length == 0) {
										lastEventCreatedAt = event.createdAt;
										qualifiedEvents.push(event);
									} else {
										lastEventCreatedAtUnix = moment(lastEventCreatedAt).unix();
										currentCreatedAtUnix = moment(event.createdAt).unix();
										eventDifference = currentCreatedAtUnix - lastEventCreatedAtUnix;

										// This event qualifies, add to list
										if (eventDifference >= rewardCampaign.lockoutPeriod) {
											qualifiedEvents.push(event);
										}
									}
								}

								// Check if the player has now completed enough qualifying events
								// Add them to qualified table
								sails.log.debug("qualified events length: ", qualifiedEvents.length);

								if (qualifiedEvents.length >= totalQualifyingEventsRequired) {
									sails.log.debug("Player has qualified for this reward campaign: ", playerGroup);
									if (playerToEventsMapping[playerGroup[0].player]) {
										playerToEventsMapping[playerGroup[0].player].push(playerGroup[0].gameEvent);
									} else {
										playerToEventsMapping[playerGroup[0].player] = [];
										playerToEventsMapping[playerGroup[0].player].push(playerGroup[0].gameEvent);
									}
									sails.log.debug("playertoEventsMapping:", playerToEventsMapping);
									// await QualifiedPlayers.create({ players: playerGroup[0].player, points: qualifyingEvent.points, rewardCampaign: rewardCampaign.id, game: rewardCampaign.game });
								}
							}


						}
					}

					//Now check if a player has completed all the associated reward events against this particular reward campaign
					// So we can email them telling them they have been entered into the big prize
					// And send a notification to their mobile about it
					let qualifyingRewardEventsArr = rewardCampaign.rewardCampaignGameEvents.map(a => a.gameEvent);

					if (!qualifyingRewardEventsArr) {
						return;
					}

					_.each(Object.keys(playerToEventsMapping), (playerId) => {
						const completedEvents = playerToEventsMapping[playerId];
						if (completedEvents) {
							const eventsNotCompleted = _.difference(qualifyingRewardEventsArr, completedEvents);
							console.log(qualifyingRewardEventsArr);
							if (eventsNotCompleted.length > 0) {
								sails.log.debug("Player has not completed all the events required:", playerId);
								return;
							}
							if (eventsNotCompleted.length === 0) {
								sails.log.debug("Qualifying player id found to enter into qualifying table:", playerId);
								// Enter each qualifying player into the qualifiedPlayers table against the reward campaign
								QualifiedPlayers.create({ players: playerId, rewardCampaign: rewardCampaign.id, game: rewardCampaign.game }).exec(function (err, created) {
									if (err) {
										sails.log.error("failed to insert qualified player on cron task:", err);
										return;
									}
								});
							}
						}
					});

				}

			} catch (err) {
				sails.log.error("Failed to process reward campaign game events against player events on cron task: ", err);
			}


		}
	},


};
