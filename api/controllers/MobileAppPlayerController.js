/**
 * MobileAppPlayerController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

	
	/**
	* Get players dashboard
	*/
	async getPlayerDashboard(req, res) {
	
	},
	
	
	/**
	* Sign Up New Player
	*/
	async signupPlayer(req, res) {
	
        try {
            let email = req.param("email"),
				password = req.param("password");

            let existingUser = await User.findOne({email: email});

			// User already exists
            if(existingUser){
				throw new CustomError('This email is already registered with another account. Please login to your account.', {status: 400});
            }
			
			// Create activation PIN
			let pin = randomFixedInteger(6);
			
			// Create new user account
			// AccountStatus: 0 = blocked, 1 = pending activation, 2 = activated
			let user = await User.create({
				email: userParams.email,
				password: password,
				pin: pin,
				accountStatus:1
			});
			
			// Create the users wallet
			WalletService.createUserWallet(user.id).catch(err=>{sails.log.error('On signup, failed to create user wallet: ', err)});
			
			let msg = `Welcome to RaidParty!<br />
				Your account has been created and is now awaiting your activation. Please enter the 6 digit PIN below into the PIN activation screen on your account.<br /><br />
				<strong>${pin}</strong><br /><br />
				Keep calm, keep playing<br />
				The RaidParty success team`;
			
			// Send activation email/SMS to player to activate their account
			await EmailService.sendEmail({
                fromEmail: 'team@raidparty.io',
                fromName: 'Success Team',
                toEmail: user.email,
                toName: user.email,
                subject: 'Welcome to RaidParty! Activate your account to start earning rewards',
                body: msg
            })
			
			return res.ok({
                msg: 'Please check your inbox and activate your account',
                success: true,
            });

        } catch(err) {
            return util.errorResponse(err, res);
        }
	},
	

	
	/**
	* Login Player
	*/
	async loginPlayer(req, res) {
		try {
            let email = req.param("email"),
				password = req.param("password");

            let user = await User.findOne({email: email});

			// User already exists
            if(user){
				throw new CustomError('This email is already registered with another account. Please login to your account.', {status: 400});
            }
			
			// User is activated - try to login
			if(user.accountStatus == 2){
				// Check password matches
				let isValidPassword = await user.validatePassword(password);
				
				// Invalid password entered
				if(!isValidPassword){
					sails.log.debug("MobileAppPlayerController.loginPlayer: invalid password given by user.");
					throw new CustomError('Could not find an account with those details. Please check your details and try again.', {status: 401});
				}
				
				const rsp = {
					user: user,
					token: jwToken.issue({
					  user: user.toJSON()
					}, "60 days")
				};
				
				return res.ok(rsp);
			}
			
			// User is blocked
			if(user.accountStatus == 0){
				throw new CustomError('Your account has been blocked. Please contact us if you feel this is in error.', {status: 403});
			}
			
			// User has not activated their account
			if(user.accountStatus == 1){
				throw new CustomError('Your account has not yet been activated. Please check your email for a PIN code and enter to activate your account.', {status: 401});
			}
			
			
        } catch(err) {
            return util.errorResponse(err, res);
        }
	},
	
	
	/**
	* Activate Player Account - using PIN
	*/
	async activatePlayer(req, res) {
	
	},
	
	
	/**
	* Reset Password - forgot their password
	*/
	async resetPassword(req, res) {
	
	},
	
	
	/**
	* Validate a PIN issued
	*/
	async validatePin(req, res) {
	
	},
	
	
	/**
	* Change password after reset request made
	*/
	async changePassword(req, res) {
	
	},


	/**
	* Update players password when logged in
	*/
	async updatePassword(req, res) {
	
	},
};
