exports.handler = async(event) => {
    console.log("zwDefault event:", typeof(event), event);

    var html = `<html>
    <head>
        <title>Zipwhip Link</title>
    </head> 
    <body>
        <a href="https://www.zipwhip.com"><img src="https://raw.githubusercontent.com/chilipeppr/zw-plugin-tinyurl/95edb4e61f59c45920c516517b4e443537cadb51/zipwhip_link_logo_plain.svg" 
        style="width:50%;position: fixed;top: 50%;left: 50%;transform: translate(-50%, -50%);border:0;"></a>
    </body>
</html>`;
    
    var result = {
        "statusCode": 200,
        "isBase64Encoded": false,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/html",
            "Content-type": "text/html",
            "content-type": "text/html"
        },
        "body": html
    };

    // let's finally stringify the body since
    // API gateway needs it that way
    // result.body = JSON.stringify(result.body);

    console.log('Result: ', result)

    // return result
    return new Promise((resolve, reject) => {
        resolve(result)
    })
    
};
