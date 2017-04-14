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
    // cache result
  },
  'getCurrencyPosition': function(currency) {
    var apiUrl = 'https://api.coinmarketcap.com/v1/ticker/' + currency + '/?convert=AUD'
    // return result from cache
    return HTTP.get(apiUrl).data;
  }
});
