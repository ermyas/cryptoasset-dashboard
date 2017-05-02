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
import './plot-dialog.html'

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
    // LATER WE SHOULS SIMPLY START STORING THE SYMBOL!
    Meteor.call('listCurrencies', function(err, res) {
        if (res != undefined && res.length > 0) {
            res.forEach(x => {
                if (myAssets[x.id] != undefined) {
                    myAssets[x.id].symbol = x.symbol;
                }
            });
        }
    });
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
          var capital = coin.amount * coin.avgPaidPricePerCoin();
          var delta1H = coin.currentPosition.percent_change_1h / 100.0
          var delta24H = coin.currentPosition.percent_change_24h / 100.0
          context.find('#net-position-' + coin.name).innerHTML = numeral(net).format('$0,0.00')
          context.find('#position-1hr-' + coin.name).innerHTML = numeral(delta1H).format('0,0.00%')
          context.find('#percent-position-' + coin.name).innerHTML = numeral(net/capital).format('0,0.00%')
          context.find('#position-24hr-' + coin.name).innerHTML = numeral(delta24H).format('0,0.00%')
          context.find('#bkeven-price-' + coin.name).innerHTML = numeral(coin.avgPaidPricePerCoin()).format('$0,0.00')
          context.find('#amount-' + coin.name).innerHTML = numeral(coin.amount).format('0,0.00')
          //context.find('#symbol-' + coin.name).innerHTML = coin.currentPosition.symbol
          context.find('#capital-' + coin.name).innerHTML = numeral(capital).format('$0,0.00')

          context.find('#price-' + coin.name).innerHTML = numeral(coin.currentPurchasePrice()).format('$0,0.00')
          context.find('#portfolio-' + coin.name).innerHTML = numeral(coin.purchaseCost / totalInvestment).format('0,0.00%')

          context.find('#net-pos-container-' + coin.name).classList.add(valueClass(net))
          context.find('#pos-1hr-container-' + coin.name).classList.add(valueClass(coin.currentPosition.percent_change_1h))

          context.find('#net-pos-container-' + coin.name + ' i').classList.add(valueIconClass(net))
          context.find('#pos-1hr-container-' + coin.name + ' i').classList.add(valueIconClass(delta1H))
          context.find('#pos-1hr-container-' + coin.name + ' i').classList.add(valueIconClass(delta1H))

          context.find('#percent-pos-container-' + coin.name).classList.add(valueClass(net/capital))
          context.find('#pos-24hr-container-' + coin.name).classList.add(valueClass(coin.currentPosition.percent_change_24h))

          context.find('#percent-pos-container-' + coin.name + ' i').classList.add(valueIconClass(net))
          context.find('#pos-24hr-container-' + coin.name + ' i').classList.add(valueIconClass(delta24H))
          context.find('#pos-24hr-container-' + coin.name + ' i').classList.add(valueIconClass(delta24H))

          totalNet = parseFloat(totalNet) + net;
          if (updatedCoin == myAssets.length) {
            context.find('#total-net-pos').innerHTML = numeral(totalNet).format('$0,0.00')
            context.find('#total-net-pos').classList.add(valueClass(totalNet))
            context.find('#percent-net-pos').innerHTML = numeral(totalNet/totalInvestment).format('0,0.00%')
            context.find('#percent-net-pos').classList.add(valueClass(totalNet/totalInvestment))
            //FIXME: this should be outside this function, but it appears template is not rendered at the time rendered function is called hence the dom element is not foun
            context.find('#total-investment').innerHTML = numeral(totalInvestment).format('$0,0.00')
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
    }).sort((a,b) => a.name.localeCompare(b.name));
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
    'click .card-title' (event) {
        var asset = myAssets[event.currentTarget.id];
        var layout = {
            title: asset.name + " (" + asset.symbol + ")",
            width: 550, height:250,
            margin: { t: 40, l: 60, b: 40, r: 40 },
            yaxis: {
                title: "Price (AUD)"
            }
        };
        $("#plot-loading")[0].style.visibility = "visible";
        $("#plot")[0].style.visibility = "hidden";
        Meteor.call('getCurrencyHistory', asset.symbol, function(err, res) {
            var data = [{
                type: 'scatter', mode: 'lines', line: { width: 1 },
                x: res.Data.map(point => new Date(1000*point.time)),
                y: res.Data.map(point => 0.5*(point.open + point.close))
            }];
            Plotly.newPlot($('#plot')[0], data, layout);
            $("#plot-loading")[0].style.visibility = "hidden";
            $("#plot")[0].style.visibility = "visible";
        });
    },
  'click .card-body' (event) {
    var obj = myAssets[event.currentTarget.id]
    $("#asset-name")[0].value = obj.name
    $("#asset-name")[0].disabled = true
    $("#qty")[0].value = obj.amount
    $("#total-price")[0].value = obj.purchaseCost
    $("#delete")[0].style.visibility = "visible"
  },
  'click .add-container-btn' (event) {
    var obj = myAssets[event.currentTarget.id]
    $("#asset-name")[0].disabled = false
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
