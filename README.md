# tummy-trials

Install NPM

Follow Ionic's getting started guide to setup a blank application

To install the CouchDB plugin:

    $ cordova plugin add https://github.com/couchbaselabs/Couchbase-Lite-PhoneGap-Plugin.git

For now we keep a copy of the plugin in this repository. Perhaps we
would want to rethink this at some point.

For building the app:

    $ ionic platform add ios
    $ ionic build ios

For testing project on iPhone, open the xcode project file in xcode, check the parameters and deploy.
Project file location: TummyTrails > platforms > ios > TummyTrials.xcodeproj
