/**
 * PagesController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */


module.exports = {


	/**
	* Return the home page
	*/
	getHomePage: function (req, res) {
		return res.view('public/home', {
			layout: 'public/layout',
			title: 'RaidParty',
			metaDescription: '',
		});
    },
	
	
	/**
	* Submit the subscribe
	*/
	async postSubscribe (req, res) {
	
		let firstName = req.param('firstName'),
		lastName = req.param('lastName'),
		email = req.param('email'),
		locale = req.param('locale');
		
		if(!firstName){
			firstName = '';
		}
		
		if(!lastName){
			lastName = '';
		}
		
		if(!locale){
			locale = 'en';
		}
		
		if(!email){
			throw new CustomError('An invalid email was provided.', {status: 400});
		}
		
		let addSubscriber = await Subscribers.findOrCreate({email:email},{firstName:firstName,lastName:lastName,email:email,locale:locale});
		
		if(!addSubscriber){
			throw new CustomError('Could not subscribe you at this stage. Please try again later.', {status: 400});
		}
		
		/** Add to normal subscriber list **/
		MailchimpService.addSubscriber("bb2455ea6e", email, firstName, lastName, "pending",locale).then(function(addResponse){
		}).catch(function(err) {
			sails.log.debug("new subscriber not added due to error: ", err);
		});
		
		return res.ok({
			success: true,
		});
    },
	
	
	
	
	/**
	* Insert airdrop users from tft database
	*/
	async addAirdropUsers(req, res) {
		
		let playerCode = '',
		password = '';
		
		try {
	
			/**
			let usersPromise = new Promise(function(resolve,reject){
				Game.query("SELECT a.id, a.email, a.reward, a.createdAt, a.updatedAt FROM triforcetokens_live.airdropusers AS a",function(err,users){
					if(err){
						return reject(err);
					}else{
						return resolve(users);
					}
				});
			});
			*/
			
			let users = await new Promise(function(resolve,reject){
				Game.query("SELECT a.id, a.email, a.reward, a.createdAt, a.updatedAt FROM triforcetokens_live.airdropusers AS a",function(err,users){
					if(err){
						return reject(err);
					}else{
						return resolve(users);
					}
				});
			});
			
			// Get existing users
			for(const user of users){
				
				sails.log.debug("going throuig this user: ",user);
				playerCode = util.getPlayerGameCode(7);
				password = util.getPlayerGameCode(8);
				
				// Make sure player does not exist
				let playerExists = await Player.findOne({email:user.email});
				
				if(playerExists){
					continue;
				}
			
				let createdPlayer = await Player.create({email:user.email,deviceType:'unknown',deviceId:'',accountStatus:2,password:password,code:playerCode,forceBalance:user.reward,createdAt:user.createdAt,updatedAt:user.updatedAt});
						
				let playerUpdated = await new Promise(function(resolve,reject){
					Player.query("UPDATE triforcetokens_live.airdropusers AS a SET a.tempPassword = '" + password + "' WHERE a.id = " + user.id,function(err,users){
						if(err){
							return reject(err);
						}else{
							return resolve(users);
						}
					});
				});
			}
		}
		catch(err){
			sails.log.debug("error for this is:",err);
		}
		
		return res.view('public/home', {
			layout: 'public/layout',
			title: 'RaidParty',
			metaDescription: '',
		});
    },

};
