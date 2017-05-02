import {
  Meteor
} from 'meteor/meteor';

import {
  HTTP
} from 'meteor/http'

Assets = new Mongo.Collection('assets');
//https://min-api.cryptocompare.com/data/histominute?tsym=AUD&fsym=BTC
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
    },
    'getCurrencyHistory': function(currency) {
        var apiUrl = 'https://min-api.cryptocompare.com/data/histominute?fsym=' + currency + '&tsym=AUD'
        //TODO use cached data
        return HTTP.get(apiUrl).data;
    }
});
