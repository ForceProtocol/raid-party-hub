/**
 * DynamicAdvertController
 *
 * @description :: Server-side logic for managing Pages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

	async connectGame(req,res){

		sails.log.debug("connecting to dynamic advert controller");

		if (!req.isSocket) {
			return res.badRequest();
		}

		try{
			let gameId = req.param("gameId"),
			gameAssetId = req.param("gameAssetId"),
			socketId = sails.sockets.getId(req);

			sails.sockets.join(req.socket, gameId + gameAssetId);

			return res.ok({connected:true});
		}catch(err){
			sails.log.error("websocket connection request error: ",err);
			return res.serverError(err);
		}
	},


	async testConnectGame(req,res){
		try{
			return res.view('test/dynamicAdvertTest', {
				layout: 'test/layout'
			});
		}catch(err){
			sails.log.error("websocket connection request error: ",err);
			return res.serverError(err);
		}
	},


	
};
