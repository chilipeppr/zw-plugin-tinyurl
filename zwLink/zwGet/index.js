"use strict";

// This Lambda function is available at:
// https://zipwhip.link/xyzABC

// Meaning you can pass in the unique string
// and you'll get a redirect, or if you pass in
// JSON we'll give you the metadata

/* 
you can POST application/json with 
{
    "id":"xyzABC12"
}
we return the original url
{
    "success":true,
    "longUrl":"https://example.com/orignalUrl",
}
or err
{
    "success":false,
    "err":"The id did not have a match"
}
*/

const AWS = require("aws-sdk");
AWS.config.update({ region: 'us-west-2' })

// Initialising the DynamoDB SDK
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });

const useragent = require('useragent');

var uuid = require('uuid');

exports.handler = async(event) => {

    console.log("zwGet event:", typeof(event), event);
    
    let action = null;
    let err = null;
    let body = null;
    let path = null;
    if (event && event.path) path = event.path;

    var result = {
        "statusCode": 200,
        "isBase64Encoded": false,
        "headers": {
            "Access-Control-Allow-Origin": "*"
        },
        "body": {
            "success": false,
            "err": "Your return val never got set. Huh?",
        }
    };

    result.body = {
        success: true,
        // httpMethod: event.httpMethod,
        // resource: event.resource,
        // queryStringParameters: event.queryStringParameters,
        // body: {},
        // lambdaFunc: "zwGet",
        // path: path,
        // action: action,
        // version: 2,
    };

    // if we are called directly as a lambda we just
    // get an object. if we get posted from API gateway
    // we'll have an httpMethod so we can tell
    if (event == null) return getError(result, "Error event was null.");
    if (event && 'httpMethod' in event && event.httpMethod == "POST" && event.body) {
        
        if (typeof(event.body) == "object") {
            body = event.body;
            body.isFromEventBody = true;
        } else {
            body = {};
        }
        
        // see if they passed id in on querystring even though as post
        if (event.queryStringParameters && event.queryStringParameters.id) {
            body = {id: event.queryStringParameters.id};
            body.password = null;
            if (event.queryStringParameters && event.queryStringParameters.password) body.password = event.queryStringParameters.password;
            body.fromPostQueryStr = true;
        }
    } 
    else if (event && 'httpMethod' in event && event.httpMethod == "POST" && event.resource =="/{proxy+}") {
    
        // see if this is a post without id in json in body, but rather
        // in the url of zipwhip.link/xyzabc
        let id = event.path.replace(/^\//, "");
        body = {id: id};
        body.password = null;
        if (event.queryStringParameters && event.queryStringParameters.password) body.password = event.queryStringParameters.password;
        body.fromPostLinkPath = true;

    }
    else if (event && 'httpMethod' in event && event.httpMethod == "GET" && 'queryStringParameters' in event && event.queryStringParameters && event.queryStringParameters.id) {
        
        // we can get here with a normal GET with id=xyzABC
        body = {id: event.queryStringParameters.id};
        body.password = null;
        if (event.queryStringParameters && event.queryStringParameters.password) body.password = event.queryStringParameters.password;
        body.fromGetQueryStr = true;
    }
    else if (event && 'httpMethod' in event && event.httpMethod == "GET" && event.resource =="/{proxy+}") {

        // we can get here from the "resource":"/{proxy+}" where the id is in the path
        // which is a special config in the API gateway

        // the id is in "path":"/aoaCCjW2"
        // get rid of leading slash
        if (event.path && typeof(event.path) == "string") {
            let id = event.path.replace(/^\//, "");
            body = {id: id};
            body.password = null;
            if (event.queryStringParameters && event.queryStringParameters.password) body.password = event.queryStringParameters.password;
            body.fromGetLinkPath = true;
        } else {
            // if we get here its basically an error
            body = {
                id: "error",
                from: "should have been from path via proxy+ setting in API gateway",
            }
        }
    }
    else {
        body = event;
        body.fromLambdaExec = true;
    }

    // result.body.body = body;

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

    
    if (!body.id) return getError(result, "Error could not find id.");
    result.body.body = body;
    // result.body.body.id = body.id;
    // result.body.id = body.id;

    // if we get here we have our values
    action = "getTinyUrl"
    // result.body.action = action;

    let sourceIp;
    let userAgent;
    
    // headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36',
    // requestContext: { identity: { sourceIp: '98.247.231.139',
    // requestContext: { identity: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36',
    if (event.requestContext && event.requestContext.identity) {
        if (event.requestContext.identity.sourceIp) {
            sourceIp = event.requestContext.identity.sourceIp;
            console.log("found sourceIp:", sourceIp);
        }
        if (event.requestContext.identity.userAgent) {
            var agent = useragent.parse(event.requestContext.identity.userAgent);
            userAgent = agent.toJSON();
            console.log("found userAgent:", userAgent);
        }
    }

    switch (action) {
        case 'getTinyUrl':
            
            var dbRet = await getDb(body.id);
            if (dbRet.success) {
                // good to go
                result.body.longUrl = dbRet.data.longUrl;
                result.body.tinyUrl = "https://zipwhip.link/" + body.id;
                // result.body.data = dbRet.data;
                
                var dbUpdateRet = await updateThenGetLongUrlDb(body.id, sourceIp, userAgent);
                if (dbUpdateRet.success) {
                    console.log("Success updating db:", dbUpdateRet);
                } else {
                    console.error("Failed to update db:", dbUpdateRet);
                }
                
                // let's also write a log entry
                
                // see if there was an expiration time
                let isHasExpires = false;
                if (dbRet.data.expireSeconds && dbRet.data.expireSeconds > 0) isHasExpires = true;
                
                // see if we passed the expiration time
                let isWasExpired = false;
                let expireDateTime = null;
                if (isHasExpires) {
                    expireDateTime = new Date(dbRet.data.createDate);
                    expireDateTime.setSeconds(expireDateTime.getSeconds() + dbRet.data.expireSeconds);
                    // result.body.dateTimeNow = new Date().toISOString();
                    // result.body.dateTimeExpires = expireDateTime.toISOString();
                    if (expireDateTime < new Date()) {
                        isWasExpired = true;
                        result.body.longUrl = "(can't reveal since expired)";
                        result.body.success = false;
                    }
                }
                
                result.body.expiry = {
                    now: new Date().toISOString(),
                    expires: expireDateTime,
                    original: dbRet.data.createDate,
                    expireSeconds: dbRet.data.expireSeconds,
                    isHasExpires: isHasExpires,
                    isWasExpired: isWasExpired,
                }

                // result.body.isHasExpires = isHasExpires;
                // result.body.isWasExpired = isWasExpired;
                
                // see if there's a password
                let isHasPassword = false;
                let isProvidedAPassword = false;
                let isSuccessOnPassword = false;
                let isRedirectToPasswordEntryForm = false;
                if (dbRet.data.isPasswordProtected) {
                    isHasPassword = true;
                    console.log("has password");
                    
                    // if there's a password, we have to hide
                    // the long url if the password is wrong
                    if (body.password && body.password.length > 0) {
                        isProvidedAPassword = true;
                        
                        // see if password matches
                        if (body.password == dbRet.data.password) {
                            isSuccessOnPassword = true;
                        } else {
                            // password did not match
                            isRedirectToPasswordEntryForm = true;
                            result.body.longUrl = "(can't reveal until password is correct)";
                            result.body.success = false;
                            
                            // TODO: count amount of attempts
                            // and lock this item if too many attempts
                            // make sure to show error to viewer so they
                            // know to resend from scratch
                            
                        }
                    } else {
                        // they didn't even provide a password, so just give up
                        isRedirectToPasswordEntryForm = true;
                        result.body.longUrl = "(can't reveal until password is correct)";
                        result.body.success = false;
                    }
                    
                } else {
                    console.log("does NOT have password");
                }

                result.body.password = {
                    isPasswordProtected: isHasPassword,
                    // origPassword: dbRet.data.password,
                    providedPassword: body.password,
                    isProvidedAPassword: isProvidedAPassword,
                    isSuccessOnPassword: isSuccessOnPassword,
                    isRedirectToPasswordEntryForm: isRedirectToPasswordEntryForm,
                }
                
                var dbLogRet = await writeLogToDb(
                    body.id, sourceIp, userAgent, 
                    isHasExpires,
                    isWasExpired,
                    isHasPassword, 
                    isProvidedAPassword,
                    isSuccessOnPassword,  
                    isRedirectToPasswordEntryForm, 
                    1, 
                    body.password
                    )
                console.log("finishing writing log:", dbLogRet);
                
            }
            else {
                // had err
                return getError(result, "Got error reading from db:" + dbRet.err);
            }
            break;
        case 'error':
            result = getError(err);
            break;

        default:
            return getError(result, "got an action not familiar with. action:" + action);
    }
    
    // ok, now if this is a GET we will do a 302 redirect
    // otherwise we'll show the JSON
    if (event && event.httpMethod == "GET" && result.body.success) {
        result.statusCode = "302";
        // result.location = result.body.longUrl;
        result.body.isRedirect = true;
        result.headers.Location = result.body.longUrl;
        console.log("doing 302 redirect to url:", result.body.longUrl);
    }
    
    // let's finally stringify the body since
    // API gateway needs it that way
    result.body = JSON.stringify(result.body);

    console.log('Result: ', result)

    // return result
    return new Promise((resolve, reject) => {
        resolve(result)
    })

};

const updateThenGetLongUrlDb = async function(id, sourceIp, userAgent) {
        
    var params = {
        TableName: 'zwLink',
        Key: {
            "id": id
        },
        UpdateExpression: "set lastHitDate = :lhd, hits = hits + :val, lastHitSourceIp = :si, lastHitUserAgent = :ua",
        ExpressionAttributeValues: {
            ":lhd": new Date().toISOString(),
            ":val": 1,
            ":si": sourceIp ? sourceIp : "",
            ":ua": userAgent ? userAgent : ""
        },
        ReturnValues: "UPDATED_NEW"
    };

    // console.log("Updating the db. params:", params);
    
    try {
        // Utilising the put method to insert an item into the table (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.01)
        const data = await documentClient.update(params).promise();
        // console.log("data returned after update from dynamodb:", data);
        
        let response = {};
        
        if (data && data.Attributes) {
            response = {
                success: true,
                data: data.Attributes
            };
        } else {
            response = {
                success: false,
                err: "Unable to update item with id:" + id
            }
        }
        return response;
    }
    catch (e) {
        return {
            success: false,
            err: "Unable to update item. Err:" + JSON.stringify(e)
        };
    }
    
}

const getDb = async function(id) {

    var params = {
        TableName: 'zwLink',
        Key: { 'id': id }
    };

    try {
        // Utilising the put method to insert an item into the table (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.01)
        const data = await documentClient.get(params).promise();
        // console.log("data returned from dynamodb:", data);
        
        let response = {};
        
        if (data && data.Item) {
            response = {
                success: true,
                data: data.Item
            };
        } else {
            response = {
                success: false,
                err: "We do not have a record for the Zipwhip Link tinyurl:" + id
            }
        }
        return response;
    }
    catch (e) {
        return {
            success: false,
            err: JSON.stringify(e)
        };
    }
    
}

const writeLogToDb = async function(zwLinkId, sourceIp, userAgent, isHasExpires, isWasExpired, isHasPassword, isProvidedAPassword, isSuccessOnPassword, isRedirectToPasswordEntryForm, numAttempt, passwordAttempted) {

    console.log("writeLogToDb. zwLinkId:", zwLinkId);
    
    let ts = new Date().toISOString();
    
    
    // Generate a v4 (random) id
    let guid = uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'

    const params = {
        TableName: "zwLinkLog", // The name of your DynamoDB table
        Item: { // Creating an Item with a unique id 
            id: guid,
            zwLinkId: zwLinkId,
            createDate: ts,
            sourceIp: sourceIp,
            userAgent: userAgent,
            isHasExpires: isHasExpires, 
            isWasExpired: isWasExpired, 
            isHasPassword: isHasPassword, 
            isProvidedAPassword: isProvidedAPassword, 
            isSuccessOnPassword: isSuccessOnPassword, 
            isRedirectToPasswordEntryForm: isRedirectToPasswordEntryForm, 
            numAttempt: numAttempt, 
            password: passwordAttempted,
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

const getError = function(ret, msg) {
    ret.body.success = false;
    ret.body.err = msg;
    ret.body = JSON.stringify(ret.body);
    
    console.log("Returning error:", msg);

    //return ret;
    return new Promise((resolve, reject) => {
        resolve(ret)
    })

}
