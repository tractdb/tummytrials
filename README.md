# tummy-trials

Install NPM 

Follow Ionic's getting started guide to setup a blank application http://ionicframework.com/getting-started/

    $ npm install -g cordova ionic
    $ ionic start appName blank

To install the CouchDB plugin:

    $ cordova plugin add https://github.com/couchbaselabs/Couchbase-Lite-PhoneGap-Plugin.git
    
Add additional plugins as required, ngCordova is the recommended lib for using cordova plugins. http://ngcordova.com/docs/plugins/ 

Current plugins directory: 

    $ bower install ngCordova
    $ phonegap local plugin add https://github.com/couchbaselabs/Couchbase-Lite-PhoneGap-Plugin.git
    $ cordova plugin add cordova-plugin-badge
    $ cordova plugin add cordova-plugin-console
    $ cordova plugin add cordova-plugin-datepicker
    $ cordova plugin add cordova-plugin-device
    $ cordova plugin add cordova-plugin-local-notificaions
    $ cordova plugin add cordova-plugin-statusbar
    $ cordova plugin add ionic-plugin-keyboard
    $ cordova plugin add https://github.com/couchbaselabs/Couchbase-Lite-Phonegap-Plugin.git
    $ cordova plugin add https://github.com/katzer/cordova-plugin-badge.git
    $ cordova plugin add https://github.com/katzer/cordova-plugin-local-notifications.git

For emulating the app in a browser, from inside the project directory.

    $ ionic serve

For building the app:

    $ ionic platform add ios
    $ ionic build ios

For testing project on iPhone, open the xcode project file in xcode, check the parameters and deploy.
Project file location: TummyTrails > platforms > ios > TummyTrials.xcodeproj

Try using Ionic components for all UI elements: http://ionicframework.com/docs/

For making changes to the Ionic theme use SASS: http://learn.ionicframework.com/formulas/working-with-sass/

Would be nice to follow the recommended style guide here: https://github.com/mgechev/angularjs-style-guide
