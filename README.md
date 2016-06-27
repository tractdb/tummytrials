# tummy-trials

Install Node Package Manager (npm)

Setup Ionic http://ionicframework.com/getting-started/

    $ npm install -g cordova ionic

To install the plugins, navigate to root folder and execute: 

    $ ./plugin_script.sh
    
Add additional plugins as required, ngCordova is the recommended lib for using cordova plugins. http://ngcordova.com/docs/plugins/ 

For building the app:

    $ ionic platform add ios (this only needs to be done once)
    $ ionic build ios

For opening the app in the xcode simulator (Has active communication with couch):

    $ ionic emulate 

For emulating the app in a browser, from inside the project directory (Has live updates but, cannot communicate with couch)

    $ ionic serve

To test the project on iPhone, open the xcode project file in xcode, check the parameters, and deploy.
Project file location: TummyTrails > platforms > ios > TummyTrials.xcodeproj

Try using Ionic components for all UI elements: http://ionicframework.com/docs/

For making changes to the Ionic theme use SASS: http://learn.ionicframework.com/formulas/working-with-sass/

Try to follow the recommended style guide here: https://github.com/mgechev/angularjs-style-guide

For generating app icons and splash screen. Place icon and splash screen file and autogenerate all the variations http://blog.ionic.io/automating-icons-and-splash-screens/

Temporary bug: 
When adding a platform to the project, if you get a build error regarding duplicate symbol _UIApplicationRegisterUserNotificationSettings, delete the AppDelegate+APPRegisterUserNotificationSettings.m file under Plugins in Xcode

------------------------------------------------------------------------------------------------------------------------------------

For updating/adding to ioniocons follow instructions at https://github.com/driftyco/ionicons (fontforge should be the only missing dependence - installed via brew)

Once the svg has been copied to the folder `tummy-trials/TummyTrials/www/lib/ionicons/src` run the following commands:
    
navigate to `tummy-trials/TummyTrials/www/lib/ionicons`

    $ python ./builder/generate.py

navigate back to `tummy-trials/TummyTrials`

    $ sudo ionic setup sass

add back your custom css after above command, which removes it from your index.html

------------------------------------------------------------------------------------------------------------------------------------

Current version info:

Check version for ngCordova lib and cordova platform using

    bower ngCordova -v
    cordova -v
    cordova platform list

Versions should look like following. Make sure cordova ios platform version is not 4+

    ngCordova 1.6.5
    cordova 6.0.0
    cordova ios platform 3.9.2

To check versions of various cordova plugins use
    
    cordova plugin help 
    
Current versions are below

    com.couchbase.lite.phonegap 1.1.1 "Couchbase Lite"
    cordova-plugin-app-event 1.1.0 "Application Events"
    cordova-plugin-console 1.0.2 "Console"
    cordova-plugin-datepicker 0.9.3 "DatePicker"
    cordova-plugin-device 1.1.0 "Device"
    cordova-plugin-statusbar 2.0.0 "StatusBar"
    de.appplant.cordova.common.registerusernotificationsettings 1.0.1 "RegisterUserNotificationSettings"
    de.appplant.cordova.plugin.badge 0.7.1 "Cordova Badge Plugin"
    de.appplant.cordova.plugin.local-notification 0.8.4 "LocalNotification"
    ionic-plugin-keyboard 1.0.8 "Keyboard"
