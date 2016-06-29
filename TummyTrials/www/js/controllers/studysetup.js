(angular.module('tummytrials.studysetup', ['ionic', 'tummytrials.setupctrl'])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider

    .state('setup_1', {
      url: 'current/setup_1',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_1.html',
          controller: 'setupcontroller'
        }
      }
    })    
    .state('setup_2', {
      url: 'current/setup_2',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_2.html',
          controller: 'Setup2Ctrl'
        }
      }
    })
    .state('setup_3', {
      url: 'current/setup_3',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_3.html',
          controller: 'Setup3Ctrl'
        }
      }
    })    
    .state('setup_3_0', {
      url: 'current/setup_3/setup_3_0',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_3_0.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_3_1', {
      url: 'current/setup_3/setup_3_1',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_3_1.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_3_2', {
      url: 'current/setup_3/setup_3_2',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_3_2.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_3_3', {
      url: 'current/setup_3/setup_3_3',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_3_3.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_3_4', {
      url: 'current/setup_3/setup_3_4',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_3_4.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_4', {
      url: 'current/setup_4',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_4.html',
          controller: 'Setup4Ctrl'
        }
      }
    })
    .state('setup_4b', {
      url: 'current/setup_4b',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_4b.html',
          controller: 'Setup4bCtrl'
        }
      }
    })
    .state('setup_5', {
      url: 'current/setup_5',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_5.html',
          controller: 'Setup5Ctrl'
        }
      }
    }) 
    .state('setup_6', {
      url: 'current/setup_6',
      views: {
        current : {
          templateUrl: 'templates/study_setup/setup_6.html',
          controller: 'Setup6Ctrl'
        }
      }
    })  
  })

);
