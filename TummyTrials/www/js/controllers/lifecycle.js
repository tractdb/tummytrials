// lifecycle.js     Broadcast app pause/resume events
//
// We register for Cordova pause and resume events and rebroadcast them
// as Angular events from the root scope: appPause, appResume.
//
// Note: there are strict limits on what can be done in a handler for
// appPause. Cordova documentation is here:
//
//     https://cordova.apache.org/docs/en/3.0.0/cordova_events_events.md.html
//
// Since events are broadcast from the root scope, they should be
// accessible in any scope. To register for the resume event:
//
//     $scope.$on('appResume', function() { things_to_do(); });
//

'use strict';

(angular.module('tractdb.lifecycle', [])
.run(function($ionicPlatform, $document, $rootScope) {
    $ionicPlatform.ready(function() {
        $document[0].addEventListener("pause", function() {
            $rootScope.$broadcast('appPause');
        });
        $document[0].addEventListener("resume", function() {
            $rootScope.$broadcast('appResume');
        });

        // These are iOS-specific events. They seem to be more reliable
        // than the above, when writing to the DB.
        //
        $document[0].addEventListener("resign", function() {
            $rootScope.$broadcast('appResign');
        });
        $document[0].addEventListener("active", function() {
            $rootScope.$broadcast('appActive');
        });
    });
})
);
