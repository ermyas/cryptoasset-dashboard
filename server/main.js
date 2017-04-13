import {
  Meteor
} from 'meteor/meteor';

import {
  HTTP
} from 'meteor/http'

Meteor.startup(() => {
  // code to run on server at startup
});

Meteor.methods({
  'getPosition': function(currency) {
    var apiUrl = 'https://api.coinmarketcap.com/v1/ticker/' + currency + '/?convert=AUD'
    return HTTP.get(apiUrl).data;
  }
});
