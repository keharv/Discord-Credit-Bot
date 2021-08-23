require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client();
const {MongoClient} = require('mongodb');
const TOKEN = "<enter discord auth key here>";

//database settings
const uri = "<enter mongodb uri here>"
const client = new MongoClient(uri);
const creditName = "coin";

const defaultBalance = 5;



async function createUser(userId) {
  try {
    await client.connect();
    var dbo = client.db("credit-system");
    var balance = await dbo.collection("users").insertOne( { "discord-id": userId, "balance": defaultBalance});
    balance = defaultBalance;
    console.log("user created: " + userId);
    return balance;
  
  } catch (e) {
      console.error(e);
  }
}


async function getBalance(userId) {
  //this function grabs the user's credit balance

  try {
    await client.connect();
    var dbo = client.db("credit-system");
    var balance = await dbo.collection("users").findOne({'discord-id':userId});
    try{
      balance = balance.balance;
    } catch (err) {
      //user doesn't exist.
      await createUser(userId);
      balance = defaultBalance;
    }

    return parseFloat(balance);
  
  } catch (e) {
      console.error(e);
  }

}

async function subAmount(userId, amount) {
  //this function subtracts given amount to userId
  try {
    await client.connect();
    var dbo = client.db("credit-system");
    var currentBalance = await getBalance(userId);
    var newBalance = currentBalance - parseFloat(amount);
    var balance = await dbo.collection("users").updateOne( { "discord-id": userId }, {$set: {"balance": newBalance}});
    balance = balance.balance;
    return balance;
  
  } catch (e) {
      console.error(e);
  }

}

async function addAmount(userId, amount) {
  //this function adds given amount to userId
  try {
    await client.connect();
    var dbo = client.db("credit-system");
    var currentBalance = await getBalance(userId);
    var newBalance = currentBalance + parseFloat(amount);
    var balance = await dbo.collection("users").updateOne( { "discord-id": userId, }, {$set: {"balance": newBalance}});
  
  } catch (e) {
      console.error(e);
  }
}

bot.login(TOKEN);

bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});

let entered_users = []

bot.on('message', async(msg) => {

  if (msg.content == ''){
    return;
  }

  let senderID = msg.author.id;

  if (msg.content === 'ping') {
    msg.reply('pong');
    //msg.channel.send('pong');

  } else if (msg.content.startsWith('!kick')) {
    if (msg.mentions.users.size) {
      const taggedUser = msg.mentions.users.first();
      msg.channel.send(`You wanted to kick: ${taggedUser.username}`);
    } else {
      msg.reply('Please tag a valid user!');
    }
    
  } else if (msg.content.startsWith('!balance')){
    //tell the user their balance.
    let balance = await getBalance(senderID);
    msg.reply("Your current balance is " + parseFloat(balance).toFixed(2) + " " + creditName + "s.");

  } else if(msg.content.startsWith('!roulette')) {
    //Russian Roulette command
    let betAmount = msg.content.split(" ", 2)[1]
    if(betAmount == "" || betAmount == undefined || betAmount == "0" || betAmount == null || isNaN(betAmount)) {
      msg.reply("You have entered an invalid bet amount.");
      return;
    }

    //convert bet amount to a float
    betAmount = parseFloat(betAmount);

    //amount to payout on win
    payoutRate = 0.166389351;
    let done = false;


    let userCurrentBalance = await getBalance(senderID);

    console.log(userCurrentBalance);
    //verify they have enough balance
    if(userCurrentBalance < betAmount) {
      msg.reply("You have insufficient funds for this bet. To get your current balance, do !balance.");
      return;
    }

    //do the math for the bet
    let rolled = Math.floor((Math.random()) * 6) + 1;
    console.log(rolled);
    if(rolled == 6) {
      //lose condition
      await subAmount(senderID, betAmount);
      msg.reply('BANG! You are shot and killed.');

    } else {
      //win condition
      winAmount = Math.ceil(parseFloat(betAmount) * parseFloat(payoutRate));
      await addAmount(senderID, winAmount);
      msg.reply('Click. You\'ve made it out.. this time.');
    }
  }
});
