// Human date time Zipwhip Plugin
// This plugin lets you enter a human-style date/time in
// a Compose Box widget. This makes it easier to schedule a
// text rather than being forced to use the traditional date/time
// fields in the base Zipwhip app

// Register
var myPlugin = {

    // The ID should be camel case, prefixed with your company name/initials, and be a short
    // name for this plugin. It gets pre-pended to a lot of HTML element class names, CSS styles,
    // data attributes, etc. throughout the Zipwhip app. So this name is important.
    // Example: AuthviaPayments, ZwSuggReply, ZwSentiment, ZwNpsSurvey, SenseforthCreditUnion
    id: "zw-plugin-tinyurl", // This gets prepended to all CSS styles and class names so not to clobber other plugins

    settings: {
        name: "Zipwhip Link TinyURL",
        description: "Convert URLs to TinyURLs",
    },

    iconUrlBaseSvg: 'https://raw.githubusercontent.com/chilipeppr/zw-plugin-tinyurl/master/link_default.svg',
    iconUrlHoverSvg: 'https://raw.githubusercontent.com/chilipeppr/zw-plugin-tinyurl/master/link_hover.svg',
    iconUrlSelectedSvg: 'https://raw.githubusercontent.com/chilipeppr/zw-plugin-tinyurl/master/link_selected.svg',

    // This is the boot code for a plugin. You should call it once you register the plugin.
    // This is the only code that is automatically called by Zipwhip on load of a plugin.
    // For all other events you must register for them in your onLoad event.
    // The onLoad method in your plugin object is called ONCE and only ONCE.
    // RESERVED NAME
    onLoad: function() {

        // Register our plugin with Zipwhip so it's aware of us
        // Don't really need to pass "this" yet as 2nd param, but maybe the plugin system
        // will need it in the future.
        //zw.plugin.register(this.id, this.settings, this);

        zw.plugin.addCss(
"." + this.id + `-composebox-topregion-body {
    flex-direction: column;
    display: flex;
    width: 100%;
}
.` + this.id + `-composebox-topregion > .topregion-iconurl {
    margin-top: 4px;
    opacity:0.4;
}
.` + this.id + `-titlerow {
    flex-direction: row;
    display: flex;
    font-size: 12px;
}
.` + this.id + `-title {
    flex-grow:1;
}
.` + this.id + `-mainrow {
    flex-direction: row;
    display: flex;
    font-size: 14px;
}
`);
        zw.plugin.addCssUrl();

        // listen to events
        zw.plugin.addEventListener(zw.plugin.events.COMPOSE_BOX_LOAD, this.onComposeBoxLoad.bind(this));
        // zw.plugin.addEventListener(zw.plugin.events.SIDE_PANEL_LOAD, this.onSidePanelLoad.bind(this));

    },

    // The code below in this plugin is any name you want to use. Consider making these private methods/props.

    btnEl: null, // will hold ref to compose box button bar button

    // We are called when the Compose Box is loaded. In the event object we are given
    // the current Conversation object which has a ConversationId and Contacts array
    // with ContactId's.
    // This is called each time a conversation is changed.
    /*
       composeTextAreaEl: composeTextAreaEl,
       composeBoxBtnBarPluginEl: composeBoxBtnBarPluginEl,
       composeTopRegionPluginEl: composeTopRegionPluginEl,
       phoneObj: newPhoneObj,
       phone: newPhone,
       oldPhone: oldPhone,
       conversation: conversation,
       contactId: contactId
    */
    onComposeBoxLoad: function(evt) {
        console.log("Got plugin onComposeBoxLoad. evt:", evt);

        // store the textarea for now in this plugin obj so we can retrieve it later
        this.composeBoxTextAreaEl = evt.composeTextAreaEl;

        this.btnEl = zw.plugin.getOrCreateComposeBoxBtnBarCss(this.id + "-btn", "TinyURL", this.iconUrlBaseSvg, this.iconUrlHoverSvg, this.iconUrlSelectedSvg, this.onClickComposeBoxBtn.bind(this));

        // watch for all changes to textarea
        this.attachToTextAreaChangeEvents();
    },

    // Setup the close button to hide
    setupCloseBtn: function() {
        var btnCloseEl = $('.plugin-composebox-topregion-close button');
        console.log("setupCloseBtn. btnEl:", btnCloseEl);

        var that = this;
        btnCloseEl.click(function() {

            that.hide();

            // since this was manually unshown by the user, let's do a sticky setting
            // where we keep the Language Translator showing until they toggle it off
            // localStorage.setItem(that.id + "-sticky-show", "off");
            // console.log("sticky setting storing off");
        });
    },

    // This method is called after the compose box button bar button is clicked
    onClickComposeBoxBtn: function(evt) {
        console.log("onClickComposeBoxBtn. evt:", evt); 

        var regionEl = $('.' + this.id + '-composebox-topregion');

        // see if exists
        if (regionEl.length == 0) {
            // it does not, create it, create with hidden css tag added
            regionEl = this.createTopRegion();
            // regionEl.addClass("hidden");
        }

        // Get the button element
        // var btnEl = zw.plugin.getOrCreateComposeBoxBtnBarCss(this.id);
        if (regionEl.hasClass("hidden")) {

            // Show the Human Date Time
            regionEl.removeClass("hidden");
            this.btnEl.find('.iconUrlBaseSvg').addClass("active");
            console.log("removed hidden class from top region for human date time");

            // we should show the default date/time fields
            var regSchedEl = $('.send-message-panel_messageAdditional.send-message-panel_messageAdditional_isScheduling');
            if (regSchedEl.length > 0) {
                // this means the default scheduled text area is already toggled on
            } else {
                // this means the default scheduled text area is NOT toggled on
                // so, show it.
                
            }

            
        } else {

            // Hide the Human Date Time
            regionEl.addClass("hidden"); // ensure hidden
            this.btnEl.find('.iconUrlBaseSvg').removeClass("active");
            console.log("added hidden class from top region for human date time");

            // place focus back on main compose box
            // this.composeBoxTextAreaEl.focus();
            console.log("this is where i would give focus to textarea:", this.composeBoxTextAreaEl);
            this.composeBoxTextAreaEl.focus();
            
        }


    },

    showTopRegion: function() {
        var regionEl = $('.' + this.id + '-composebox-topregion');
        console.log("showTopRegion. regionEl:", regionEl);

        if (regionEl && (regionEl.hasClass("hidden") || regionEl.length == 0) ) {
            // we need to show
            this.onClickComposeBoxBtn();
        }
    },

    // This should be called only once. It creates the Top Region.
    createTopRegion: function() {

        console.log("Creating top region for human date time");

        regionEl = zw.plugin.getOrCreateComposeBoxTopRegionCss(this.id + '', "Zipwhip Link TinyURL", this.iconUrlBaseSvg, "hidden");
        // regionEl.find('.plugin-composebox-topregion-body').text("ABC Apple Pay - Coming soon. Lets you accept payments via Apple Pay.");
        // make x close button clickable
        regionEl.find('.zk-button').click(this.onClickComposeBoxBtn.bind(this));
        // make icon bigger
        // regionEl.find('.topregion-iconurl').addClass('topregion-abc-iconurl');

        // create textbox
        var bodyEl = regionEl.find('.plugin-composebox-topregion-body');
        var newEl = $(`
<div class="` + this.id + `-composebox-topregion-body">
    <div class="` + this.id + `-titlerow">
        <div class="` + this.id + `-title">Zipwhip Link TinyURL</div>
    </div>
    <div class="` + this.id + `-bodyrow"></div>
</div>
        `);
        bodyEl.append(newEl);            

        // we need to load the javascript library

        

        return regionEl;
    },

    attachToTextAreaChangeEvents: function() {

        console.log("textarea: attachToTextAreaChangeEvents.");

        // We are going to watch for changes on the textarea to see if a URL is pasted in
        this.composeBoxTextAreaEl.on('input change', this.onTextAreaChange.bind(this));

    },

    onTextAreaChange: function(evt) {
        console.log("textarea: onTextAreaChange. evt:", evt);

        // get html element
        var el = $('.' + this.id + '-bodyrow');
        el.html("");

        // has called showTopRegion
        var isHasCalled = false;

        // see if there is a url
        var val = this.composeBoxTextAreaEl.val();
        console.log("val:", val);
        var re = /(\b(?:https?:|www\.)[^\s]+)/g;
        while ( match = re.exec(val) ) {
            var reItem = RegExp.$1;

            // if we find a url, we have to show the top region automatically
            // but then we have to re-find the element for the bodyrow
            if (!isHasCalled) {
                this.showTopRegion();
                isHasCalled = true;
                var el = $('.' + this.id + '-bodyrow');
            }

            console.log("found url via regexp. $1:", reItem);
            var randString = this.getRandomString(8);
            el.append('<div><span style="color:gray;">Original URL</span> ' + reItem + ' <span style="color:gray">TinyURL</span> https://zipwhip.link/' + randString + '</div>');
        }
    },

    getRandomString: function(len) {

        // Will give you back a random string of chars
        var characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var ans = '';
        for (var i = len; i > 0; i--) {
            ans +=
                characters[Math.floor(Math.random() * characters.length)];
        }
        return ans;
    }

};

// Register
zw.plugin.register(myPlugin);

// Now load it
myPlugin.onLoad();