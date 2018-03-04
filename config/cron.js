module.exports.cron = {

	artemisCheckIndividual: {
		schedule: '*/15 * * * *',  // every 5 minute

		onTick: function () {
		
			//ArtemisApiService.checkIndividualStatus();
		}
	},

};
