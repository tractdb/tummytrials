(angular.module('tummytrials.studysetup', ['ionic', 'tummytrials.setupctrl'])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('setup_1', {
      url: '/setup_1',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_1.html',
          controller: 'setupcontroller'
        }
      }
    })    
    .state('setup_2', {
      url: '/setup_2',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_2.html',
          controller: 'Setup2Ctrl'
        }
      }
    })
    .state('setup_3', {
      url: '/setup_3',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_3.html',
          controller: 'Setup3Ctrl'
        }
      }
    })    
    .state('setup_3_1', {
      url: '/setup_3_1',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_3_1.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_3_2', {
      url: '/setup_3_2',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_3_2.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_3_3', {
      url: '/setup_3_3',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_3_3.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_3_4', {
      url: '/setup_3_4',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_3_4.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('setup_4', {
      url: '/setup_4',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_4.html',
          controller: 'Setup4Ctrl'
        }
      }
    })
    .state('setup_5', {
      url: '/setup_5',
      views: {
        settings : {
          templateUrl: 'templates/study_setup/setup_5.html',
          controller: 'Setup5Ctrl'
        }
      }
    })  
  })

);
