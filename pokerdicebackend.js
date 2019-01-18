var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
const ecc = require('eosjs-ecc');
const md5 = require('js-md5');
const { Api, JsonRpc, RpcError, JsSignatureProvider } = require('eosjs');
const {CommonDefine} = require('./CommonDefine');
const fs = require('fs');
const fetch = require('node-fetch');                            // node only; not needed in browsers
const {TextEncoder,TextDecoder} = require('util')               // node only; native TextEncoder/Decoder 

const BigNumber = require('bignumber.js');
//const signatureProvider = new JsSignatureProvider(["5HqheRyLmnonjgn1114mkjgCxuQzF4wmBJPf4w2qUqFx2BJkDEK"]);
var rpc = null;
var api = null;
const CONTRACT_NAME = "yyhoho425aaa";
const CALLER_ACT = "yyhoho425aaa";

var PrivateKey = "5J3mN1wasU87JpMMVp3uoPYocfciV6eXCXgy61FdkEfRGBsHm1g";
var bet_ratio = {'1': 13, '2':13,'3':13,'4':13,'5':13,'6':13,'7':13,'8':13,'9':13,'0':13,'J':13,'Q':13,'K':13,
	'B':2,'R':2,'D':4,'C':4,'H':4,'S':4,'O':40};
var chipToBetTable = {'1':1,'2':2,'3':5,'4':10};
init();
server.listen(3000);
app.get('/',function(req,res){
	res.send('hello')
});
io.on('connection',function(socket){
	console.log('connection');
	socket.on('message',function(data){

		console.log(data);
		var res = dataparse(data);


	});

});


function init() {
	let cfgRawdata = fs.readFileSync('config.json');  
	let cfgData = JSON.parse(cfgRawdata);
	var bpURL = cfgData.bpurl;
	rpc = new JsonRpc('https://'+bpURL, { fetch });
//	api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

	betLimits = cfgData.tokenLimits;
	pub_key = cfgData.pub_key;
}


function dataparse(data){
	var bet_data = data;
	var seed = bet_data.userseed;
	console.log(seed);
	var bet_cards = bet_data.bet_cards;
	console.log(bet_cards);
	var bet_value = bet_data.bet_value;
	console.log(bet_value);
	var uid = bet_data.uid;
	console.log(uid);
	var encodedName = new BigNumber(CommonDefine.encodeName(uid, false));
	retryFetchContractData(5, encodedName, (pdPoolInfo)=>{
		var nonce = pdPoolInfo.nonce;
		if(bet_cards != pdPoolInfo.bet_cards){

			console.log("error!"+pdPoolInfo.bet_cards);
			return;
		}
		if(bet_value != pdPoolInfo.bet_value){
			console.log("error!"+pdPoolInfo.bet_value);
			return;
		}
		var seedString = uid + nonce +"_"+seed+"_PD";
		var signedSeedString = ecc.sign(seedString,PrivateKey);
		console.log("sss is "+signedSeedString);
		var digests= md5.digest(signedSeedString);
		var card = digests[0]%53+1;
		console.log(card);
		var totalwin = getResult(card,bet_cards,bet_value,bet_ratio);
		console.log(totalwin);
		io.emit('news',totalwin);
	});
}

function getResult(card,bet_cards,bet_value,bet_ratio){
	var i = 0;
	var j = 0;
	var totalwin = 0;
	var winres = {};
	while(i!=bet_cards.length){
		var onecard = bet_cards.substring(i,i+1);
		i+=1;
		var onevalue = bet_value.substring(j,j+1);
		j+=1;
		console.log(onecard);
		console.log(onevalue);
		var res = compareCard(card,onecard);
		if(res){
			winres[onecard] = chipToBetTable[parseInt(onevalue,10)]*bet_ratio[onecard];
			totalwin += chipToBetTable[parseInt(onevalue,10)]*bet_ratio[onecard];
		}else{
			winres[onecard] = 0;
		}
		console.log(totalwin);
	}
	winres['totalwin'] = totalwin;
	winres['card'] = card;
	return winres;
}
function compareCard(card,onecard){
	if(onecard == 'B' && card > 26){
		return true;
	}
	if(onecard == 'R' && card <= 26){
		return true;
	}
	if(onecard == 'H' && card <=13 && card >=1){
		return true;
	}
	if(onecard == 'D' && card <=26 && card >= 14){
		return true;
	}
	if(onecard == 'S' && card >= 27 && card <= 39){
		return true;
	}
	if(onecard == 'C' && card >= 40 && card <= 52){
		return true;
	}
	if(onecard == 'O' && card == 53){
		return true;
	}
	if(onecard == '0' && card % 13 == 10){
		return true;
	}
	if(onecard == 'J' && card %13 == 11){
		return true;
	}
	if(onecard == 'Q' && card %13 ==12){
		return true;
	}
	if(onecard =='K' && card %13 == 0){
		return true;
	}
	var toNum = parseInt(onecard,10);
	if(toNum != NaN && toNum>=1&&toNum<=9){
		if(toNum===card%13&&card!=53){
			return true;
		}
	}
	return false;
}

function delay(t, v){
	return new Promise(function(resolve) { 
		setTimeout(resolve.bind(null, v), t)
	});
}
async function retryFetchContractData(retryTimes,encodedName,callback) {
	if (retryTimes > 0) {
		//logger.info(`${process.pid} fetch contract data time: ${retryTimes} ${expActions}`);
		//console.log("retryFetchContractData:", reqMsg, encodedName, expActions, CONTRACT_NAME);
		try {
			var ctrData = await rpc.get_table_rows({"json": true, "table_key": "owner", "code": 
				CONTRACT_NAME, "scope": CONTRACT_NAME, "table": 'pdpools1',
				"lower_bound": encodedName.toString(), "upper_bound": encodedName.plus(1).toString()});
			console.log(ctrData);
			if (ctrData.rows.length > 0) {

				console.log("contract data:", ctrData.rows);
				console.log(retryTimes);
				if (callback) {
					callback(ctrData.rows[0]);
				}

			} else {
				console.log("retry");
				console.log(retryTimes);
				delay(2000).then(()=>{
					retryFetchContractData(retryTimes-1, encodedName, callback);
				});
			}
		}
		catch (err) {
			var errInfo = JSON.stringify(err);
			console.log(errInfo);
			//	logger.info(`fetch player info from bjpools exception: ${errInfo}`);
		}            
	} else {
		console.log("out of time");
		//logger.warn(`${process.pid} fetch contract data failed with retry`);
		//CommonDefine.sendMsgToPlayer(reqMsg.D.UID, ws, -1, reqMsg.R, "contract data not available");
	}
}
function dealReceipt(uid, cardsInfo, callback) {

	(async () => {
		try {
			const result = await api.transact({
				actions: [{
					account: CALLER_ACT,
					name: 'bjreceipt',
					authorization: [{
						actor: CALLER_ACT,
						permission: 'active',
					}],
					data: {
						game_id: guid,
						player: uid,
						game: "Blackjack",
						seed: cardsInfo.nonce +"_"+cardsInfo.seed+"_BLK",
						dealer_hand: strDealerCards,
						player_hand1: strPlayerCards01,
						player_hand2: strPlayerCards02,
						bet: ((cardsInfo.bet01 + cardsInfo.bet02)/10000.0).toFixed(4)+" "+cardsInfo.symbol,
						win: ((cardsInfo.betwin01 + cardsInfo.betwin02)/10000.0).toFixed(4)+" "+cardsInfo.symbol,
						insure_bet : (cardsInfo.insurance/10000.0).toFixed(4)+" "+cardsInfo.symbol,
						insure_win : (cardsInfo.insurancewin/10000.0).toFixed(4)+" "+cardsInfo.symbol,
						betnum : cardsInfo.bet01 + cardsInfo.bet02,
						winnum : cardsInfo.betwin01 + cardsInfo.betwin02,
						insurance : cardsInfo.insurance,
						insurance_win : cardsInfo.insurancewin,
						token : cardsInfo.symbol,
						actions: cardsInfo.actions,
						pub_key: pub_key
					},
				}]
			}, {
				blocksBehind: 3,
				expireSeconds: 30,
			});

			if (callback) {
				callback(result);
			}                                
		} catch(e) {
			logger.error(`${process.pid} dealreceipt ${uid} error`);
		}
	})();
}



