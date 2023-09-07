"use strict";

// asset-input/quote-aggregator/app.js
var { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
var { unmarshall } = require("@aws-sdk/util-dynamodb");
var { SFNClient, SendTaskSuccessCommand } = require("@aws-sdk/client-sfn");
var dynamodb = new DynamoDBClient({ apiVersion: "2012-08-10" });
var sfn = new SFNClient();
var mortgageQuotesTable = process.env.MORTGAGE_QUOTES_TABLE;
var quoteRequestComplete = (amountQuotes) => amountQuotes >= 2;
var createAppendQuoteUpdateItemCommand = (tableName, id, quote) => new UpdateItemCommand({
  TableName: tableName,
  Key: { Id: { S: id } },
  UpdateExpression: "SET #quotes = list_append(if_not_exists(#quotes, :empty_list), :quote)",
  ExpressionAttributeNames: {
    "#quotes": "quotes"
  },
  ExpressionAttributeValues: {
    ":quote": {
      L: [
        {
          M: {
            bankId: { S: quote["bankId"] },
            rate: { N: quote["rate"].toString() }
          }
        }
      ]
    },
    ":empty_list": { L: [] }
  },
  ReturnValues: "ALL_NEW"
});
exports.handler = async (event) => {
  console.info("Received event:", JSON.stringify(event, null, 4));
  console.info("Processing %d records", event["Records"].length);
  var persistedMortgageQuotes;
  for (record of event["Records"]) {
    console.debug(record);
    var quote = JSON.parse(record["body"]);
    console.info("Persisting quote: %s", JSON.stringify(quote, null, 4));
    var id = quote["id"];
    var taskToken = quote["taskToken"];
    var appendQuoteUpdateItemCommand = createAppendQuoteUpdateItemCommand(mortgageQuotesTable, id, quote);
    var dynamodbResponse = await dynamodb.send(appendQuoteUpdateItemCommand);
    console.debug(JSON.stringify(dynamodbResponse));
    console.debug(unmarshall(dynamodbResponse.Attributes));
    persistedMortgageQuotes = unmarshall(dynamodbResponse.Attributes);
  }
  console.info("Persisted %d quotes", persistedMortgageQuotes.quotes.length);
  if (quoteRequestComplete(persistedMortgageQuotes.quotes.length)) {
    console.info("Enough quotes are available");
    var sendTaskSuccessCommand = new SendTaskSuccessCommand({
      taskToken,
      output: JSON.stringify(persistedMortgageQuotes.quotes)
    });
    try {
      var response = await sfn.send(sendTaskSuccessCommand);
      console.debug(response);
    } catch (error) {
      console.error(error);
    }
  } else {
    console.info("Not enough quotes available yet");
  }
};
