module.exports.cron = {

	emailPlayerQualifiers: {
		schedule: '*/15 * * * *',  // every 15 minute

		onTick: async function() {
		
			// Obtain list of reward events that are currently live
			let dateNow = new Date();
			
			let liveRewardCampaigns = await RewardCampaign.find({startDate: {'>=':dateNow},endDate: {'<=': dateNow}});
		
		}
	},

};
