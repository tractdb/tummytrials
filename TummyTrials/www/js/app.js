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
  
  //enter login for landing tab here
  $urlRouterProvider.otherwise('/mytrials')

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
          templateUrl: 'templates/mytrials.html',
          controller: 'SetupController'
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
    .state('setup_1', {
      url: '/setup_1',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_1.html',
          controller: 'SetupController'
        }
      }
    })    
    .state('setup_2', {
      url: '/setup_2',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_2.html',
          controller: 'SetupController'
        }
      }
    })
    .state('setup_3', {
      url: '/setup_3',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_3.html',
          controller: 'SetupController'
        }
      }
    })    
    .state('setup_3_1', {
      url: '/setup_3_1',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_3_1.html',
          controller: 'SetupController'
        }
      }
    })
    .state('setup_3_2', {
      url: '/setup_3_2',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_3_2.html',
          controller: 'SetupController'
        }
      }
    })
    .state('setup_3_3', {
      url: '/setup_3_3',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_3_3.html',
          controller: 'SetupController'
        }
      }
    })
    .state('setup_3_4', {
      url: '/setup_3_4',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_3_4.html',
          controller: 'SetupController'
        }
      }
    })
    .state('setup_4', {
      url: '/setup_4',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_4.html',
          controller: 'SetupController'
        }
      }
    })
    .state('setup_5', {
      url: '/setup_5',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_5.html',
          controller: 'SetupController'
        }
      }
    })  
});


app.controller( "SetupController", function( $scope, $http, $sce) {
    $http({
        url: 'json/setup.json',
        dataType: 'json',
        method: 'GET',
        data: '',
        headers: {
            "Content-Type": "application/json"
        },

    }).success(function(response){
        $scope.text = response;
    }).error(function(error){
        $scope.text = 'error';
    });        
}); 