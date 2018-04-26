const oneSignal = require('onesignal-node');

const oneSignalClient = new oneSignal.Client({
	userAuthKey: sails.config.oneSignal.userAuthKey,
	app: { appAuthKey: sails.config.oneSignal.appAuthKey, appId: sails.config.oneSignal.appId }
})

module.exports = {
	/**
	 * Function to send push notification to multiple devices
	 * @param {object} options
	 * @param options.deviceIds - Array of DeviceIds to dend notifications to.
	 * @param options.text - Notification text to send
	 */

	sendNotificationsToMultipleDevices: (options) => {

		return new Promise((resolve, reject) => {

			if (!options.deviceIds || options.deviceIds.length < 1) {
				return reject("Device Ids not specified.");
			}

			if (!options.text) {
				return reject("Notification text not specified");
			}

			const newNotification = new oneSignal.Notification({
				contents: {
					en: options.text
				}
			})

			if (!newNotification) {
				return reject("Error in creating notification");
			}

			newNotification.setTargetDevices(options.deviceIds);

			oneSignalClient.sendNotification(newNotification, function (err, httpResponse, data) {
				if (err)
					return reject(err);
				return resolve(data);
			});

		});
	},

}