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
            ['ionic', 'ngSanitize', 'ngCordova',
            'tractdb.tdate', 'tractdb.lifecycle',
            'tractdb.touchtrack', 
            'tummytrials.replicator', 'tummytrials.faqspagectrl',
            'tummytrials.login', 'tummytrials.currentstudy',
            'tummytrials.studysetup', 'tummytrials.faqcontroller',
            'tummytrials.morning', 'tummytrials.notesctrl',
            'tummytrials.activitylog', 'tummytrials.currentctrl',
            'tummytrials.mytrialsctrl', 'tummytrials.pasttrial1ctrl',
            'tummytrials.settingsctrl', 'd3', 'd3.directives',
            'tummytrials.ngcordovacontrollers', 'tummytrials.text',
            'tummytrials.experiments', 'tummytrials.exper-test',
            'tractdb.reminders', 'tummytrials.remind-test']);

//Ionic device ready check
app.run(function($cordovaFile, $ionicPlatform, $rootScope, $state, $q,
                    TDate, Login, Text, Experiments,
                    Reminders, ExperTest, RemindTest) {

  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      // org.apache.cordova.statusbar required
      // StatusBar.styleDefault();

      // making the system status bar font color white
      StatusBar.styleLightContent();
      // StatusBar.styleBlackTranslucent();
      // StatusBar.styleBlackOpaque();
    }

    function reminder_sync_p()
    {
        // Return a promise to sync reminders. If there's a current study,
        // reminders are set for it. Otherwise, any existing reminders need
        // to be canceled. The promise resolves to null.
        //
        return Experiments.getCurrent()
        .then(function(curex) {
            var rd, st, et, rt;

            // Establish time transform before tallying.
            //
            if (curex)
                Experiments.set_transform(curex);

            if (curex && curex.remdescrs &&
                curex.start_time && curex.end_time) {
                // Current experiment looks good.
                //
                rd = curex.remdescrs;
                st = curex.start_time;
                et = curex.end_time;
                rt = Experiments.report_tally(curex);
            } else {
                // No current experiment.
                //
                rd = [];
                st = 0;
                et = 0;
                rt = {};
            }
          
            return Reminders.sync(rd, st, et, rt)
            .then(function(_) {
                // Validate that proper reminders have been
                // scheduled (if desired).
                //
                var want_to_validate = true; // Maybe false in production?
                if (want_to_validate)
                    return RemindTest.validateSync(rd, st, et, rt)
                    .then(function() {}, function() {});
                else
                    return null;
            });
        });
    }

    // Sync reminders now (app startup), and then after every
    // replication.
    //
    reminder_sync_p()
    .then(function(_) {}, function(_) {}) // Ignore failure
    .then(function(_) {
        $rootScope.$on('couchdbAfterReplicate', function() {
            reminder_sync_p();
        });
    });

    // Whenever app restarts, reload currently displayed page.
    //
    $rootScope.$on('appResume', function() {
        // $state.go('current');     (Back to Current tab.)
        $state.go($state.current, {}, { reload: true });
    });

    // Some tests of Experiments. Move these into some kind of framework
    // later on, probably. (Note: right now some of the tests fail if
    // there is a current study.)
    //
    var want_to_run_exper_tests = false;
    if (want_to_run_exper_tests) {
        ExperTest.testAll()
        .then(ExperTest.testGet)
        .then(ExperTest.testGetCurrent)
        .then(ExperTest.testAdd)
        .then(ExperTest.testSetStatus)
        .then(ExperTest.testGetReports)
        .then(ExperTest.testGetReport)
        .then(ExperTest.testPutReport)
        .then(ExperTest.testDelete)
        .then(
            function good() {},
            function bad(err) {
                console.log('ExperTest error ' + err.message);
            }
        );
    }

    // Some tests of Reminders. Right now these require human
    // intervention and observation. (Need to disable calls to
    // reminder_sync_p() above for these tests to work.)
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
app.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
  
  // updating back to have no text
  $ionicConfigProvider.backButton.previousTitleText(false).text('');

  //enter login for landing tab here
  $urlRouterProvider.otherwise('/')

  $stateProvider
    .state('current', {
      url: '/current',
      views: {
        current : {
          templateUrl: 'templates/current.html',
          resolve: {
            TextR:
                function(Text) { return Text.all_p(); },
            ExperimentsR:
                function(Experiments) { return Experiments.all(); }
          },
          controller: 'CurrentCtrl'
        }
      }
    })
    .state('mytrials', {
      url: '/mytrials',
      views: {
        mytrials : {
          templateUrl: 'templates/mytrials.html',
          resolve: {
            TextR:
                function(Text) { return Text.all_p(); },
            ExperimentsR:
                function(Experiments) { return Experiments.all(); }
          },
          controller: 'MyTrialsCtrl'
        }
      }
    })
    .state('past_trial_1', {
      url: '/past_trial_1/:studyIndex',
      views: {
        mytrials : {
          templateUrl: 'templates/mytrials/past_trial_1.html',
          controller: 'PastTrial1Ctrl'
        }
      }
    })
    .state('pvalue', {
      url: 'mytrials/pvalue',
      views: {
        mytrials : {
          templateUrl: 'templates/mytrials/pvalue.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('neg_comp', {
      url: 'mytrials/neg_comp',
      views: {
        mytrials : {
          templateUrl: 'templates/mytrials/neg_comp.html',
          controller: 'Neg_CompCtrl'
        }
      }
    })
    .state('settings', {
      url: '/settings',
      views: {
        settings : {
          templateUrl: 'templates/settings.html',
          resolve: {
            TextR:
                function(Text) { return Text.all_p(); },
            ExperimentsR:
                function(Experiments) { return Experiments.all(); }
          },
          controller: 'SettingsCtrl'
        }
      }
    })
    .state('trial_summary', {
      url: '/trial_summary',
      views: {
        settings : {
          templateUrl: 'templates/settings/trial_summary.html',
          resolve: {
            TextR:
                function(Text) { return Text.all_p(); },
            ExperimentsR:
                function(Experiments) { return Experiments.all(); }
          },
          controller: 'SettingsCtrl'
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
    .state('faqs_page', {
      url: '/faqs/:faqsection/:faqitem',
      views: {
        faqs : {
          templateUrl: 'templates/faqs/faqs_page.html',
          resolve: {
            TextR:
                function(Text) { return Text.all_p(); }
          },
          controller: 'FaqsPageCtrl'
        }
      }
    })
})

app.controller("setupcontroller", function($scope, $http, $sce, Text, Experiments, Calander) {
    Text.all_p()
    .then(function(text){
        $scope.text = text;
        return Experiments.publish_p($scope);
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
        var currentDate = new TDate();
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
                var previous = new TDate();
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
