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
