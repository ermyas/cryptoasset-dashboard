import {
  Meteor
} from 'meteor/meteor';

import {
  HTTP
} from 'meteor/http'

Assets = new Mongo.Collection('assets');

Meteor.methods({
  'listCurrencies': function() {
    var apiUrl = 'https://api.coinmarketcap.com/v1/ticker/'
    return HTTP.get(apiUrl).data;
    //TODO cache result
  },
  'getCurrencyPosition': function(currency) {
    var apiUrl = 'https://api.coinmarketcap.com/v1/ticker/' + currency + '/?convert=AUD'
    //TODO use cached data
    return HTTP.get(apiUrl).data;
  }
});
