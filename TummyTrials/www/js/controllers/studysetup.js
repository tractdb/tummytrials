(angular.module('tummytrials.studysetup', ['ionic', 'tummytrials.setupctrl'])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider

    .state('setup_1', {
      url: 'mytrials/setup_1',
      views: {
        mytrials : {
          templateUrl: 'templates/study_setup/setup_1.html',
          controller: 'setupcontroller'
        }
      }
    })    
    .state('setup_2', {
      url: 'mytrials/setup_2',
      views: {
        mytrials : {
          templateUrl: 'templates/study_setup/setup_2.html',
          controller: 'Setup2Ctrl'
        }
      }
    })
    .state('setup_3', {
      url: 'mytrials/setup_3',
      views: {
        mytrials : {
          templateUrl: 'templates/study_setup/setup_3.html',
          controller: 'Setup3Ctrl'
        }
      }
    })    
    .state('setup_3_1', {
      url: 'mytrials/setup_3/setup_3_1',
      views: {
        mytrials : {
          templateUrl: 'templates/study_setup/setup_3_1.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_3_2', {
      url: 'mytrials/setup_3/setup_3_2',
      views: {
        mytrials : {
          templateUrl: 'templates/study_setup/setup_3_2.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_3_3', {
      url: 'mytrials/setup_3/setup_3_3',
      views: {
        mytrials : {
          templateUrl: 'templates/study_setup/setup_3_3.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_3_4', {
      url: 'mytrials/setup_3/setup_3_4',
      views: {
        mytrials : {
          templateUrl: 'templates/study_setup/setup_3_4.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_4', {
      url: 'mytrials/setup_4',
      views: {
        mytrials : {
          templateUrl: 'templates/study_setup/setup_4.html',
          controller: 'Setup4Ctrl'
        }
      }
    })
    .state('setup_5', {
      url: 'mytrials/setup_5',
      views: {
        mytrials : {
          templateUrl: 'templates/study_setup/setup_5.html',
          controller: 'Setup5Ctrl'
        }
      }
    })  
  })

);
