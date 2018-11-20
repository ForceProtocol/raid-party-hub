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
	* Submit the contact form
	*/
	async contact(req, res) {

		try{
			let name = req.param('name'),
			email = req.param('email'),
			telephone = req.param('telephone'),
			message = req.param('message'),
			captcha = req.param('captcha');
			
			if(!name){
				name = '';
			}

			if(!captcha){
				throw new CustomError('You must complete the captcha box.', {status: 400});
			}
			
			if(!email){
				throw new CustomError('An invalid email was provided.', {status: 400});
			}

			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Support Team',
				toEmail: email,
				toName: name,
				subject: "Thank you for your enquiry",
				body: `You submitted a message to us at https://brands.raidparty.io regarding dynamic advertisement.<br />
					This is a notification that we have received your message and will be in touch soon.<br /><br />
					Kindest Regards<br />
					The RaidParty Team`
			});

			let emailMsg = `Their email: ${email}<br />
			Name: ${name}<br />
			Telephone: ${telephone}<br />
			Message: ${message}`;

			await EmailService.sendEmail({
				fromEmail: 'support@raidparty.io',
				fromName: 'Support Team',
				toEmail: 'pete@triforcetokens.io',
				toName: 'Pete',
				subject: "New brands.raidparty.io enquiry",
				body: emailMsg
			});

			return res.ok({
				success: true,
			});
		
		}
		catch(err){
			sails.log.debug("error for this is:",err);
			return res.error();
		}
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


    async getRegions(req,res){
    	try{
    		let regions = await Regions.find();

    		return res.ok(regions);
    	}catch(err){
    		sails.log.debug("PagesController.getRegions error: ",err);
    		return res.error();
    	}
    },



    async getClaimKey(req,res){
    	try{
    		let playerId = req.param("playerId");

    		let player = await Player.findOne({playerId:playerId});

    		if(player){
    			await Player.update({id:player.id},{keyClaimed:true});
    		}else{
    			return res.notFound();
    		}

    		sails.log.debug("player data is: ",player);

    		return res.ok(player.claimKey);
    	}catch(err){
    		sails.log.debug("PagesController.getClaimKey error: ",err);
    		return res.notFound();
    	}
    }

};
