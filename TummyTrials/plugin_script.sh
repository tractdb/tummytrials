echo "installing ngCordova"
bower install ngCordova

echo "installing cordova couchbase-lite"
cordova plugin add https://github.com/couchbaselabs/Couchbase-Lite-PhoneGap-Plugin.git

echo "installing cordova-plugin-console"
cordova plugin add cordova-plugin-console

echo "installing cordova-plugin-datepicker"
cordova plugin add cordova-plugin-datepicker

echo "installing cordova-plugin-device"
cordova plugin add cordova-plugin-device

echo "installing cordova-plugin-statusbar"
cordova plugin add cordova-plugin-statusbar

echo "installing ionic-plugin-keyboard"
cordova plugin add ionic-plugin-keyboard

echo "installing cordova-plugin-local-notifications"
cordova plugin add https://github.com/katzer/cordova-plugin-local-notifications.git

echo "installing cordova-plugin-badge"
cordova plugin add https://github.com/katzer/cordova-plugin-badge.git
