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
            ['ionic','ngSanitize','tractdb.lifecycle', 'tummytrials.replicator', 'tummytrials.login','tummytrials.currentstudy','tummytrials.studysetup','tummytrials.faqcontroller', 'ngCordova','tummytrials.mytrialsctrl', 'tummytrials.ngcordovacontrollers', 'tummytrials.text', 'tummytrials.experiments', 'tummytrials.exper-test', 'tractdb.reminders', 'tummytrials.remind-test']);

//Ionic device ready check
app.run(function($ionicPlatform, $rootScope, $q, Login, Text, Experiments,
                    Reminders, ExperTest, RemindTest) {

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

// Ask for username/password at startup. Note: this is no longer
// necessary because we attempt to do replication at startup.
//
//  Text.all_p()
//  .then(function(text) {
//      return Login.loginfo_p('couchuser', $rootScope, text.loginfo,
//                              Experiments.valid_p);
//  });

    // Some tests of Experiments. Move these into some kind of framework
    // later on, probably.
    //
    var want_to_run_exper_tests = false;
    if (want_to_run_exper_tests) {
        ExperTest.testAll()
        .then(ExperTest.testGet)
        .then(ExperTest.testGetCurrent)
        .then(ExperTest.testAdd)
        .then(ExperTest.testSetStatus)
        .then(ExperTest.testAddReport)
        .then(ExperTest.testDelete)
        .then(
            function good() {},
            function bad(err) {
                console.log('ExperTest error ' + err.message);
            }
        );
    }

    // Some tests of Reminders. Right now these require human
    // intervention and observation.
    //
    var want_to_run_remind_tests = false;
    if (want_to_run_remind_tests) {
        RemindTest.testSync()
        .then(
            function good() {},
            function bad(err) {
                console.log('RemindTest error ' + err.message);
            }
        );
    }

  });
});


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
          controller: 'MyTrialsCtrl'
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

app.controller( "setupcontroller", function(Calander, $scope, $http, $sce) {
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

    this.calander = [];
    this.timesPressed = 0;
    this.parametersSet = function(){
      return Calander.parametersSet($scope.date, $scope.duration);
    };   

    this.getDates = function(){
      this.paramsSet = true;
      this.timesPressed ++;
      this.calander = Calander.getDates($scope.date, $scope.duration);
    };

    this.getExerciseMessage = function(){
      return Calander.getExerciseMessage(this.timesPressed);
    };
})

app.factory('Calander', function () {
    var parametersSet = function(date, duration){
      if (date && duration){
        return true;
      }
      return false;
    };   

    var getExerciseMessage = function(timesPressed){
      if (timesPressed == 0) {
        return "Get Your Experiment Schedule!";
      } else {
        return "Get a Different Schedule!"
      }
    }

    var getDates = function(date, duration){
      var calander = [];
      if (date && duration){
        var week = [];
        var currentDate = new Date();
        currentDate.setTime(date.getTime());
        for (var count = 0; count < duration; count++){
          var experimentDate = {"day_num" : count, "date" : currentDate.getDate(), "dayType" : "nonTrigger"}
          week.push(experimentDate);

          if (currentDate.getDay() == 6 || count == duration - 1){
            if(week.length < 7){
              if (count == duration - 1) {
                while (week.length < 7){
                  currentDate.setDate(currentDate.getDate() + 1);
                  week.push({"date" : currentDate.getDate(), "dayType" : "none"});
                }
              } else {
                var previous = new Date();
                previous.setTime(date.getTime());
                while (week.length < 7){
                  previous.setDate(previous.getDate() - 1);
                  week.unshift({"date" : previous.getDate(), "dayType" : "none"});
                }
              }
            }

            calander.push(week);
            week = [];
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        var numAssigned = 0;
        while (numAssigned < Math.ceil(duration / 2)){
          var randomIndex = Math.floor(duration * Math.random());
          var frontPaddingDays = date.getDate() - calander[0][0].date;
          var changingIndex = frontPaddingDays + randomIndex;
          var row = Math.floor(changingIndex / 7);
          var col = changingIndex % 7;

          if (calander[row][col].dayType == "nonTrigger"){
            calander[row][col].dayType = "trigger";
            numAssigned ++;
          }
        }
      }
      return calander;
    };

    return {
      parametersSet: parametersSet,
      getExerciseMessage: getExerciseMessage,
      getDates: getDates
    };

})
