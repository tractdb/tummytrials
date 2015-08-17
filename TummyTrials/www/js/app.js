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
            ['ionic','ngSanitize','tummytrials.login','tummytrials.currentstudy','tummytrials.studysetup','tummytrials.faqcontroller','ngCordova','tummytrials.ngcordovacontrollers', 'tummytrials.text', 'tummytrials.experiments', 'tummytrials.exper-test']);

//Ionic device ready check
app.run(function($ionicPlatform, $rootScope, $q, Text, Experiments, Login,
                    ExperTest) {

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

    // Try some tests. Move these into some kind of framework later on,
    // probably.
    //
    var want_to_run_these_tests = false;
    if (want_to_run_these_tests) {
        ExperTest.testAll()
        .then(ExperTest.testGet)
        .then(ExperTest.testGetCurrent)
        .then(ExperTest.testAdd)
        .then(ExperTest.testSetStatus)
        .then(ExperTest.testAddReport)
        .then(ExperTest.testDelete)
        .then(
            function good() {},
            function bad(err) { console.log('error ' + err.message); }
        );
    }
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
    this.calander = [];
    this.timesPressed = 0;
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

    this.parametersSet = function(){
      if ($scope.date && $scope.duration){
        return true;
      }
      return false;
    };   

    this.showDate = function(){
      if ($scope.date){
        return $scope.date.getUTCDay();
      } else {
        return "Pick a Start Date!";
      }
    };

    this.getDates = function(){
      this.calander = [];
      if ($scope.date && $scope.duration){
        var week = [];
        var currentDate = new Date();
        currentDate.setTime($scope.date.getTime());
        for (var count = 0; count < $scope.duration; count++){
          var experimentDate = {"date" : currentDate.getDate(), "dayType" : "nonTrigger"}
          week.push(experimentDate);

          if (currentDate.getDay() == 6 || count == $scope.duration - 1){
            if(week.length < 7){
              if (count == $scope.duration - 1) {
                while (week.length < 7){
                  currentDate.setDate(currentDate.getDate() + 1);
                  week.push({"date" : currentDate.getDate(), "dayType" : "none"});
                }
              } else {
                var previous = new Date();
                previous.setTime($scope.date.getTime());
                while (week.length < 7){
                  previous.setDate(previous.getDate() - 1);
                  week.unshift({"date" : previous.getDate(), "dayType" : "none"});
                }
              }
            }

            this.calander.push(week);
            week = [];
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        var numAssigned = 0;
        while (numAssigned < Math.ceil($scope.duration / 2)){
          var randomIndex = Math.floor($scope.duration * Math.random());
          var frontPaddingDays = $scope.date.getDate() - this.calander[0][0].date;
          var changingIndex = frontPaddingDays + randomIndex;
          var row = Math.floor(changingIndex / 7);
          var col = changingIndex % 7;

          if (this.calander[row][col].dayType == "nonTrigger"){
            this.calander[row][col].dayType = "trigger";
            numAssigned ++;
          }
        }

        this.paramsSet = true;
        this.timesPressed++;
      }
    };


    this.getExerciseMessage = function(){
      if (this.timesPressed == 0) {
        return "Get Your Experiment Schedule!";
      } else {
        return "Get a Different Schedule!"
      }
    }

    this.showDuration = function(){
      if ($scope.duration){
        return $scope.duration;
      } else {
        return 0;
      }
    }; 
})
