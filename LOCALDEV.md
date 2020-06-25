# Local Development

You need to dish up your code in real-time to the Zipwhip boot.js
script to load your plugin into the Zipwhip web app.

We recomend you use a localhost web server to dish up your local
plugin.js while developing your code. The reason for this is if you try to interactively edit your Github project, there is too much lag time on Github's servers for your new version to be served expediently and you will hate life. Thus, serving it up locally allows non-stop iterations while hitting reload in your browser.

## Overriding jsUrl to Point to Local Copy
If you're doing local development, you can change your jsUrl to point to your local development server. To change your jsUrl to point locally, make sure you are running the tampermonkey script from:
https://github.com/chilipeppr/zw-plugin-bootstrap/blob/master/tampermonkey.js

And then change the code in the following section by modifying/adding your own plugin and override the jsUrl to your localhost version. Obviously you would need an id from the App Store for your plugin before you can do this.

```javascript
// If doing local development, override plugin Javascript URL jsUrl locations here
window.pluginOverrides = [
    {
        // New Text Shortcut Key
        id: "d7bd26ff-69b4-4b58-b228-475f5a00b5fd", // id from app store
        active: true, // set to false to stop overriding, true to override
        //jsUrl: "https://raw.githubusercontent.com/chilipeppr/ZwNewTextShortcutKey/master/plugin.js", // John's version in Github
        jsUrl: "http://localhost:8080/ZwNewTextShortcutKey/plugin.js", // Local dev version
    },
```

## Running a Local Web Server to Serve Your Local Script
To install:
`npm install http-server -g`

To run on PC (turn on cors, turn off caching):
`http-server.cmd --cors -c-1`

To run on Mac/Linux (turn on cors, turn off caching):
`http-server --cors -c-1`

Then visit:
`http://localhost:8080/plugin.js`

Or, it's highly recommended to run the web server from one level above your current project so that you can work on multiple projects at the same time using the same web server.

To run on PC (turn on cors, turn off caching):
`cd ..`
`http-server.cmd --cors -c-1`

Then visit:
`http://localhost:8080/myPluginFolder/plugin.js`


## Using Babel for Advanced Javascript Development

If using Babel so that you can write advanced Javascript, but dumb it down for broad set of browsers...

While you can install Babel CLI globally on your machine, it's much better to install it locally project by project.

Different projects on the same machine can depend on different versions of Babel allowing you to update one at a time.
It means you do not have an implicit dependency on the environment you are working in. Making your project far more portable and easier to setup.

We can install Babel CLI locally by running:

`npm install --save-dev @babel/core @babel/cli`

Note: If you do not have a package.json, create one before installing. This will ensure proper interaction with the npx command.

After that finishes installing, your package.json file should include:
```json
{
  "devDependencies": {
+   "@babel/cli": "^7.0.0",
+   "@babel/core": "^7.0.0"
  }
}
```

### Usage
Instead of running Babel directly from the command line we're going to put our commands in npm scripts which will use our local version.

Simply add a "scripts" field to your package.json and put the babel command inside there as build.

```json
  {
    "name": "my-project",
    "version": "1.0.0",
+   "scripts": {
+     "build": "babel src -d lib"
+   },
    "devDependencies": {
      "babel-cli": "^6.0.0"
    }
  }
```

Now from our terminal we can run:

`npm run build`

This will run Babel the same way as before and the output will be present in lib directory, only now we are using a local copy.

Alternatively, you can reference the babel cli inside of node_modules.

`./node_modules/.bin/babel src -d lib`
