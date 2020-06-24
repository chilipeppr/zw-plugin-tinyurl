"use strict";

// This Lambda function is available at:
// https://zipwhip.link/analytics

// You can query for analytics on a tinyurl

/* 
You can POST application/json with:
{
    "sessionkey":"asdf-asdf-asdf-asdf",
    "accountPhoneNum":"+12065823770",
    "toPhoneNum":"+18559479446"
}

We return the analytics:
{
    "success":true,
    "tinyUrl":"https://zipwhip.link/8ZISAwVo",
    "longUrl":"https://example.com/orignalUrl",
    "hits":28,
    "lastHitDate":"2020-06-23T07:34:28.791Z",
    ...
}

Or an error:
{
    "success":false,
    "err":"The sessionkey did not match the accountPhoneNum you provided."
}
*/

const AWS = require("aws-sdk");
AWS.config.update({ region: 'us-west-2' })

// Initialising the DynamoDB SDK
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });

exports.handler = async(event) => {

    console.log("zwAnalytics event:", typeof(event), event);

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

    let body = null;

    // if we are called directly as a lambda we just
    // get an object. if we get posted from API gateway
    // we'll have an httpMethod so we can tell
    if (event == null) return getError(result, "Error event was null.");
    if (event && 'httpMethod' in event && event.httpMethod == "POST" && event.body) {

        if (typeof(event.body) == "object") {
            body = event.body;
            body.fromPostJsonObj = true;
        }
        else if (typeof(event.body) == "string") {
            body = JSON.parse(event.body);
            body.fromPostJsonStr = true;
        }
            
    }
    else {
        body = event;
        body.fromLambdaExec = true;
    }

    if (!body.sessionkey) return getError(result, "Error JSON did not contain sessionkey.");
    if (!body.accountPhoneNum) return getError(result, "Error JSON did not contain accountPhoneNum.");
    if (!body.toPhoneNum) return getError(result, "Error JSON did not contain toPhoneNum.");
    // if (!body.isDeep) return getError(result, "Error JSON did not contain isDeep.");

    // Validate that their sessionkey matches their accountPhoneNum
    // TODO: check it
    // Assume for now it's correct

    // pass back data passed in
    result.body = body;

    let dbRet = await getDbLogs(body.accountPhoneNum, body.toPhoneNum, body.isDeep);
    if (dbRet.success) {
        result.body.data = dbRet;
    } else {
        console.log("Error on database query");
        result.body.data = dbRet;
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

const getDbLogs = async function(accountPhoneNum, toPhoneNum, isDeep) {

    console.log("getDbLogs. accountPhoneNum:", accountPhoneNum, "toPhoneNum:", toPhoneNum);
    
    // query zwLink table for all tinyurl's for this accountPhoneNum to toPhoneNum
    var response = {
        success: true,
        zwLinkIds: [],
    }

    var params = {
        TableName: "zwLink",
        IndexName: "accountAndToPhoneNumKey-index",
        KeyConditionExpression: "accountAndToPhoneNumKey = :atpnum",
        // KeyConditionExpression: "accountPhoneNum = :apnum and toPhoneNum = :tpnum",
        // ExpressionAttributeNames: {
        //     "#apn": "accountPhoneNum",
        //     "#tpn": "toPhoneNum"
        // },
        ExpressionAttributeValues: {
            ":atpnum": accountPhoneNum + toPhoneNum
        }
    };
    console.log("params:", params);

    try {
        const data = await documentClient.query(params).promise();

        console.log("Query zwLink succeeded.");
        for (var i = 0; i < data.Items.length; i++ ) {
            let item = data.Items[i];
            
            console.log(" -", item.id + ": " + item.accountPhoneNum, item);
            
            // append to return links array
            response.zwLinkIds.push(item.id);
            response[item.id] = item;
            // response[item.id].zwLinkLogIds = [];
            // response[item.id].zwLinkLogs = {};

            // only go another layer deeper on logs if
            // they asked for deep retrieval
            if (isDeep) {
                
                var params2 = {
                    TableName: "zwLinkLog",
                    IndexName: "zwLinkId-index",
                    KeyConditionExpression: "zwLinkId = :idd",
                    // ExpressionAttributeNames: {
                    //     "#zlid": "zwLinkId"
                    // },
                    ExpressionAttributeValues: {
                        ":idd": item.id
                    }
                };
                
                console.log("params2:", params2);
    
                try {
                    const data2 = await documentClient.query(params2).promise();
                    console.log("data2:", data2);
                    
                    // append to overall return array
                    // response[item.id].zwLinkLogIds.push(data2.Item.id);
                    response[item.id].zwLinkLogs = data2;
                }
                catch (e) {
                    // this err can simply mean no log entries yet, so not really error
                    console.error("Err querying data2 for zwLinkId:", item.id, e, "may just mean no records so no biggie");
                    // return {
                    //     success: false,
                    //     err: JSON.stringify(e)
                    // };
                }
            
            } // isDeep

        }

        // if (data && data.Item) {
        //     // do nothing
        // }
        // else {
        //     response = {
        //         success: false,
        //         err: "Err querying data for accountPhoneNum:" + accountPhoneNum + " toPhoneNum:" + toPhoneNum
        //     }
        // }
        // return response;
    }
    catch (e) {
        console.log("Query zwLink failed. e:", e);
        return {
            success: false,
            err: JSON.stringify(e)
        };
    }

    return response;

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
