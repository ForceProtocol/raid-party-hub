# hub.raidparty.io

a [Sails](http://sailsjs.org) application


// SHA1 example for track player
route:playerId:public_key:private_key
/sdk/player/track:409ZKEZ:2e44b8c5-ba2a-4436-ba63-4d3487ecaecb:c2162deb-060d-44fc-9f66-ce49c5b07d39
auth_key is: d21f8d1676c1ca265a95382315e6612222dee135

// SHA1 example for track event
route:playerId:eventId:public_key:private_key
/sdk/game/event:409ZKEZ:1:2e44b8c5-ba2a-4436-ba63-4d3487ecaecb:c2162deb-060d-44fc-9f66-ce49c5b07d39
auth_key is: a6139a8b8b0eea65a138715e2f1008e09f512c67


# Reward Campaign Types

1) Big Jackpot Entry, win once - between multiple players or one player
2) Instant win from pot, but claimed once
3) Instant win, claim multiple times but lockout period -> alert player they could claim new prize
4) Big jackpot entry, win once, have to complete event on specific days during campaign period