# tummy-trials

Install NPM 

Follow Ionic's getting started guide to setup a blank application http://ionicframework.com/getting-started/

    $ npm install -g cordova ionic


To install the CouchDB plugin:

    $ cordova plugin add https://github.com/couchbaselabs/Couchbase-Lite-PhoneGap-Plugin.git
    
Add additional plugins as required, ngCordova is the recommended lib for using cordova plugins. http://ngcordova.com/docs/plugins/ 

Current plugins directory: 

    $ bower install ngCordova
    $ cordova plugin add cordova-plugin-console
    $ cordova plugin add cordova-plugin-datepicker
    $ cordova plugin add cordova-plugin-device
    $ cordova plugin add cordova-plugin-local-notifications
    $ cordova plugin add cordova-plugin-statusbar
    $ cordova plugin add ionic-plugin-keyboard
    $ cordova plugin add https://github.com/katzer/cordova-plugin-badge.git
    $ cordova plugin add https://github.com/katzer/cordova-plugin-local-notifications.git

For emulating the app in a browser, from inside the project directory (Has live updates)

    $ ionic serve

For building the app:

    $ ionic platform add ios (this only needs to be done once)
    $ ionic build ios


For opening the app in the xcode simulator:

    $ ionic emulate 

To test the project on iPhone, open the xcode project file in xcode, check the parameters, and deploy.
Project file location: TummyTrails > platforms > ios > TummyTrials.xcodeproj

Try using Ionic components for all UI elements: http://ionicframework.com/docs/

For making changes to the Ionic theme use SASS: http://learn.ionicframework.com/formulas/working-with-sass/

Try to follow the recommended style guide here: https://github.com/mgechev/angularjs-style-guide
