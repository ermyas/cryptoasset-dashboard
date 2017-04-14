import {
  Template
} from 'meteor/templating';
import {
  ReactiveVar
} from 'meteor/reactive-var';
import {
  Mongo
} from 'meteor/mongo';

import numeral from 'numeral/numeral'

import tether from 'tether';

import './main-body.html';
import './asset-dialog.html'

global.Tether = tether;
bootstrap = require('bootstrap');

Meteor.startup(function() {
  Assets = new Mongo.Collection('assets');
});
myAssets = {}

class CryptoCurrency {
  constructor(id, name, owner, amount, purchaseCost) {
    this.id = id;
    this.name = name;
    this.owner = owner;
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

function getUser() {
  if (Meteor.user())
    return Meteor.user().services.google.email;
  return "";
}

function getMyAssets() {
  var assets = Assets.find({
    owner: getUser()
  }).fetch().map(x => new CryptoCurrency(x.id, x.name, x.owner, x.amount, x.purchaseCost));

  assets.forEach(x => {
    myAssets[x.id] = x
  })
  return assets;
}

function valueClass(value) {
  return value > 0 ? "positive" : "negative"
}

function valueIconClass(value) {
  return value > 0 ? "zmdi-trending-up" : "zmdi-trending-down"
}

function updateTemplate(context) {
  totalNet = 0.0
  updatedCoin = 0
  myAssets = getMyAssets()
  if (myAssets) {
    totalInvestment = myAssets.reduce((acc, coin) => {
      return parseFloat(acc) + parseFloat(coin.purchaseCost);
    }, 0)

    myAssets.forEach(coin => {
      Meteor.call('getCurrencyPosition', coin.id, function(err, res) {
        updatedCoin++;
        if (res != undefined && res.length > 0) {
          coin.currentPosition = res[0];
          var net = parseFloat(coin.netPosition());
          var delta24H = coin.currentPosition.percent_change_24h / 100.0
          context.find('#net-position-' + coin.name).innerHTML = numeral(net).format('$0,0.000')
          context.find('#position-' + coin.name).innerHTML = numeral(delta24H).format('0,0.00%')
          context.find('#bkeven-price-' + coin.name).innerHTML = numeral(coin.avgPaidPricePerCoin()).format('$0,0.000')
          context.find('#amount-' + coin.name).innerHTML = numeral(coin.amount).format('0,0.00')
          context.find('#capital-' + coin.name).innerHTML = numeral(coin.amount * coin.avgPaidPricePerCoin()).format('$0,0.00')

          context.find('#price-' + coin.name).innerHTML = numeral(coin.currentPurchasePrice()).format('$0,0.000')
          context.find('#portfolio-' + coin.name).innerHTML = numeral(coin.purchaseCost / totalInvestment).format('0,0.00%')

          context.find('#net-pos-container-' + coin.name).classList.add(valueClass(net))
          context.find('#pos-container-' + coin.name).classList.add(valueClass(coin.currentPosition.percent_change_24h))

          context.find('#net-pos-container-' + coin.name + ' i').classList.add(valueIconClass(net))
          context.find('#pos-container-' + coin.name + ' i').classList.add(valueIconClass(delta24H))
          context.find('#pos-container-' + coin.name + ' i').classList.add(valueIconClass(delta24H))

          totalNet = parseFloat(totalNet) + net;
          if (updatedCoin == myAssets.length) {
            context.find('#total-net-pos').innerHTML = numeral(totalNet).format('$0,0.000')
            context.find('#total-net-pos').classList.add(valueClass(totalNet))
            //FIXME: this should be outside this function, but it appears template is not rendered at the time rendered function is called hence the dom element is not foun
            context.find('#total-investment').innerHTML = numeral(totalInvestment).format('$0,0.000')
          }
        }
      })
    });
  }
}

Template.assetopt.created = function() {
  var template = Template.instance()
  this.currencyListing = new ReactiveVar([])
  Meteor.call('listCurrencies', function(err, res) {
    var all = res.map(x => {
      return {
        "name": x.name,
        "id": x.id,
        "symbol": x.symbol
      }
    })
    template.currencyListing.set(all);
  })
}
var bodyContext;
Template.assetopt.helpers({
  allCurrencies: () => {
    return Template.instance().currencyListing.get()
  }
})

Template.body.helpers({
  coins: function() {
    updateTemplate(bodyContext)
    return getMyAssets();
  }
})

Template.body.events({
  'click .asset-card' (event) {
    var obj = myAssets[event.currentTarget.id]
    $("#asset-name")[0].value = obj.name
    $("#qty")[0].value = obj.amount
    $("#total-price")[0].value = obj.purchaseCost
    $("#delete")[0].style.visibility = "visible"
  },
  'click .add-container-btn' (event) {
    var obj = myAssets[event.currentTarget.id]
    $("#qty")[0].value = 1
    $("#total-price")[0].value = 100
    $("#delete")[0].style.visibility = "hidden"
  },
  'click #delete' (event) {
    var assetName = $("#asset-name")[0]
    var selector = {
      id: assetName[assetName.selectedIndex].id,
      owner: getUser()
    }
    var f = Assets.findOne(selector)
    Assets.remove(f._id)
    $('#asset-dialog').modal('hide');
  },
  'click #save' (event) {
    var assetName = $("#asset-name")[0]
    var selector = {
      id: assetName[assetName.selectedIndex].id,
      owner: getUser()
    }
    var obj = {
      id: selector.id,
      owner: selector.owner,
      name: $("#asset-name")[0].value,
      amount: $("#qty")[0].value,
      purchaseCost: $("#total-price")[0].value,
      createdAt: new Date()
    }
    var f = Assets.findOne(selector)
    if (f)
      Assets.update(f._id, {
        $set: obj
      })
    else
      Assets.insert(obj)
    $('#asset-dialog').modal('hide');
  }
})

Template.body.rendered = function() {
  bodyContext = this;
  setInterval(function() {
    updateTemplate(bodyContext)
  }, 120000);
}
