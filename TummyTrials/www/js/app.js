// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'

/* Default module

angular.module('starter', ['ionic'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
}) */

'use strict';

var app = angular.module('TummyTrials',
            ['ionic', 'ngSanitize', 'TummyTrials.login']);

//Ionic device ready check
app.run(function($ionicPlatform, $rootScope, Login) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
    // Ask for username/password at startup.
    //
    // XXX It would probably be better to eliminate the ability to
    // cancel the login. For now, just keep asking until they give a
    // password (promise resolves to non-null).
    //
    (function getuserpass() {
        Login.loginfo_p('couchuser', $rootScope, 'Tummy Trials Login')
        .then(
            function good(up) {
                if (!up) getuserpass();
                // Not using the username/password here
            },
            function bad() {
                console.log('error in login');
            }
        );
    })();
  });
});

//UI-router for handling navigation 
app.config(function($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.otherwise('/')

  $stateProvider
    .state('current', {
      url: '/current',
      views: {
        current : {
          templateUrl: 'templates/current.html'
        }
      }
    })
    .state('mytrials', {
      url: '/mytrials',
      views: {
        mytrials : {
          templateUrl: 'templates/mytrials.html'
        }
      }
    })
    .state('faqs', {
      url: '/faqs',
      views: {
        faqs : {
          templateUrl: 'templates/faqs.html'
        }
      }
    })
    .state('settings', {
      url: '/settings',
      views: {
        settings : {
          templateUrl: 'templates/settings.html'
        }
      }
    })
    .state("otherwise", {
      url: '/loginfo',
      views: {
        loginfo : {
          templateUrl: 'templates/loginfo.html'
        }
      }
    })
});
