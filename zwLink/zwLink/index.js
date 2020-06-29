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

const s3 = new AWS.S3({
//   signatureVersion: 'v4'
});

exports.handler = async(event) => {

    console.log("zwLink event:", typeof(event), event);

    let action = null;
    let err = null;
    let body = null;
    let path = null;
    let isFileShare = false;
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

    // check that we have the required fields
    if (!body.sessionkey) return getError(result, "Error JSON did not contain sessionkey.");
    if (!body.accountPhoneNum) return getError(result, "Error JSON did not contain accountPhoneNum.");
    if (!body.toPhoneNum) return getError(result, "Error JSON did not contain toPhoneNum.");
    
    // see if file share or not. if file share, we'll gen a longurl
    // if not file share, they need to give us the url
    if (body.file) {
        // we are in a file share situation. that means we'll create the s3 bucket for them.
        isFileShare = true;
        
        // check for other required fields
        if (!body.file.mimeType) return getError(result, "Error JSON did not contain file.mimeType.");
        if (!body.file.origName) return getError(result, "Error JSON did not contain file.origName.");
        if (!body.file.size) return getError(result, "Error JSON did not contain file.size.");
        if (!body.file.lastModDate) return getError(result, "Error JSON did not contain file.lastModDate.");
        action = "createTinyUrlFileShare";
    
        
    } else {
        if (!body.longUrl) return getError(result, "Error JSON did not contain longUrl.");
        action = "createTinyUrl"
    }

    // if we get here we have our values

    // see if they want a password
    let password = null;
    if (body.isPasswordProtected) {
        let len = 4;
        if (body.passwordLength) len = body.passwordLength;
        password = getRandomPasswordNumeric(len);
        console.log("they wanted password protect. password:", password);
    }
    
    // see if expires
    let isHasExpires = false;
    if (body.expireSeconds) {
        console.log("they want expire seconds:", body.expireSeconds);
        isHasExpires = true;
    }

    // TODO: double check with zipwhip that acct phone number matches the sessionkey
    // trust accountPhoneNum as being real for now

    let randString = getRandomString(8);
    
    let longUrl = body.longUrl;
    
    // file vars
    let fileS3Key = null;
    let fileS3UploadUrl = null;
    
    
    switch (action) {
        case 'createTinyUrl':
            // var dbRet = await scanTable();
            var dbRet = await writeToDb(randString, longUrl, body.sessionkey, body.accountPhoneNum, body.toPhoneNum, body.isPasswordProtected, body.passwordLength, password, body.expireSeconds);
            if (dbRet.success) {
                // good to go
            }
            else {
                // had err
                return getError(result, "Got error writing to db:" + dbRet.err);
            }
            break;
        case 'createTinyUrlFileShare':
            // we need to get the s3 url and then writeToDb
            var dbS3Ret = await getUploadURL(randString, body.file.origName, body.file.mimeType);
            if (dbS3Ret.success) {
                // since we got our s3 url, we can now do next step which is
                // write to dynamodb for our tinyurl attached to our s3 object
                longUrl = "s3";
                var dbRet = await writeToDbFileShare(randString, "s3", body.sessionkey, body.accountPhoneNum, body.toPhoneNum, body.isPasswordProtected, body.passwordLength, password, body.expireSeconds, dbS3Ret.fileS3Key, body.file.origName, body.file.mimeType, body.file.size, body.file.lastModDate);
                if (dbRet.success) {
                    // good to go
                    fileS3Key = dbS3Ret.fileS3Key;
                    fileS3UploadUrl = dbS3Ret.fileS3UploadUrl;
                    console.log("got good writeToDbFileShare");
                }
                else {
                    // had err
                    return getError(result, "Got error writing to db:" + dbRet.err);
                }
            }
            else {
                // had err
                return getError(result, "Got error creating S3 object:" + dbS3Ret.err);
            }
            break;
        case 'error':
            result = getError(err);
            break;

        default:
            return getError(result, "got an action not familiar with. action:" + action);
    }

    // create final file object
    let file = null;
    if (fileS3Key != null) {
        file = {
            s3Key: fileS3Key,
            s3UploadUrlExpireSecs: 60*60, // 1 hr
            s3UploadUrl: fileS3UploadUrl,
            origName: body.file.origName,
            mimeType: body.file.mimeType,
            size: body.file.size,
            lastModDate: body.file.lastModDate,
        }
    }
    
    result.body = JSON.stringify({
        // lambdaFunc: "zwLink",
        // path: path,
        randString: randString,
        tinyUrl: "https://zipwhip.link/" + randString,
        longUrl: longUrl,
        sessionkey: body.sessionkey,
        accountPhoneNum: body.accountPhoneNum,
        toPhoneNum: body.toPhoneNum,
        // action: action,
        isPasswordProtected: body.isPasswordProtected,
        passwordLength: body.passwordLength,
        password: password,
        isHasExpires: isHasExpires,
        expireSeconds: body.expireSeconds,
        file: file,
    });

    console.log('Result: ', result)
    // return result
    return new Promise((resolve, reject) => {
        resolve(result)
    })

};

// get s3 url
const getUploadURL = async function(id, origFile, mimeType) {

    // get file extension off of original file name
    let ext = origFile.split('.').pop()
    //let ext = "";
    
    // setup extension for mimetype. not sure if really need this
    let fileName = id + "." + ext;

    const s3Params = {
        Bucket: 'zw-fileuploader',
        Key: fileName,
        // Expires: 60 * 60 * 1, // 1 hour expiration
        ContentType: mimeType, //'image/jpeg', // Update to match whichever content type you need to upload
        // ACL: 'public-read', // Enable this setting to make the object publicly readable - only works if the bucket can support public objects
        // ACL: 'authenticated-read',
        // This must match with your ajax contentType parameter
        // ContentType: 'binary/octet-stream',
        // signatureVersion: 'v4',
    }

    console.log('getUploadURL: ', s3Params, "origFile:", origFile, "ext:", ext);

    var result = {};
    try {
        let uploadURL = await s3.getSignedUrlPromise('putObject', s3Params);
        
        console.log("created upload url:", uploadURL);
        
        if (uploadURL) {
            result = {
                success: true,
                fileS3UploadUrl: uploadURL,
                fileS3Key: fileName,
            }
        } else {
            result = {
                success: false,
                err: "Err in return from s3.getSignedUrl. data:" + JSON.stringify(s3Params)
            }
        }
    }
    catch(e) {
        result = {
            success: false,
            err: "Err creating s3.getSignedUrl. data:" + JSON.stringify(s3Params) + ", err:" + JSON.stringify(e)
        }
    }

    return result;
}

// write the tinyurl to dynamodb
const writeToDbFileShare = async function(randString, longUrl, sessionkey, accountPhoneNum, toPhoneNum, isPasswordProtected, passwordLength, password, expireSeconds, fileS3Key, fileOrigName, fileMimeType, fileSize, fileLastModDate) {

    console.log("writeToDbFileShare. randString:", randString, longUrl, fileS3Key, fileOrigName, fileMimeType, fileSize, fileLastModDate);
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
            expireSeconds: expireSeconds,
            // fileS3Key: fileS3Key,
            // fileS3UploadUrl: fileS3UploadUrl,
            file: {
                s3Key: fileS3Key,
                origName: fileOrigName,
                mimeType: fileMimeType,
                size: fileSize,
                lastModDate: fileLastModDate
            }
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
            expireSeconds: expireSeconds,
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