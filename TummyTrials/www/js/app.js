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

var app = angular.module('tummytrials',
            ['ionic','ngSanitize','tummytrials.login','tummytrials.currentstudy','tummytrials.studysetup','tummytrials.faqcontroller','ngCordova','tummytrials.ngcordovacontrollers', 'tummytrials.text', 'tummytrials.experiments']);

//Ionic device ready check
app.run(function($ionicPlatform, $rootScope, $q, Text, Experiments, Login) {
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
    Text.all_p()
    .then(function(text) {
        return Login.loginfo_p('couchuser', $rootScope, text.loginfo,
                                Experiments.valid_p);
    });
  });
})


//UI-router for handling navigation 
app.config(function($stateProvider, $urlRouterProvider) {
  
  //enter login for landing tab here
  $urlRouterProvider.otherwise('/')

  $stateProvider
    .state('current', {
      url: '/current',
      views: {
        current : {
          templateUrl: 'templates/current.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('mytrials', {
      url: '/mytrials',
      views: {
        mytrials : {
          templateUrl: 'templates/mytrials.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('settings', {
      url: '/settings',
      views: {
        settings : {
          templateUrl: 'templates/settings.html',
          controller: 'setupcontroller'
        }
      }
    })
    
    .state('faqs', {
      url: '/faqs',
      views: {
        faqs : {
          templateUrl: 'templates/faqs.html',
          controller: 'setupcontroller'
        }
      }
    })

})

app.controller( "setupcontroller", function( $scope, $http, $sce) {
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
})
