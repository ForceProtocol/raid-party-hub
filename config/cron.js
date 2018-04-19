module.exports.cron = {

	emailPlayerQualifiers: {
		schedule: '*/1 * * * *',  // every 15 minute

		onTick: async function() {
		
			try {
			
				// Obtain list of reward events that are currently live
				let someshit;
				let dateNow = new Date();
				
				let liveRewardCampaigns = await RewardCampaign.find({rewardProcessed: false, startDate: {'<=':dateNow},endDate: {'>=': dateNow}}).populate('rewardCampaignGameEvents');
			
				// Cycle through each live reward campaign
				liveRewardCampaigns.forEach(function(rewardCampaign){
				
				
					// Cycle through each reward campaign qualifying event
					rewardCampaign.rewardCampaignGameEvents.forEach(function(qualifyingEvent){
					
						console.log("qualifying event:",qualifyingEvent);
						
						// Form the search query to find qualifying players
						let campaignEventQuery = [];
						
						// Maximum Value Required
						if(qualifyingEvent.valueMax != 0){
							campaignEventQuery.push({'<=':qualifyingEvent.valueMax});
						}
						
						// Minimum Value required
						if(qualifyingEvent.valueMin != 0){
							campaignEventQuery.push({'>=':qualifyingEvent.valueMin});
						}
						
						
						console.log("qualifying event query:",{eventValue:campaignEventQuery});
						
						PlayerToGameEvent.find({eventValue:campaignEventQuery}).exec(function(err,created){
							console.log("err",err);
							console.log("created",created);
						});
						
						console.log("this is someshit:",someshit);
						
					});
				
				});
				
			}catch(err){
				sails.log.error("Failed to process reward campaign game events against player events on cron task: ",err);
			}
		
		}
	},

};
