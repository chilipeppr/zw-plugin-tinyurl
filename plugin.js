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
    flex-direction: row;
    display: flex;
    xwidth: 100%;
}
.` + this.id + `-composebox-topregion-body > input {
    padding: 2px 8px;
    width: min-content;
}
.` + this.id + `-composebox-topregion > .topregion-iconurl {
    margin-top: 4px;
}
.` + this.id + `-parsed-date {
    margin: 4px 0 0 10px;
}
.` + this.id + `-mainrow {
    flex-direction: row;
    display: flex;
    font-size: 12px;
}
.` + this.id + `-title {
    flex-grow:1;
}
.` + this.id + `-translatedtext {
    flex-grow: 1;
}
select.` + this.id + `-onoffauto {
    font-size:12px;
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
            this.btneEl.find('.iconUrlBaseSvg').addClass("active");
            console.log("removed hidden class from top region for human date time");

            // we should show the default date/time fields
            var regSchedEl = $('.send-message-panel_messageAdditional.send-message-panel_messageAdditional_isScheduling');
            if (regSchedEl.length > 0) {
                // this means the default scheduled text area is already toggled on
            } else {
                // this means the default scheduled text area is NOT toggled on
                // so, show it.
                
            }

            // now set the textbox with the focus so they can start typing
            // and select all text so they can immediately replace what's there
            regionEl.find("input").focus().select();
            this.onParseTextbox();

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

    cachedTextboxEl: null, // cached element for textbox
    cachedParsedDateEl: null, // cached element for the parsed date

    onParseTextbox: function(evt) {

        // Get textbox val
        //var txtBoxEl = $("." + this.id + "-composebox-topregion-body > input");
        var q = this.cachedTextboxEl.val();
        // console.log("onParseTextbox. val:", q, "evt:", evt);

        // console.log("chrono:", typeof(chrono));
        if (typeof(chrono) != 'undefined') {

            var referenceDate = new Date();
            var result = chrono.parse(q, referenceDate, { forwardDate: true });
            // var val = chrono.parse(q);
            // Fri Sep 12 2014 12:00:00 GMT-0500 (CDT)
            console.log("chrono parsed val:", result);

            // this.cachedParsedDateEl.addClass("alert-success");
            // this.cachedParsedDateEl.removeClass("alert-warning");
        
            // see if got a parsed date
            if (result && result.length && result.length > 0 && result[0].ref) {

                var d = result[0].start.date();

                // var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                // let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var options = { hour12: true, hour: 'numeric', minute:'2-digit'};

                var txt = "";
                // txt = d.toLocaleString('en-US', options);
                // console.log(d.toLocaleDateString("en-US")); // 9/17/2016
                // console.log(d.toLocaleDateString("en-US", options)); // Saturday, September 17, 2016

                // figure out year. if it's the current year then don't show it, otherwise show 2 digit year
                var yearTxt = "";
                var curYr = new Date().getFullYear();
                if (d.getFullYear() != curYr) yearTxt = "/" + d.getFullYear().toString().replace(/^../, "");

                txt = d.toLocaleDateString([], {weekday:'short'}) + " " + (d.getMonth() + 1) + "/" + d.getDate() + yearTxt + " " +  d.toLocaleTimeString([], options);

                this.cachedParsedDateEl.text(txt);

                // now update the original date/time fields so we actually schedule a text here
                var origDateEl = $('.send-message-panel_messageAdditional_isScheduling .DateInput_input');
                var origTimeEl = $('.send-message-panel_messageAdditional_isScheduling .zk-time-picker-input');
                origDateEl.val(d.toLocaleDateString());
                origTimeEl.val(d.toLocaleTimeString([], options));


            } else {
                this.cachedParsedDateEl.text("Error parsing");
            }
        } else {
            this.cachedParsedDateEl.text("Chrono not ready...");
            setTimeout(this.onParseTextbox.bind(this), 1000);
        }
    },

    // This should be called only once. It creates the Top Region.
    createTopRegion: function() {

        console.log("Creating top region for human date time");

        regionEl = zw.plugin.getOrCreateComposeBoxTopRegionCss(this.id + '', "Human Date Time", this.iconUrlBaseSvg, "hidden");
        // regionEl.find('.plugin-composebox-topregion-body').text("ABC Apple Pay - Coming soon. Lets you accept payments via Apple Pay.");
        // make x close button clickable
        regionEl.find('.zk-button').click(this.onClickComposeBoxBtn.bind(this));
        // make icon bigger
        // regionEl.find('.topregion-iconurl').addClass('topregion-abc-iconurl');

        // create textbox
        var bodyEl = regionEl.find('.plugin-composebox-topregion-body');
        var newEl = $(`
<div class="` + this.id + `-composebox-topregion-body">
    <div>Create a Zipwhip Link TinyURL</div>
    <div>Original URL</div><div>TinyURL</div>
</div>
        `);
        bodyEl.append(newEl);            

        // we need to load the javascript library

        // let's setup our cached elements
        // this way they are quicker to find in the keypress callback
        this.cachedTextboxEl = newEl.find('input');
        this.cachedParsedDateEl = newEl.find('.' + this.id + '-parsed-date');
        
        // we need to attach to the keypress events in the textbox
        // this.cachedTextboxEl.on('change paste keyup', this.onParseTextbox.bind(this));
        this.cachedTextboxEl.on('input', this.onParseTextbox.bind(this));

        return regionEl;
    },

};

// Register
zw.plugin.register(myPlugin);

// Now load it
myPlugin.onLoad();