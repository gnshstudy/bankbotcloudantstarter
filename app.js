/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var watson = require('watson-developer-cloud'); // watson sdk

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

//reading database setup

var async = require('async');
var Cloudant = require('@cloudant/cloudant');
var cloudant = Cloudant({url: 'https://00c4b68b-4fb4-4ac7-8ad7-4821b5b221b9-bluemix:46db8d45e3e741afebf5e73701ad95166f7c09c363295cc2f376def3464638e7@00c4b68b-4fb4-4ac7-8ad7-4821b5b221b9-bluemix.cloudant.com'});

var dbname = 'retail';

var db = null;
var doc = null;

db = cloudant.db.use(dbname);

// Create the service wrapper

var assistant = new watson.AssistantV1({
  // If unspecified here, the ASSISTANT_USERNAME and ASSISTANT_PASSWORD env properties will be checked
  // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
  username: process.env.ASSISTANT_USERNAME || '<username>',
  password: process.env.ASSISTANT_PASSWORD || '<password>',
  version: '2018-02-16'
});

// Endpoint to be call from the client side
app.post('/api/message', function(req, res) {
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  var payload = {
    workspace_id: workspace,
    context: req.body.context || {},
    input: req.body.input || {}
  };

  // Send the input to the assistant service
  assistant.message(payload, function(err, data) {
    if (err) {
      return res.status(err.code || 500).json(err);
    }
    return res.json(updateMessage(payload, data));
  });
});

var accountBalanceIntentInput = {
  workspace_id: 'e5dd635c-b43c-4ee5-901f-2152ac749af0',
  intent: 'account_balance'
};

var accountTypeEntityInput = {
  workspace_id: 'e5dd635c-b43c-4ee5-901f-2152ac749af0',
  entity: 'account_type',
  value:any
};

var forEach = require('async-foreach').forEach;
assistant.getIntent(accountBalanceIntentInput, function(err, response) {
  if (err) {
    console.error(err);
  } else {
    console.log("Given intents is===>>>>"+JSON.stringify(response, null, 2));
    assistant.getValue(accountTypeEntityInput, function(err, response1) {
      if (err) {
        console.error(err);
      } else {
        console.log("Given Entity is===>>>>" + JSON.stringify(response1, null, 2));
        console.log("Reading document 'mydoc'");
        db.get('customeraccountdetails', function (err, data) {
          console.log('Error:', err);
          forEach(data.customer_account_details, function(item, index, arr) {
            if(item.customer_id==1)
            console.log("each====>>>>>", item, index);
          });
         /* for (i=0;i<data.customer_account_details.length;i++) {
            console.log("customer id=" + data.customer_account_details[i].customer_account_details_id);
            console.log("customer id=" + data.customer_account_details[i].customer_id);
            console.log("customer id=" + data.customer_account_details[i].account_type);
            console.log("customer id=" + data.customer_account_details[i].bal);
          }
          */
        });

      } 
    });
  } 
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Assistant service
 * @param  {Object} response The response from the Assistant service
 * @return {Object}          The response with the updated message
 */
function updateMessage(input, response) {
  
  var responseText = null;
  if (!response.output) {
    response.output = {};
  } else {
    return response;
  }
  if (response.intents && response.intents[0]) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different messages.
    // The confidence will vary depending on how well the system is trained. The service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
    // user's intent . In these cases it is usually best to return a disambiguation message
    // ('I did not understand your intent, please rephrase your question', etc..)
    if (intent.confidence >= 0.75) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if (intent.confidence >= 0.5) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text = responseText;
  return response;
}

module.exports = app;
