"use strict";

// This Lambda function is available at:
// https://zipwhip.link/zwLink

/* 
you can POST application/json with 
{
    "sessionkey":"(your zipwhip valid sessionkey)",
    "accountPhoneNum":"+12065823770",
    "toPhoneNum":"+18559479446",
    "longUrl":"http://example.com/asdf-asdf-asdf.jpg"
}
we return a shortened url
{
    "success":true,
    "shortUrl":"https://zipwhip.link/xY9f42b",
}
or err
{
    "success":false,
    "err":"Your sessionkey appears to not match your account phone number."
}
*/

const AWS = require("aws-sdk");
AWS.config.update({ region: 'us-west-2' })

// Initialising the DynamoDB SDK
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });

exports.handler = async(event) => {

    console.log("zwLink event:", typeof(event), event);

    let action = null;
    let err = null;
    let body = null;
    let path = null;
    if (event && event.path) path = event.path;

    // if we are called directly as a lambda we just
    // get an object. if we get posted from API gateway
    // we'll have an httpMethod so we can tell
    if (event == null) return getError(result, "Error event was null.");
    if (event && 'httpMethod' in event && event.body) {
        body = event.body;
    }
    else {
        body = event;
    }

    var result = {
        "statusCode": 200,
        "isBase64Encoded": false,
        "headers": {
            "Access-Control-Allow-Origin": "*"
        },
        "body": JSON.stringify({
            "success": false,
            "err": "Your return val never got set. Huh?",
        })
    };

    if (body == null) return getError(result, "Error body was null.");

    if (typeof(body) == "object") {
        // we are already a parsed object
        console.log("body is already an object");
    }
    else {
        // we need to try to parse
        try {
            body = JSON.parse(body);
            console.log("was able to parse body:", body);
        }
        catch (e) {
            return getError(result, "Error parsing JSON. " + e.message);
        }
    }

    if (!body.sessionkey) return getError(result, "Error JSON did not contain sessionkey.");
    if (!body.accountPhoneNum) return getError(result, "Error JSON did not contain accountPhoneNum.");
    if (!body.toPhoneNum) return getError(result, "Error JSON did not contain toPhoneNum.");
    if (!body.longUrl) return getError(result, "Error JSON did not contain longUrl.");

    // if we get here we have our values
    action = "createTinyUrl"

    // see if they want a password
    let password = null;
    if (body.isPasswordProtected) {
        let len = 4;
        if (body.passwordLength) len = body.passwordLength;
        password = getRandomPasswordNumeric(len);
        console.log("they wanted password protect. password:", password);
    }
    
    // see if expires
    if (body.expireSeconds) {
        console.log("they want expire seconds:", body.expireSeconds);
    }

    // TODO: double check with zipwhip that acct phone number matches the sessionkey
    // trust accountPhoneNum as being real for now

    let randString = getRandomString(8);
    
    switch (action) {
        case 'createTinyUrl':
            // var dbRet = await scanTable();
            var dbRet = await writeToDb(randString, body.longUrl, body.sessionkey, body.accountPhoneNum, body.toPhoneNum, body.isPasswordProtected, body.passwordLength, password, body.expireSeconds);
            if (dbRet.success) {
                // good to go
            }
            else {
                // had err
                return getError(result, "Got error writing to db:" + dbRet.err);
            }
            break;
        case 'error':
            result = getError(err);
            break;

        default:
            return getError(result, "got an action not familiar with. action:" + action);
    }

    
    result.body = JSON.stringify({
        // lambdaFunc: "zwLink",
        // path: path,
        randString: randString,
        tinyUrl: "https://zipwhip.link/" + randString,
        longUrl: body.longUrl,
        sessionkey: body.sessionkey,
        accountPhoneNum: body.accountPhoneNum,
        toPhoneNum: body.toPhoneNum,
        // action: action,
        isPasswordProtected: body.isPasswordProtected,
        passwordLength: body.passwordLength,
        password: password,
        expireSeconds: body.expireSeconds,
    });

    console.log('Result: ', result)
    // return result
    return new Promise((resolve, reject) => {
        resolve(result)
    })

};

const writeToDb = async function(randString, longUrl, sessionkey, accountPhoneNum, toPhoneNum, isPasswordProtected, passwordLength, password, expireSeconds) {

    console.log("writeToDb. randString:", randString, "longUrl:", longUrl);
    let ts = new Date().toISOString();
    const params = {
        TableName: "zwLink", // The name of your DynamoDB table
        Item: { // Creating an Item with a unique id and with the passed title
            id: randString,
        	accountAndToPhoneNumKey: accountPhoneNum + toPhoneNum, // this is a secondary index so can query later for analytics on these 2 fields
            longUrl: longUrl,
            accountPhoneNum: accountPhoneNum,
            toPhoneNum: toPhoneNum,
            sessionkey: sessionkey,
            createDate: ts,
            modifyDate: ts,
            hits: 0,
            lastHitDate: ts,
            lastHitUserAgent: "",
            isPasswordProtected: isPasswordProtected,
            passwordLength: passwordLength,
            password: password,
            expireSeconds: expireSeconds
        }
    };
    try {
        // Utilising the put method to insert an item into the table (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.01)
        const data = await documentClient.put(params).promise();
        const response = {
            success: true
        };
        return response; // Returning a 200 if the item has been inserted 
    }
    catch (e) {
        return {
            success: false,
            err: JSON.stringify(e)
        };
    }
}

const getRandomString = function(len) {

    // Will give you back a random string of chars
    const characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var ans = '';
    for (let i = len; i > 0; i--) {
        ans +=
            characters[Math.floor(Math.random() * characters.length)];
    }
    return ans;
}

const getRandomPasswordNumeric = function(len) {

    // Will give you back a random string of chars
    const characters = "0123456789";
    var ans = '';
    for (let i = len; i > 0; i--) {
        ans +=
            characters[Math.floor(Math.random() * characters.length)];
    }
    return ans;
}

const getError = function(ret, msg) {
    ret.body = JSON.stringify({
        "success": false,
        "err": msg,
    })
    console.log("Returning error:", msg);

    //return ret;
    return new Promise((resolve, reject) => {
        resolve(ret)
    })

}