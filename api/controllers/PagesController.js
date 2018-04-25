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
    }

};
