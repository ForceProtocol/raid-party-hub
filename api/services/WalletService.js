

module.exports = {

    createUserWallet: async (userId)=>{
        let newBcWallet = await BlockchainService.createWallet();

        let wallet = await Wallet.create({
            address: newBcWallet.address,
            privateKey: newBcWallet.privateKey
        }).fetch();

        await UserWallet.create({user: userId, wallet: wallet.id});

        return await UserWallet.find({user: userId}).populate('wallet');
    },

    getUserWallet: async ()=> {

    },

    getBalance: (walletAddress)=> {
        if(!_.isString(walletAddress) || walletAddress.length !== 42)
            throw new CustomError('Invalid wallet address to process', {status: 400});
        return BlockchainService.getForceBalance(walletAddress);
    }
};