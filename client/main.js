import {
  Template
} from 'meteor/templating';
import {
  ReactiveVar
} from 'meteor/reactive-var';
import {
  ReactiveDict
} from 'meteor/reactive-dict';
import {
  Mongo
} from 'meteor/mongo';
import {
  Session
} from 'meteor/session'

import numeral from 'numeral/numeral'

import tether from 'tether';

import './main.html';

global.Tether = tether;
bootstrap = require('bootstrap');

class CryptoCurrency {
  constructor(name, abbr, amount, purchaseCost) {
    this.name = name;
    this.abbr = abbr;
    this.amount = amount;
    this.purchaseCost = purchaseCost;
  }

  netPosition() {
    return this.currentPurchasePriceFor(this.amount) - this.purchaseCost
  }

  avgPaidPricePerCoin() {
    return this.purchaseCost / this.amount;
  }

  currentPurchasePriceFor(amnt) {
    return this.currentPosition.price_aud * amnt
  }

  currentPurchasePrice() {
    return this.currentPurchasePriceFor(1)
  }
}

allCoins = [
  new CryptoCurrency('Dash', "DSH", 160.09782069, 18150),
  new CryptoCurrency('Ethereum', "ETH", 26.15062761, 1000),
  new CryptoCurrency('Nxt', "NXT", 88308.16031921, 1500),
  new CryptoCurrency('Monero', "XMR", 98.82527705, 2400),
  new CryptoCurrency('Ark', "ARK", 1976, 150)
]

totalInvestment = allCoins.reduce((acc, coin) => {
  return parseFloat(acc) + parseFloat(coin.purchaseCost);
}, 0)

function updateTemplate(self) {
  totalNet = 0.0
  updatedCoin = 0

  function valueClass(value) {
    return value > 0 ? "positive" : "negative"
  }

  function valueIconClass(value) {
    return value > 0 ? "zmdi-trending-up" : "zmdi-trending-down"
  }


  allCoins.forEach(coin => {
    Meteor.call('getPosition', coin.name, function(err, res) {
      updatedCoin++;
      if (res != undefined && res.length > 0) {
        coin.currentPosition = res[0];
        var net = parseFloat(coin.netPosition());
        var delta24H = coin.currentPosition.percent_change_24h / 100.0
        self.find('#net-position-' + coin.name).innerHTML = numeral(net).format('+0,0.000')
        self.find('#position-' + coin.name).innerHTML = numeral(delta24H).format('0,0.00%')
        self.find('#bkeven-price-' + coin.name).innerHTML = numeral(coin.avgPaidPricePerCoin()).format('0,0.000')
        self.find('#amount-' + coin.name).innerHTML = numeral(coin.amount).format('0,0.00')
        self.find('#capital-' + coin.name).innerHTML = numeral(coin.amount * coin.avgPaidPricePerCoin()).format('0,0.00')

        self.find('#price-' + coin.name).innerHTML = numeral(coin.currentPurchasePrice()).format('0,0.000')
        self.find('#portfolio-' + coin.name).innerHTML = numeral(coin.purchaseCost / totalInvestment).format('0,0.00%')

        self.find('#net-pos-container-' + coin.name).classList.add(valueClass(net))
        self.find('#pos-container-' + coin.name).classList.add(valueClass(coin.currentPosition.percent_change_24h))

        self.find('#net-pos-container-' + coin.name + ' i').classList.add(valueIconClass(net))
        self.find('#pos-container-' + coin.name + ' i').classList.add(valueIconClass(delta24H))
        self.find('#pos-container-' + coin.name + ' i').classList.add(valueIconClass(delta24H))

        totalNet = parseFloat(totalNet) + net;
        if (updatedCoin == allCoins.length) {
          self.find('#total-net-pos').innerHTML = numeral(totalNet).format('+0,0.000')
          self.find('#total-net-pos').classList.add(valueClass(totalNet))
          //FIXME: this should be outside this function, but it appears template is not rendered at the time rendered function is called hence the dom element is not foun
          self.find('#total-investment').innerHTML = numeral(totalInvestment).format('0,0.000')
        }

      }
    })
  });
}

Template.body.helpers({
  coins: allCoins
})

Template.body.rendered = function() {
  var self = this;

  updateTemplate(self)

  setInterval(function() {
    updateTemplate(self)
  }, 120000);
}
