(angular.module('tummytrials.currentstudy',
                [ 'ionic', 'tummytrials.loggingctrl', 'tummytrials.logging2ctrl' ])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('calendar', {
      url: 'current/:dayId',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/calendar.html',
          resolve: {
            TextR:
                function(Text) { return Text.all_p(); },
            ExperimentsR:
                function(Experiments) { return Experiments.all(); }
          },
          controller: 'WidgetCtrl'
        }
      }
    })
	.state('no_study', {
      url: 'current/no_study',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/no_study.html',
          controller: 'setupcontroller'
        }
      }
    })    
  .state('during', {
      url: 'current/during',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/during.html',
          controller: 'LogDuringCtrl'
        }
      }
    })
  .state('sec_comp', {
      url: 'current/sec_comp',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/sec_comp.html',
          controller: 'LogDuring2Ctrl'
        }
      }
    })      
  .state('post', {
      url: 'current/post/:symptomIndex',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/post.html',
          controller: 'LogPostCtrl'
        }
      }
    }) 
  .state('notes', {
      url: 'current/notes',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/notes.html',
          controller: 'NotesCtrl'
        }
      }
    }) 
    .state('neg_compliance', {
      url: 'current/during/neg_compliance',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/neg_compliance.html',
          controller: 'setupcontroller'
        }
      }
    }) 
    .state('pos_compliance', {
      url: 'current/during/pos_compliance',
      views: {
        current : {
          templateUrl: 'templates/currenttrial/pos_compliance.html',
          controller: 'setupcontroller'
        }
      }
    }) 

  })
);
